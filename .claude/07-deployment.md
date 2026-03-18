# 07 — Deployment

---

## Hosting

- **Frontend + Backend (API routes):** Vercel
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage

---

## Environment Variables

Set all of these in Vercel Dashboard → Project → Settings → Environment Variables.

| Variable                      | Used By          | Notes                                          |
|-------------------------------|------------------|------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | Browser + Server | `https://[project-ref].supabase.co`           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | Safe for client — limited permissions        |
| `SUPABASE_SERVICE_ROLE_KEY`   | Server only      | Full DB access — never expose to browser      |
| `DATABASE_URL`                | Server only      | Direct PostgreSQL connection for Drizzle      |
| `ADMIN_JWT_SECRET`            | Server only      | Long random string for JWT signing            |

Set all variables for: Production, Preview, and Development environments in Vercel.

---

## DATABASE_URL for Production

Use the **direct connection** URL from Supabase (not the pooler).

In Supabase Dashboard:
→ Project Settings → Database → Connection String → URI tab
→ Make sure "Display connection pooler" is OFF
→ Copy the URL (port 5432)

Format:
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

---

## Vercel Build Command

In Vercel Dashboard → Project → Settings → Build & Development Settings:

```
Build Command: npm run db:migrate && next build
```

This runs migrations before every deployment so schema changes are applied automatically.

---

## Deployment Flow

```
Developer pushes to main branch
          ↓
Vercel picks up the push
          ↓
Vercel injects env vars
          ↓
npm run db:migrate   ← applies any new migration files to Supabase
          ↓
next build           ← builds the Next.js app
          ↓
Vercel deploys the build
          ↓
App is live
```

---

## Local vs Production Differences

| Thing              | Local                          | Production (Vercel)             |
|--------------------|--------------------------------|---------------------------------|
| Env vars           | `.env.local`                   | Vercel Dashboard                |
| DB commands        | `npm run db:push:local`        | `npm run db:migrate` (in build) |
| dotenv-cli         | Used (loads .env.local)        | Not used (Vercel injects vars)  |
| Cookies secure     | false                          | true                            |
| NODE_ENV           | development                    | production                      |

---

## Supabase Setup Checklist

Before going live, make sure these are done in Supabase:

- [ ] Storage bucket `product-images` created and set to **Public**
- [ ] Storage bucket policy allows public reads (images accessible without auth)
- [ ] RLS (Row Level Security) policies reviewed — we use Drizzle directly so RLS may not be enforced unless explicitly set
- [ ] Database password saved securely
- [ ] Supabase project is on a paid plan if expecting production traffic

---

## Vercel Setup Checklist

- [ ] GitHub repo connected to Vercel
- [ ] All environment variables added in Vercel Dashboard
- [ ] Build command set to `npm run db:migrate && next build`
- [ ] Domain configured (optional)

---

## Branching Strategy (suggested)

```
main          ← production (auto-deploys to Vercel)
dev           ← development (use for testing)
feature/*     ← individual features (PR into dev)
```

---

Last updated: Deployment plan set up at project start. Not yet deployed.
