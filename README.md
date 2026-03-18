# V&P Computer Shop — Web Platform

E-commerce platform for V&P Computer Shop, Patna.
Sells refurbished laptops, new laptops, motherboards, ICs, chips, and hardware components.

## Stack

| Layer     | Technology              |
| --------- | ----------------------- |
| Framework | Next.js 15 (App Router) |
| Language  | TypeScript (strict)     |
| ORM       | Drizzle ORM             |
| Database  | Supabase (PostgreSQL)   |
| Storage   | Supabase Storage        |
| Auth      | Custom JWT (jose)       |
| Styling   | Tailwind CSS v4         |

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

## Database Commands

```bash
npm run db:generate   # generate migration after schema change
npm run db:migrate    # apply migrations to DB
npm run db:push       # push schema directly (dev only)
npm run db:studio     # open visual DB browser
npm run db:seed       # create first admin user
```

## Key Decisions

- **Drizzle ORM** chosen over TypeORM — schema-first, type-safe, lightweight.
  Switching DB = change one line in `drizzle.config.ts`.
- **Custom JWT auth** for admin (not Supabase Auth) — full control over sessions.
- **Prices in paise** — ₹1 = 100 paise. All prices stored as integers.
- **Internal tracking codes** format: `VP-XXXXXX` (auto-generated).
- **External tracking** — stores courier AWB number + provider name (India Post, DTDC, etc.)

## Docs

See `.claude/CLAUDE.md` for full architecture, schema reference, and coding conventions.
