# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Mis Escorts** (misescorts.com) — a safety/trust and booking-management platform for independent
adult-services workers and their clients. The platform explicitly does **not** broker or sell the
service itself; it provides identity verification, an internal chat, scheduling, hotel-room
booking, reviews, and an SOS panic button. Roles: `WORKER` (professional), `CLIENT`, `HOTEL`,
`ADMIN`.

The codebase, UI copy, DB comments, and route segments are all in **Spanish** (`/perfil`, `/citas`,
`/hoteles`, `/reportes`, `/verificacion`, `/panel`, etc.) — match that when adding routes, actions,
or comments.

## Commands

```bash
npm install
docker compose up -d      # Postgres 16 on host port 5434 (avoids clashing with a local instance)
npm run db:migrate        # prisma migrate dev — applies migrations locally
npm run db:seed           # tsx prisma/seed.ts — seed accounts, password123 for all
npm run dev
npm run build && npm start
```

There is no lint script and no automated test suite in this repo. `playwright` is a devDependency
but it's only used by `scripts/scrape-leads.mjs` (a lead-prospecting scraper, see below), not for
app tests.

Env vars (see `.env.example`): `DATABASE_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` /
`VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (Web Push, generate with
`npx web-push generate-vapid-keys`), `NEXT_PUBLIC_SITE_URL` (must be the real production origin —
it feeds canonicals, sitemap, and Open Graph URLs, and `NEXT_PUBLIC_*` vars are baked into the
build, so changing it requires a rebuild).

### Prisma schema changes

Edit `prisma/schema.prisma`, run `npm run db:migrate` locally (writes to
`prisma/migrations/`), then commit — the migration ships with the code. It is **not** applied
automatically on deploy; after the push-triggered deploy finishes on the VPS, run the `migrate`
profile manually (see Deployment below).

### Deployment

Production is a single Vultr VPS running **Dokploy** (Traefik + HTTPS via Let's Encrypt); pushing
to `main` triggers a webhook that rebuilds and redeploys automatically from
`docker-compose.prod.yml` (~5 min). Env vars and domains are configured in the Dokploy panel and
always need a **Redeploy** to take effect. Full provisioning steps (VPS, DNS, VAPID, restic backups
to Backblaze B2) are in `DEPLOY.md`; the day-to-day flow (deploy, schema migrations, rollback,
logs) is in the README's "Producción y despliegues" section — read those rather than re-deriving
the process.

## Architecture

### Route groups (`src/app/`)

- `(public)/` — portada (catalog), `/perfiles` directory + detail, `/prepagos/[ciudad]` (see SEO
  below), `/como-funciona`, `/instalar`. No session required.
- `(auth)/` — login/registro.
- `(app)/` — everything requiring a session: `panel`, `perfil`, `chat`, `agenda`, `citas`,
  `hoteles`/`reservas`, `reportes`, `verificacion`, `notificaciones`, `admin/`, `hotel/`.
- `api/files/[...path]/route.ts` — serves everything under `uploads/`.
- `api/chat/[id]/messages/route.ts` — chat is **polling-based**, not websockets.

Route protection is centralized in `src/middleware.ts`: a hardcoded `PROTECTED_PREFIXES` list
gates on the presence of the `s18_session` cookie (redirects to `/login` for pages, 401 JSON for
`/api/*`). `PUBLIC_FILE_PREFIXES` carves out `avatars/`, `hotels/`, `gallery/` under `/api/files`
so catalog/profile media loads without a session; everything else under `uploads/` is
private-by-default and re-checked inside the route handler itself (e.g. verification documents are
only readable by their owner or an admin — see `src/app/api/files/[...path]/route.ts`). When adding
a new protected section, add its prefix to `PROTECTED_PREFIXES` — the middleware is the only gate,
individual pages don't re-check session existence (they do re-check role via `requireUser`).

### Auth (`src/lib/auth.ts`)

Cookie-session auth (bcrypt + random token in a `Session` DB row), not JWT. Key helpers:
`getCurrentUser()` (cached per-request via React `cache`), `requireUser(roles?)` (redirects to
`/login` or `/suspendido`, then to `/panel` if the role doesn't match), `isPremium`, `isVerified`,
`isAdult`. Server Actions call `requireUser()` themselves for authorization — middleware only
handles "is there a session at all".

### Data layer

`prisma/schema.prisma` is the source of truth for the domain. Notable shapes:
- `User.role` (`WORKER`/`CLIENT`/`HOTEL`/`ADMIN`) drives most authorization branches.
- `Verification` has two levels: `QUICK` (selfie holding a sign) and `FULL` (document + selfie,
  `User.fullVerificationRequired` forces an upgrade after reports/suspicion).
- `Profile` stores denormalized location (`countryCode`/`countryName`/`stateCode`/`stateName`/
  `city`) resolved through `src/lib/geo.ts` (wraps `country-state-city`), not free text — always
  validate against that library when writing location fields.
- `Appointment` → optional 1:1 `HotelBooking` (with `commissionPct`/`commissionAmount`) → `Review`.
- `Notification` + `PushSubscription` back the in-app bell and optional per-device Web Push.

Server Actions live in `actions.ts` files colocated with each route segment (`"use server"` at the
top), following the pattern: `requireUser()` → validate/trim form fields → mutate via `db` →
`revalidatePath(...)` the affected pages. See `src/app/(app)/perfil/actions.ts` for a representative
example (geo validation, upload handling, gallery limits).

### Uploads (`src/lib/uploads.ts`)

Files are saved to disk under `uploads/<avatars|verifications|hotels|gallery>/` with randomized
filenames (never trust/store original names), size-capped (8 MB images, 50 MB video) and
type-checked by MIME. All reads/writes resolve and verify the path stays under the uploads root
before touching the filesystem. `next.config.ts` raises the Server Actions body limit to 60 MB to
allow gallery video uploads.

### Notifications & push (`src/lib/notifications.ts`, `src/lib/push.ts`)

`notify(userId, ...)` / `notifyAdmins(...)` write a `Notification` row and best-effort fan out a Web
Push message via VAPID (`sendPushToUser`, silently a no-op if VAPID env vars aren't set; stale
subscriptions returning 404/410 are pruned automatically). **The product never sends email** —
email is only a login identifier — so anything that needs to reach a user goes through this path,
not a mailer.

### SEO (`src/lib/site.ts`)

`SITE_URL`/`absUrl()`/`slugify()` back canonical URLs, Open Graph, `sitemap.ts`, and `robots.ts`.
Programmatic city landing pages at `/prepagos/[ciudad]` (see
`src/app/(public)/prepagos/[ciudad]/page.tsx`) resolve the URL slug against distinct `city` values
already present in visible `Profile` rows (via `slugify`) rather than a separate cities table —
pages 404 (`robots: noindex`) for cities with no visible workers. `worker-catalog.tsx` exports
`VISIBLE_WORKER_PROFILE`, the shared "publicly listable" query shape
(`role: WORKER`, `status: ACTIVE`, `verifiedAt: not null`, `profile.visible: true`) reused by the
portada, `/perfiles`, and the city landing pages — reuse it rather than re-deriving the visibility
predicate.

### PWA

`src/app/manifest.ts` + `public/sw.js` + `src/components/pwa-register.tsx`/`install-button.tsx`
make the app installable; push opt-in is per-device (`notificaciones/push-toggle.tsx` →
`PushSubscription` rows).

## Scripts (not part of the app)

`scripts/scrape-leads.mjs` (Playwright) and `scripts/extract-leads-BROWSER-CONSOLE.js` are lead-
prospecting tools that scrape public listing sites for contact info to reach out to prospective
workers — unrelated to the product itself. Their output (`scripts/out/`) and browser profile
(`scripts/.browser-profile/`) contain personal data and are gitignored; never commit or upload
their contents.
