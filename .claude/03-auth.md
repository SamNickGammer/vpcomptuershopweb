# 03 — Auth System

---

## Overview

There are two types of users in this system:
1. **Admin** — shop owner / staff. Custom JWT auth. DONE.
2. **Customer** — buyers. Custom JWT auth (not Supabase Auth). DONE.

---

## Admin Auth (DONE)

### How It Works

1. Admin visits `/admin/login`
2. Submits email + password
3. `POST /api/auth/admin/login` validates credentials against `admins` table
4. If valid → signs a JWT → sets it as an httpOnly cookie
5. All `/admin/*` routes (except `/admin/login`) are protected by `src/middleware.ts`
6. Middleware reads the cookie on every request → verifies JWT → allows or redirects

### Files

| File                                      | What It Does                                  |
|-------------------------------------------|-----------------------------------------------|
| `src/lib/auth/admin.ts`                   | JWT sign/verify, cookie helpers, bcrypt       |
| `src/middleware.ts`                       | Route protection middleware                   |
| `src/app/api/auth/admin/login/route.ts`   | Login API route                               |
| `src/app/api/auth/admin/logout/route.ts`  | Logout API route                              |
| `src/app/(admin)/admin/login/page.tsx`    | Login page UI                                 |
| `src/lib/db/seed.ts`                      | Creates first admin user                      |

### Cookie

```
Name:     vp_admin_token
httpOnly: true  (JS cannot read it — XSS safe)
secure:   true in production, false in dev
sameSite: lax
maxAge:   7 days
path:     /
```

### JWT Payload

```typescript
type AdminJWTPayload = {
  adminId: string   // admin UUID from DB
  email:   string
  role:    string   // "admin" | future: "super_admin" | "staff"
}
```

### JWT Secret

Stored in env var: `ADMIN_JWT_SECRET`
Must be a long random string (32+ characters).
Algorithm: HS256

### Functions in `src/lib/auth/admin.ts`

```typescript
signAdminJWT(payload)         // signs JWT, returns token string
verifyAdminJWT(token)         // verifies + returns payload or null
setAdminCookie(token)         // sets httpOnly cookie
clearAdminCookie()            // deletes cookie (logout)
getAdminFromCookie()          // reads cookie + verifies JWT, returns payload or null
hashPassword(password)        // bcrypt hash (12 rounds)
comparePassword(plain, hash)  // bcrypt compare, returns boolean
```

### Middleware Logic (`src/middleware.ts`)

- Runs on every request matching `/admin/:path*`
- If path is `/admin/login` → always allow through (public)
- Otherwise → read `vp_admin_token` cookie
  - No cookie → redirect to `/admin/login`
  - Invalid/expired JWT → redirect to `/admin/login`
  - Valid JWT → allow request through

### Login API (`POST /api/auth/admin/login`)

Request body:
```json
{ "email": "admin@vpcomputer.in", "password": "Admin@1234" }
```

Success response:
```json
{ "success": true, "data": { "name": "...", "email": "...", "role": "admin" } }
```

Error response:
```json
{ "success": false, "error": "Invalid email or password" }
```

Also updates `last_login_at` in `admins` table on successful login.

### First Admin User

Created via seed script:
```bash
npm run db:seed:local
```

Default credentials (change after first login!):
```
Email:    admin@vpcomputer.in
Password: Admin@1234
```

Seed script checks if any admin exists first — safe to run multiple times.

---

## Customer Auth (DONE)

### How It Works

1. Customer visits `/login` or `/register`
2. Register: submits name, email, password → `POST /api/auth/customer/register`
3. Login: submits email + password → `POST /api/auth/customer/login`
4. If valid → signs a JWT → sets it as an httpOnly cookie (`vp_customer_token`)
5. Protected customer pages (account, checkout) check cookie for auth

### Files

| File                                              | What It Does                              |
|---------------------------------------------------|-------------------------------------------|
| `src/lib/auth/customer.ts`                        | JWT sign/verify, cookie helpers, bcrypt   |
| `src/app/api/auth/customer/login/route.ts`        | Login API route                           |
| `src/app/api/auth/customer/register/route.ts`     | Register API route                        |

### Cookie

```
Name:     vp_customer_token
httpOnly: true  (JS cannot read it — XSS safe)
secure:   true in production, false in dev
sameSite: lax
maxAge:   30 days
path:     /
```

### JWT Payload

```typescript
type CustomerJWTPayload = {
  customerId: string   // customer UUID from DB
  email:      string
  name:       string
}
```

### JWT Secret

Uses env var: `CUSTOMER_JWT_SECRET` (or shared with admin secret — check implementation).
Algorithm: HS256

### Notes

- Customer auth is completely separate from admin auth
- Different cookie names (`vp_customer_token` vs `vp_admin_token`)
- Different JWT payloads and verification functions
- Customer passwords are bcrypt hashed (same as admin)

---

## Security Notes

- Admin passwords are NEVER stored in plain text — always bcrypt hashed
- JWT cookie is httpOnly — cannot be accessed by JavaScript (XSS protection)
- Never expose `ADMIN_JWT_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Never return `passwordHash` from any API response
- Admin check in API routes: use `getAdminFromCookie()` and verify the result before proceeding

---

Last updated: 2026-03-22 — Customer auth added (register, login, JWT cookie). Both admin and customer auth fully implemented.
