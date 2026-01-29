# Inventory Management API

A robust **Node/Express** REST API designed for admin-style inventory dashboards. This backend handles secure data persistence via **PostgreSQL** and provides a "merchant-first" architecture where all data is scoped to an authenticated user.

## Technical Highlights
- **Engine:** Node.js + Express
- **Persistence:** PostgreSQL with `pg` connection pooling and parameterized queries.
- **Security:** Session-based auth via `HttpOnly` cookies, stored server-side in Postgres (`connect-pg-simple`).
- **DevOps:** GitHub Actions CI pipeline for automated dependency installation and build verification.

---

## API Documentation
All protected routes require a valid session cookie established via the Auth endpoints.

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register a new account (hashes password via `bcrypt`). |
| `POST` | `/auth/login` | Authenticate user and initiate session. |
| `GET` | `/me` | Returns details for the currently logged-in user. |
| `POST` | `/auth/logout` | Destroys session and clears client cookie. |

### Items (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/items` | List all inventory items owned by the current user. |
| `POST` | `/items` | Create a new item record. |

---

## Manual Testing (CLI)
You can verify the authentication flow and data scoping using `curl`:

**1. Signup:**
```bash
curl -i -c cookies.txt -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'
```

**2. Create an item:**
```bash
curl -b cookies.txt -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Inventory Item A","quantity":10}'
```

## Localizatoin Setup

**1. Database Configuration**
Ensure PostgreSQL is running, then create the database and apply the schema:
```bash
createdb inventory_app
psql -d inventory_app < db/schema.sql
```

**2. Environment Variables**
Create a `.env` file in the root directory:
```bash
PORT=3000
DATABASE_URL=postgres://localhost:5432/inventory_app
SESSION_SECRET=your_secret_string
```

**3. Start Development Server**
```bash
npm install
npm run dev
```

## Security and Design Implementation
- Data Isolation: Enforced via a `user_id` foreign key on the `items` table.
- SQL Injection Protection: All database interactions utilize parameterized queries.
- Stateful Security: Server-side sessions prevent unauthorized data access even if client-side state is compromised.

