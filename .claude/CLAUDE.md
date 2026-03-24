# V&P Computer Shop — Claude Code Entry Point

> READ ALL FILES LISTED BELOW before starting any task.
> This file is the index. The real content is in the files below.

---

## Files To Read (in order)

- `.claude/01-stack.md` — tech stack, env vars, key commands, folder structure
- `.claude/02-schema.md` — all database tables, columns, relations
- `.claude/03-auth.md` — admin auth system, JWT, cookies, middleware
- `.claude/04-tracking.md` — internal + external tracking system logic
- `.claude/05-conventions.md` — coding rules, API format, naming conventions
- `.claude/06-features.md` — feature status (done/pending) + what to build next
- `.claude/07-deployment.md` — vercel deployment, build commands, env setup
- `.claude/08-shipment.md` — shipment tracking system logic

---

## Update Rule

When any feature is added, changed, or decided:

1. Update the relevant file above with the new information
2. Always update 06-features.md status table
3. Never delete old files — create a new numbered file if a new area
   is needed and link it here
4. Add a "Last updated" note at the bottom of any file you change

---

## Project In One Line

E-commerce admin panel + storefront for V&P Computer Shop, Patna, Bihar.
Sells refurbished laptops, new laptops, motherboards, ICs, and hardware components.

Last updated: Project initialization

---

## What This Project Is

E-commerce site for V&P Computer Shop — sells refurbished laptops, new laptops,
motherboards, ICs, chips, and hardware components.

Owner manages everything through an **Admin Panel** (Shopify-style).

---

## Tech Stack

| Layer      | Tech                    | Notes                                     |
| ---------- | ----------------------- | ----------------------------------------- |
| Framework  | Next.js 15 (App Router) | Frontend + API routes                     |
| Language   | TypeScript strict       |                                           |
| ORM        | Drizzle ORM             | Schema in `/src/lib/db/schema/`           |
| Database   | Supabase PostgreSQL     | Swap = change `drizzle.config.ts` dialect |
| Storage    | Supabase Storage        | Bucket: `product-images`                  |
| Auth       | Custom JWT via `jose`   | httpOnly cookie, admin only for now       |
| Password   | bcryptjs                |                                           |
| Validation | Zod                     | All API inputs validated                  |
| Forms      | React Hook Form + Zod   |                                           |
| Styling    | Tailwind CSS v4         |                                           |

---

## Folder Structure

```
src/
├── app/
│   ├── (admin)/admin/         ← Admin panel (JWT protected)
│   │   ├── dashboard/
│   │   ├── products/          ← List / add / edit products
│   │   ├── orders/            ← View orders, update tracking
│   │   ├── inventory/         ← Stock management
│   │   └── settings/
│   ├── (store)/               ← Customer storefront (future)
│   ├── api/
│   │   ├── auth/admin/        ← POST login, POST logout
│   │   ├── products/          ← Public product API
│   │   ├── orders/            ← Public order placement (future)
│   │   ├── tracking/          ← Public tracking lookup
│   │   └── admin/             ← Protected admin APIs
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── admin/                 ← Admin UI components
│   ├── store/                 ← Storefront components (future)
│   └── ui/                   ← Shared shadcn-style components
├── lib/
│   ├── db/
│   │   ├── index.ts           ← Drizzle client (postgres + drizzle())
│   │   ├── seed.ts            ← Creates first admin user
│   │   └── schema/
│   │       ├── index.ts       ← Re-exports ALL schemas (used by drizzle.config)
│   │       ├── admin.ts       ← admins table
│   │       ├── categories.ts  ← categories table (hierarchical)
│   │       ├── products.ts    ← products, product_variants, product_images, product_specs
│   │       ├── inventory.ts   ← inventory, inventory_history
│   │       ├── orders.ts      ← orders, order_items
│   │       └── tracking.ts    ← tracking_events, shipments
│   ├── supabase/
│   │   ├── client.ts          ← createBrowserClient (for file uploads from browser)
│   │   └── server.ts          ← createServerClient (for server-side storage ops)
│   ├── auth/
│   │   ├── admin.ts           ← signAdminJWT(), verifyAdminJWT(), hashPassword(), comparePassword()
│   │   └── middleware.ts      ← isAdminAuthenticated() helper
│   └── utils/
│       ├── tracking.ts        ← generateInternalTrackingCode() → "VP-XXXXXX"
│       └── helpers.ts         ← formatPrice(), slugify(), cn()
├── types/
│   └── index.ts               ← Shared types (ApiResponse<T>, etc.)
├── hooks/                     ← Custom React hooks
└── middleware.ts              ← Protects /admin routes, redirects to /admin/login
```

---
