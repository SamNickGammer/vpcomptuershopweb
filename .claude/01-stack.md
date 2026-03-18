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
| Auth       | Custom JWT via `jose`   | httpOnly cookie, admin only for now          |
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
│   │   │       ├── products/
│   │   │       │   ├── page.tsx    ← Product list
│   │   │       │   ├── new/        ← Add new product
│   │   │       │   └── [id]/       ← Edit product
│   │   │       ├── orders/
│   │   │       │   └── [id]/       ← Order detail + tracking
│   │   │       ├── inventory/
│   │   │       └── settings/
│   │   │
│   │   ├── (store)/                ← Customer-facing storefront (future)
│   │   │
│   │   ├── api/
│   │   │   ├── auth/admin/
│   │   │   │   ├── login/          ← POST — admin login
│   │   │   │   └── logout/         ← POST — admin logout
│   │   │   ├── admin/              ← Protected admin APIs
│   │   │   │   ├── products/
│   │   │   │   ├── orders/
│   │   │   │   └── inventory/
│   │   │   ├── products/           ← Public product API
│   │   │   ├── orders/             ← Public order placement (future)
│   │   │   └── tracking/           ← Public tracking lookup
│   │   │
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── admin/
│   │   │   ├── layout/             ← Sidebar, header, nav
│   │   │   ├── products/           ← Product form, product list, image uploader
│   │   │   ├── orders/             ← Order table, order detail
│   │   │   ├── inventory/          ← Stock table, stock update form
│   │   │   └── tracking/           ← Tracking timeline, add tracking event
│   │   ├── store/                  ← Storefront components (future)
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
│   │   │       ├── products.ts
│   │   │       ├── inventory.ts
│   │   │       ├── orders.ts
│   │   │       └── tracking.ts
│   │   ├── supabase/
│   │   │   ├── client.ts           ← createBrowserClient (image uploads from browser)
│   │   │   └── server.ts           ← createServerClient (server-side storage ops)
│   │   ├── auth/
│   │   │   └── admin.ts            ← JWT helpers, cookie helpers, bcrypt helpers
│   │   └── utils/
│   │       ├── helpers.ts          ← formatPrice, slugify, cn, generateOrderNumber
│   │       └── tracking.ts         ← generateInternalTrackingCode → "VP-XXXXXX"
│   │
│   ├── types/
│   │   └── index.ts                ← Shared TypeScript types
│   ├── hooks/                      ← Custom React hooks
│   └── middleware.ts               ← Route protection (reads JWT cookie)
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

Last updated: Project initialization — stack chosen, structure created, db commands set up.
