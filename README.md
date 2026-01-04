# Inventory Dashboard API

A Node/Express REST API backed by PostgreSQL, using session-based authentication (HttpOnly cookies).  
Built as the backend for an admin-style inventory dashboard (React frontend coming next).

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
