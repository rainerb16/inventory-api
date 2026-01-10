import express from "express";
import { pool } from "./db.js";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---- middleware ----
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const PgSession = pgSession(session);

app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true only in production on HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// ---- helpers ----
function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ---- routes ----
app.get("/health", async (req, res) => {
  const result = await pool.query("SELECT now() as time");
  res.json({ ok: true, time: result.rows[0].time });
});

// SIGN UP
app.post("/auth/signup", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const hash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, hash]
    );

    req.session.userId = result.rows[0].id;

    res.status(201).json({ user: { id: result.rows[0].id, email: result.rows[0].email } });
  } catch (err) {
    if (String(err.message).includes("duplicate key")) {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const result = await pool.query(
    `SELECT id, email, password_hash FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  req.session.userId = user.id;
  res.json({ user: { id: user.id, email: user.email } });
});

// ME
app.get("/me", async (req, res) => {
  if (!req.session?.userId) return res.json({ user: null });

  const result = await pool.query(
    `SELECT id, email, created_at FROM users WHERE id = $1`,
    [req.session.userId]
  );

  const user = result.rows[0];
  if (!user) return res.json({ user: null });

  res.json({ user: { id: user.id, email: user.email } });
});

// LOGOUT
app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

// ITEMS (protected)
app.get("/items", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, user_id, name, category, status, quantity, notes, created_at, updated_at
     FROM items
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.session.userId]
  );
  res.json({ items: result.rows });
});

app.post("/items", requireAuth, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const quantity = Number(req.body.quantity ?? 0);

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: "Quantity must be a non-negative integer" });
  }

  const result = await pool.query(
    `INSERT INTO items (user_id, name, quantity)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, name, category, status, quantity, notes, created_at, updated_at`,
    [req.session.userId, name, quantity]
  );

  res.status(201).json({ item: result.rows[0] });
});

app.patch("/items/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const name = req.body.name !== undefined ? String(req.body.name).trim() : undefined;
  const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : undefined;

  if (name !== undefined && !name) return res.status(400).json({ error: "Name cannot be empty" });
  if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
    return res.status(400).json({ error: "Quantity must be a non-negative integer" });
  }

  // Only update fields that were provided
  const result = await pool.query(
    `
    UPDATE items
    SET
      name = COALESCE($1, name),
      quantity = COALESCE($2, quantity),
      updated_at = NOW()
    WHERE id = $3 AND user_id = $4
    RETURNING id, user_id, name, category, status, quantity, notes, created_at, updated_at`,
    [
      name === undefined ? null : name,
      quantity === undefined ? null : quantity,
      id,
      req.session.userId,
    ]
  );

  const updated = result.rows[0];
  if (!updated) return res.status(404).json({ error: "Item not found" });

  res.json({ item: updated });
});

app.delete("/items/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

  const result = await pool.query(
    `DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, req.session.userId]
  );

  const deleted = result.rows[0];
  if (!deleted) return res.status(404).json({ error: "Item not found" });

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
