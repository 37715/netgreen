# Deploying netgreen (Vercel + Neon + Google login)

Only you and your brother can access the live app. Everyone else is blocked at login.

## Overview

| Piece | Service |
|-------|---------|
| App hosting | [Vercel](https://vercel.com) |
| Database | [Neon](https://neon.tech) Postgres (free tier) |
| Login | Google OAuth via Auth.js |
| Access control | Email allowlist (`ALLOWED_EMAILS`) |

---

## 1. Google OAuth (one-time)

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (e.g. **netgreen**)
3. **APIs & Services → OAuth consent screen** — External, add your two emails as test users (or publish when ready)
4. **Credentials → Create credentials → OAuth client ID → Web application**
5. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - `https://YOUR-APP.vercel.app` (add after first Vercel deploy)
6. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-APP.vercel.app/api/auth/callback/google`
7. Copy **Client ID** and **Client secret**

---

## 2. Neon Postgres

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **connection string** (pooled URL for serverless)
3. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Push schema to Neon (from your machine, with `DATABASE_URL` set to Neon):
   ```bash
   npx prisma db push
   npm run seed   # optional: crews + sample data
   ```
5. **Migrate your local data** (optional): export/import or re-run the ICS import on production.

---

## 3. Environment variables

### Local (`.env`)

```env
DATABASE_URL="file:./dev.db"
AUTH_DISABLED="true"
```

Use `AUTH_DISABLED=false` and full OAuth vars when testing login locally.

### Vercel (Project → Settings → Environment Variables)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | Random string — run `npx auth secret` |
| `AUTH_GOOGLE_ID` | From Google Cloud |
| `AUTH_GOOGLE_SECRET` | From Google Cloud |
| `ALLOWED_EMAILS` | `producedbyellis9@gmail.com,ehwlandscapes@gmail.com,hugow0604@gmail.com` |

**Do not** set `AUTH_DISABLED` on Vercel.

---

## 4. Deploy to Vercel

1. Push repo to GitHub (`37715/netgreen`)
2. [vercel.com/new](https://vercel.com/new) → Import **netgreen**
3. Add env vars above
4. Deploy
5. Add the Vercel URL to Google OAuth redirect URIs (step 1)
6. Redeploy if needed

**Build command:** `prisma generate && next build`  
Add to `package.json` if Vercel doesn't run generate automatically:

```json
"build": "prisma generate && next build"
```

---

## 5. Security model

- **No public access** — middleware sends unauthenticated users to `/login`
- **Google only** — no passwords to leak
- **Allowlist** — `signIn` callback rejects any email not in `ALLOWED_EMAILS`, even with a valid Google account
- **HTTPS** — Vercel enforces TLS

To add/remove someone later, edit `ALLOWED_EMAILS` in Vercel and redeploy.

---

## 6. After deploy checklist

- [ ] Sign in with **producedbyellis9@gmail.com** → works
- [ ] Sign in with **ehwlandscapes@gmail.com** → works (same data)
- [ ] Sign in with **hugow0604@gmail.com** → works (same data)
- [ ] Sign in with a random Gmail → **blocked** (Access denied)
- [ ] Calendar / jobs load from Neon DB
- [ ] Back up Neon periodically (Neon dashboard → backups on paid; or export data)

---

## Local vs production

| | Local | Production |
|---|--------|------------|
| Database | SQLite `prisma/dev.db` | Neon Postgres |
| Auth | Often `AUTH_DISABLED=true` | Always on |
| Data | Your machine only | Shared live DB for both brothers |
