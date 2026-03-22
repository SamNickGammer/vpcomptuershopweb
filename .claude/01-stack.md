# 01 — Tech Stack, Commands & Folder Structure

---

## Tech Stack

| Layer      | Technology              | Notes                                        |
|------------|-------------------------|----------------------------------------------|
| Framework  | Next.js 15 (App Router) | Frontend + API routes combined               |
| Language   | TypeScript strict        |                                              |
| ORM        | Drizzle ORM             | Schema in `src/lib/db/schema/`               |
| Database   | Supabase (PostgreSQL)   | Swap DB = change `drizzle.config.ts` only    |
| Storage    | Supabase Storage        | Bucket: `product-images` (public)            |
| Auth       | Custom JWT via `jose`   | httpOnly cookies, admin + customer           |
| Password   | bcryptjs                | 12 rounds                                    |
| Validation | Zod                     | All API inputs validated before DB touch     |
| Forms      | React Hook Form + Zod   |                                              |
| Styling    | Tailwind CSS v4         |                                              |
| Icons      | lucide-react            |                                              |
| Toast      | sonner                  |                                              |

---

## Environment Variables

File: `.env.local` — never commit this file.
Use `.env.example` as the template (no real values).

```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
ADMIN_JWT_SECRET=
```

Rules:
- `NEXT_PUBLIC_*` = safe for browser
- All others = server only, NEVER import in client components
- `DATABASE_URL` = direct connection port 5432, NOT pooler port 6543
- `SUPABASE_SERVICE_ROLE_KEY` = only used server-side for storage operations

---

## Key Commands

```bash
# Development
npm run dev                  # start Next.js dev server at localhost:3000

# Database — local (uses .env.local via dotenv-cli)
npm run db:push:local        # push schema changes to DB (dev — no migration file created)
npm run db:generate:local    # generate migration SQL file after schema change
npm run db:migrate:local     # apply migration files to DB
npm run db:studio:local      # open Drizzle Studio at local.drizzle.studio
npm run db:seed:local        # create the first admin user

# Database — production (Vercel runs these, env vars injected by Vercel)
npm run db:migrate           # apply migrations (used in Vercel build command)
npm run build                # build Next.js for production
```

Note: `dotenv-cli` is only used locally to load `.env.local`.
On Vercel, environment variables are injected automatically — dotenv is not used.

---

