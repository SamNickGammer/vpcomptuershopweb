# 06 — Feature Status & What To Build Next

---

## Status Legend

```
DONE      — fully implemented and working
WIP       — currently being built
PENDING   — not started yet
FUTURE    — planned but not in current scope
```

---

## Feature Status

### Foundation

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Next.js 15 project setup         | DONE    | App router, TypeScript, Tailwind            |
| Folder structure                 | DONE    | See 01-stack.md                             |
| Drizzle ORM setup                | DONE    | drizzle.config.ts, db client singleton      |
| All DB tables defined            | DONE    | 10 tables across 6 schema files             |
| Tables pushed to Supabase        | DONE    | All tables live and verified                |
| dotenv-cli for local db commands | DONE    | :local suffix scripts in package.json       |
| .claude instruction files        | DONE    | Split into 7 focused files                  |

### Admin Auth

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Admin JWT helpers                | DONE    | sign, verify, cookie set/clear/get          |
| bcrypt password helpers          | DONE    | hash + compare                              |
| Admin login API                  | DONE    | POST /api/auth/admin/login                  |
| Admin logout API                 | DONE    | POST /api/auth/admin/logout                 |
| Admin login page UI              | DONE    | /admin/login                                |
| Middleware route protection      | DONE    | Protects all /admin/* except /admin/login   |
| Seed script                      | DONE    | Creates first admin user                    |

### Supabase & Utilities

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Supabase browser client          | PENDING | src/lib/supabase/client.ts                  |
| Supabase server client           | PENDING | src/lib/supabase/server.ts                  |
| formatPrice() helper             | PENDING | paise → ₹ display                          |
| slugify() helper                 | PENDING |                                             |
| cn() utility                     | PENDING | clsx + tailwind-merge                       |
| generateOrderNumber()            | PENDING | VP-ORD-YYYYMMDD-NNN                         |
| generateInternalTrackingCode()   | PENDING | VP-XXXXXX                                   |

### Admin Panel — Layout

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Admin layout (sidebar + header)  | PENDING | Shared across all admin pages               |
| Admin dashboard page             | PENDING | Stats: orders today, revenue, low stock     |
| Admin sidebar navigation         | PENDING | Links to all admin sections                 |

### Admin Panel — Products

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Product list page                | PENDING | Table with search, filter, pagination       |
| Add product page                 | PENDING | Form with variants, specs, images           |
| Edit product page                | PENDING |                                             |
| Product image upload             | PENDING | Supabase Storage, drag-and-drop             |
| Product variants management      | PENDING | Add/edit/delete variants per product        |
| Product specs management         | PENDING | Key-value pairs                             |
| Product API (admin CRUD)         | PENDING | POST/GET/PUT/DELETE /api/admin/products     |

### Admin Panel — Categories

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Category list page               | PENDING | Tree view for hierarchy                     |
| Add/edit category                | PENDING |                                             |
| Category API                     | PENDING |                                             |

### Admin Panel — Inventory

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Inventory list page              | PENDING | Stock levels per variant, low stock alerts  |
| Update stock form                | PENDING | Add/remove stock with reason                |
| Inventory history view           | PENDING | Audit trail of all stock changes            |
| Inventory API                    | PENDING |                                             |

### Admin Panel — Orders

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Orders list page                 | PENDING | Table with status filter, search            |
| Order detail page                | PENDING | Full order info + tracking timeline         |
| Update order status              | PENDING | Creates tracking_event row                  |
| Add tracking note                | PENDING |                                             |
| Create external shipment         | PENDING | Enter courier + AWB + tracking URL          |
| Orders API (admin)               | PENDING |                                             |

### Customer Storefront (Future Sprint)

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Homepage                         | FUTURE  |                                             |
| Product listing page             | FUTURE  | With filters (category, condition, price)   |
| Product detail page              | FUTURE  |                                             |
| Shopping cart                    | FUTURE  |                                             |
| Checkout flow                    | FUTURE  |                                             |
| Order placement API              | FUTURE  |                                             |
| Order confirmation page          | FUTURE  |                                             |
| Customer tracking page           | FUTURE  | Enter VP-XXXXXX to see order status         |
| Customer auth (Supabase Auth)    | FUTURE  |                                             |
| Customer order history           | FUTURE  |                                             |

### Payments (Future)

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Razorpay integration             | FUTURE  | UPI, cards, netbanking                      |
| Payment webhook handler          | FUTURE  |                                             |
| Refund handling                  | FUTURE  |                                             |

### Notifications (Future)

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Order confirmation email         | FUTURE  |                                             |
| Shipping update email            | FUTURE  |                                             |
| Low stock alert email            | FUTURE  |                                             |

---

## What To Build Next (ordered)

Build in this exact order — each step depends on the previous:

```
Step 1 — Supabase clients
  src/lib/supabase/client.ts
  src/lib/supabase/server.ts

Step 2 — Utility helpers
  src/lib/utils/helpers.ts     (formatPrice, slugify, cn, generateOrderNumber)
  src/lib/utils/tracking.ts    (generateInternalTrackingCode)
  src/types/index.ts           (ApiResponse<T> and other shared types)

Step 3 — Admin layout
  src/components/admin/layout/Sidebar.tsx
  src/components/admin/layout/Header.tsx
  src/app/(admin)/admin/layout.tsx

Step 4 — Admin dashboard
  src/app/(admin)/admin/dashboard/page.tsx
  (stats: total orders, revenue today, low stock items, recent orders)

Step 5 — Categories
  Category CRUD API
  Category list + add/edit UI

Step 6 — Products
  Product CRUD API
  Product list page
  Add/edit product form (with variants, specs, image upload)

Step 7 — Inventory
  Inventory API
  Inventory list + stock update UI

Step 8 — Orders + Tracking
  Orders list page
  Order detail page
  Status update + tracking event creation
  External shipment creation
```

---

Last updated: Admin auth complete. All schema tables live. Starting utilities + admin layout next.
