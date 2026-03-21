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
| Supabase browser client          | DONE    | src/lib/supabase/client.ts                  |
| Supabase server client           | DONE    | src/lib/supabase/server.ts                  |
| formatPrice() helper             | DONE    | paise → ₹ display                          |
| slugify() helper                 | DONE    |                                             |
| cn() utility                     | DONE    | clsx + tailwind-merge                       |
| generateOrderNumber()            | DONE    | VP-ORD-YYYYMMDD-NNN                         |
| generateInternalTrackingCode()   | DONE    | VP-XXXXXX                                   |

### Admin Panel — Layout

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Admin layout (sidebar + header)  | DONE    | Shared across all admin pages               |
| Admin dashboard page             | DONE    | Stats: orders today, revenue, low stock     |
| Admin analytics page             | DONE    | Revenue charts, orders by status, top products, inventory, coupons |
| Admin sidebar navigation         | DONE    | Links to all admin sections                 |

### Admin Panel — Products

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Product list page                | DONE    | Table with search, filter, pagination       |
| Add product page                 | DONE    | Form with variants, specs, images           |
| Edit product page                | DONE    | Pre-filled form, delete support             |
| Product image upload             | DONE    | Supabase Storage upload + URL input         |
| Product variants management      | DONE    | Variants stored as jsonb on product         |
| Product specs management         | DONE    | Key-value pairs with quick-add chips        |
| Product API (admin CRUD)         | DONE    | POST/GET/PUT/DELETE /api/admin/products     |

### Admin Panel — Categories

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Category list page               | DONE    | Table view with image, parent, status       |
| Add/edit category                | DONE    | Dialog with image upload, parent select     |
| Category API                     | DONE    | CRUD via /api/admin/categories              |

### Admin Panel — Inventory

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Inventory management             | DONE    | Stock tracked on products.stock directly    |
| Update stock form                | DONE    | Add/remove stock with reason                |
| Inventory history view           | DONE    | Audit trail of all stock changes            |
| Inventory API                    | DONE    |                                             |

### Admin Panel — Orders

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Orders list page                 | DONE    | Table with status filter, search            |
| Order detail page                | DONE    | Full order info + tracking timeline         |
| Update order status              | DONE    | Creates tracking_event row                  |
| Payment management               | DONE    | Mark paid, payment method, reference        |
| Add tracking note                | DONE    |                                             |
| Create external shipment         | DONE    | Enter courier + AWB + tracking URL          |
| Orders API (admin)               | DONE    |                                             |

### Admin Panel — Coupons

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Coupon list page                 | DONE    | Table with search, status filter            |
| Add/edit coupon                  | DONE    | Percentage/fixed, min order, usage limits   |
| Coupon API                       | DONE    | CRUD + validation at checkout               |

### Customer Auth

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Customer registration            | DONE    | POST /api/auth/customer/register            |
| Customer login                   | DONE    | POST /api/auth/customer/login               |
| Customer JWT + cookie            | DONE    | vp_customer_token, httpOnly, 30 days        |
| Customer auth helpers            | DONE    | src/lib/auth/customer.ts                    |

### Customer Storefront (WIP)

| Feature                          | Status  | Notes                                       |
|----------------------------------|---------|---------------------------------------------|
| Homepage                         | DONE    | White theme, mdcomputers.in style           |
| Product listing page             | DONE    | Variants listed as separate products, filters, sort, pagination |
| Product detail page              | DONE    | Variant selector, image gallery, specs, cart |
| Shopping cart                    | DONE    | localStorage-based cart                     |
| Checkout flow                    | DONE    | COD payment, coupon support                 |
| Order placement API              | DONE    | POST /api/orders                            |
| Order tracking page              | DONE    | Enter VP-XXXXXX to see order status         |
| Customer dashboard               | DONE    | Order history, account details              |

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

Most core features are complete. Remaining work:

```
Step 1 — Online payments
  Razorpay integration
  Payment webhook handler
  Refund handling

Step 2 — Notifications
  Order confirmation email
  Shipping update email
  Low stock alert email

Step 3 — Polish & optimization
  SEO meta tags
  Performance optimization
  Mobile responsiveness audit
```

---

Last updated: 2026-03-22 — All admin features, customer auth, storefront, cart, checkout, and order tracking marked DONE.