## package.json Scripts

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:seed": "tsx src/lib/db/seed.ts",
  "db:generate:local": "dotenv -e .env.local -- drizzle-kit generate",
  "db:migrate:local": "dotenv -e .env.local -- drizzle-kit migrate",
  "db:push:local": "dotenv -e .env.local -- drizzle-kit push",
  "db:studio:local": "dotenv -e .env.local -- drizzle-kit studio",
  "db:seed:local": "dotenv -e .env.local -- tsx src/lib/db/seed.ts"
}
```

---

## Folder Structure

```
vpcomputerweb/
├── .claude/                        ← Claude Code instructions (this folder)
│   ├── CLAUDE.md                   ← Entry point / index
│   ├── 01-stack.md                 ← YOU ARE HERE
│   ├── 02-schema.md
│   ├── 03-auth.md
│   ├── 04-tracking.md
│   ├── 05-conventions.md
│   ├── 06-features.md
│   └── 07-deployment.md
│
├── src/
│   ├── app/
│   │   ├── (admin)/                ← Route group — admin panel (JWT protected)
│   │   │   └── admin/
│   │   │       ├── login/          ← Public (no auth)
│   │   │       ├── dashboard/
│   │   │       ├── analytics/      ← Revenue charts, order stats, top products
│   │   │       ├── products/
│   │   │       │   ├── page.tsx    ← Product list
│   │   │       │   ├── new/        ← Add new product
│   │   │       │   └── [id]/       ← Edit product
│   │   │       ├── categories/     ← Category management
│   │   │       ├── orders/
│   │   │       │   └── [id]/       ← Order detail + tracking + payment
│   │   │       ├── inventory/
│   │   │       ├── coupons/        ← Coupon management
│   │   │       └── settings/
│   │   │
│   │   ├── (store)/                ← Customer-facing storefront (WIP)
│   │   │   ├── page.tsx            ← Homepage (white theme, mdcomputers.in style)
│   │   │   ├── products/           ← Product listing + detail pages
│   │   │   │   └── [slug]/         ← Product detail with variant selector
│   │   │   ├── cart/               ← Shopping cart page
│   │   │   ├── checkout/           ← Checkout flow (COD, coupon support)
│   │   │   ├── tracking/           ← Order tracking page (VP-XXXXXX lookup)
│   │   │   ├── account/            ← Customer dashboard (order history, details)
│   │   │   ├── login/              ← Customer login page
│   │   │   └── register/           ← Customer registration page
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── login/      ← POST — admin login
│   │   │   │   │   └── logout/     ← POST — admin logout
│   │   │   │   └── customer/
│   │   │   │       ├── login/      ← POST — customer login
│   │   │   │       └── register/   ← POST — customer registration
│   │   │   ├── admin/              ← Protected admin APIs
│   │   │   │   ├── products/
│   │   │   │   ├── categories/
│   │   │   │   ├── orders/
│   │   │   │   ├── inventory/
│   │   │   │   └── coupons/
│   │   │   ├── products/           ← Public product API
│   │   │   ├── orders/             ← Public order placement
│   │   │   └── tracking/           ← Public tracking lookup
│   │   │
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── layout/             ← Sidebar, header, nav
│   │   │   ├── products/           ← Product form, product list, image uploader
│   │   │   ├── orders/             ← Order table, order detail, payment mgmt
│   │   │   ├── inventory/          ← Stock table, stock update form
│   │   │   ├── coupons/            ← Coupon form, coupon list
│   │   │   └── tracking/           ← Tracking timeline, add tracking event
│   │   ├── store/                  ← Storefront components
│   │   │   ├── layout/             ← Store header, footer, nav
│   │   │   ├── products/           ← Product card, product grid, filters
│   │   │   ├── cart/               ← Cart items, cart summary
│   │   │   └── checkout/           ← Checkout form, coupon input
│   │   └── ui/                     ← Shared UI components (buttons, inputs, etc.)
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts            ← Drizzle client (singleton pattern)
│   │   │   ├── seed.ts             ← First admin user seeder
│   │   │   └── schema/
│   │   │       ├── index.ts        ← Re-exports ALL schemas (used by drizzle.config.ts)
│   │   │       ├── admin.ts
│   │   │       ├── categories.ts
│   │   │       ├── products.ts     ← products (images/specs/variants as jsonb)
│   │   │       ├── inventory.ts    ← inventory_history only (no inventory table)
│   │   │       ├── orders.ts
│   │   │       ├── tracking.ts
│   │   │       ├── customers.ts    ← customers table
│   │   │       └── coupons.ts      ← coupons table
│   │   ├── supabase/
│   │   │   ├── client.ts           ← createBrowserClient (image uploads from browser)
│   │   │   └── server.ts           ← createServerClient (server-side storage ops)
│   │   ├── auth/
│   │   │   ├── admin.ts            ← Admin JWT helpers, cookie helpers, bcrypt
│   │   │   └── customer.ts         ← Customer JWT helpers, cookie helpers, bcrypt
│   │   └── utils/
│   │       ├── helpers.ts          ← formatPrice, slugify, cn, generateOrderNumber
│   │       └── tracking.ts         ← generateInternalTrackingCode → "VP-XXXXXX"
│   │
│   ├── types/
│   │   └── index.ts                ← Shared TypeScript types
│   ├── hooks/                      ← Custom React hooks (useCart, etc.)
│   └── middleware.ts               ← Route protection (admin + customer cookies)
│
├── drizzle/
│   └── migrations/                 ← Auto-generated SQL — never edit manually
├── drizzle.config.ts               ← Points to schema + DB
├── next.config.ts
├── tsconfig.json
├── .env.local                      ← Never commit
└── .env.example                    ← Commit this (empty values)
```

---

Last updated: 2026-03-22 — Folder structure updated to reflect storefront pages, customer auth, coupons, analytics, and new schema files.
