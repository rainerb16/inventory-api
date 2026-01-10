# Inventory Dashboard API

A Node/Express REST API backed by PostgreSQL, using session-based authentication (HttpOnly cookies).  
Built as the backend for an admin-style inventory dashboard. Also set up GitHub Actions CI to automatically install dependencies and run frontend build + backend checks on every push/ PR.

## Tech Stack
- Node.js + Express
- PostgreSQL
- pg (connection pool + parameterized queries)
- express-session + connect-pg-simple (sessions stored in Postgres)
- bcrypt (password hashing)
- CORS configured for a Vite dev client

## Features
- Auth
  - Sign up: `POST /auth/signup`
  - Login: `POST /auth/login`
  - Current user: `GET /me`
  - Logout: `POST /auth/logout`
- Items (protected)
  - List items for the logged-in user: `GET /items`
  - Create an item for the logged-in user: `POST /items`
- User-owned data model
  - `items.user_id` references `users.id` (foreign key)
  - Prevents orphan records and enforces ownership

## How Auth Works (Sessions)
- On signup/login, the server creates a session and stores `userId` server-side.
- The client receives an HttpOnly cookie (session id).
- The browser includes the cookie automatically on future requests.
- Protected routes use middleware to check `req.session.userId`.

## Environment Variables
Create a `.env` file:

```bash
PORT=3000
DATABASE_URL=postgres://<your-mac-username>@localhost:5432/inventory_app
SESSION_SECRET=your-long-random-secret
```
## Local Setup
1. Install dependencies:
`npm install`

2. Start the server:
`npm run dev`

## Quick Test
Signup (saves cookie):
```bash
curl -i -c cookies.txt -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@test.com","password":"password123"}'
```

Check session:
`curl -b cookies.txt http://localhost:3000/me`

Create item:
```bash
curl -b cookies.txt -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name":"My first item","quantity":1}'
```

List items:
`curl -b cookies.txt http://localhost:3000/items`

## Database Setup
This API uses PostgreSQL for data storage and session-based authentication.

### Prerequisites
- PostgreSQL installed and running (Postgres.app or Homebrew)
- Node.js

1. Create the database
`createdb inventory_app`

2. Apply the schema
From the `inventory-api` directory:
`psql -d inventory_app < db/schema.sql`

This will create:
- `users` table
- `items` table
- `session` table (used by `connect-pg-simple`)
- indexes and constraints

3. Environment variables
Copy the example file `.env.example` and update values as needed:


4. Start the API
```bash
npm install
npm run dev
```

Verify it's running:
`curl http://localhost:3000/health`

Expected response:
`{ "ok": true }`

## Notes
- The database schema is versioned in `db/schema.sql`
- The API uses server-side sessions stored in PostgreSQL
- Item records are scoped per user via a foreign key (`items.user_id → users.id`)