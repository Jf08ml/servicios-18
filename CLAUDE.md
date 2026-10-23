# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Mis Escorts** (misescorts.com) — a safety/trust and booking-management platform for independent
adult-services workers and their clients. The platform explicitly does **not** broker or sell the
service itself; it provides identity verification, an internal chat, scheduling, hotel-room
booking, reviews, and an SOS panic button. Roles: `WORKER` (professional), `CLIENT`, `HOTEL`,
`AGENCY`, `ADMIN`.

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

There is no lint script and no automated test suite in this repo; `npm run build` (which
type-checks) is the only automated check. `playwright` is a devDependency but it's only used by
the local, gitignored lead-prospecting scraper (see below), not for app tests.

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

- `(public)/` — portada (catalog), `/perfiles` directory + detail, `/agencias/[id]`,
  `/prepagos/[ciudad]` (see SEO below), `/como-funciona`, `/instalar`. No session required.
- `(auth)/` — login/registro.
- `(app)/` — everything requiring a session: `panel`, `perfil`, `chat`, `agenda`, `citas`,
  `hoteles`/`reservas`, `reportes`, `verificacion`, `notificaciones`, `admin/`, `hotel/`
  (HOTEL role), `agencia/` (AGENCY role).
- `api/files/[...path]/route.ts` — serves everything under `uploads/`.
- `api/chat/[id]/messages/route.ts` — chat is **polling-based**, not websockets.

Route protection is centralized in `src/middleware.ts`: a hardcoded `PROTECTED_PREFIXES` list
gates on the presence of the `s18_session` cookie (redirects to `/login` for pages, 401 JSON for
`/api/*`). `PUBLIC_FILE_PREFIXES` carves out `avatars/`, `hotels/`, `gallery/`, `agencies/` under `/api/files`
so catalog/profile media loads without a session; everything else under `uploads/` is
private-by-default and re-checked inside the route handler itself (e.g. verification documents are
only readable by their owner or an admin — see `src/app/api/files/[...path]/route.ts`). When adding
a new protected section, add its prefix to `PROTECTED_PREFIXES` — the middleware is the only gate,
individual pages don't re-check session existence (they do re-check role via `requireUser`).

The middleware also sets security headers on every response, including a nonce-based CSP
(`'strict-dynamic'`, GA4 allowed). The nonce is passed to Server Components via the `x-nonce`
request header; any inline `<script>` (e.g. JSON-LD in the portada/perfil/prepagos pages, the
analytics loader) must read it with `(await headers()).get("x-nonce")` and set `nonce=` or the
browser will block it.

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
- `Agency` (owned by an `AGENCY` user) groups workers via `User.agencyId`. It is purely
  organizational (no commission, unlike `Hotel`): each linked worker keeps her own account,
  verification, chat, appointments and reviews; the agency only co-manages the profile.
  `agencia/actions.ts` scopes every mutation to workers whose `agencyId` matches the caller's
  agency.
- `Appointment` → optional 1:1 `HotelBooking` (with `commissionPct`/`commissionAmount`) → `Review`.
- `Notification` + `PushSubscription` back the in-app bell and optional per-device Web Push.

Server Actions live in `actions.ts` files colocated with each route segment (`"use server"` at the
top), following the pattern: `requireUser()` → validate/trim form fields → mutate via `db` →
`revalidatePath(...)` the affected pages. See `src/app/(app)/perfil/actions.ts` for a representative
example (geo validation, upload handling, gallery limits).

### Uploads (`src/lib/uploads.ts`)

Files are saved to disk under `uploads/<avatars|verifications|hotels|gallery|agencies>/` with randomized
filenames (never trust/store original names), size-capped (8 MB images, 50 MB video) and
type-checked by MIME. All reads/writes resolve and verify the path stays under the uploads root
before touching the filesystem. `next.config.ts` raises the Server Actions body limit to 60 MB to
allow gallery video uploads.

### Admin bulk import (`src/lib/bulk-import.ts`, `admin/carga-masiva/`)

`importWorkersFromCsv` creates up to 500 worker accounts from a CSV (`csv-parse`), with photos
taken either from an optional ZIP (`jszip`, referenced by filename) or downloaded from external
URLs (`galeria_urls` accepts a JSON array or `|`-separated list) and re-saved as our own uploads
rather than hotlinked. Each row reuses the normal paths (`resolveGeo`, `saveImage`/`saveMedia`,
`GALLERY_LIMIT`, `seedDefaultServiceTypes`) and reports a per-row result instead of failing the
whole batch.

### Notifications & push (`src/lib/notifications.ts`, `src/lib/push.ts`)

`notify(userId, ...)` / `notifyAdmins(...)` write a `Notification` row and best-effort fan out a Web
Push message via VAPID (`sendPushToUser`, silently a no-op if VAPID env vars aren't set; stale
subscriptions returning 404/410 are pruned automatically). **The product never sends email** —
email is only a login identifier — so anything that needs to reach a user goes through this path,
not a mailer.

### WhatsApp outreach (`src/lib/whatsapp.ts`, `src/lib/whatsapp-outreach.ts`)

Bulk-imported workers start with `User.claimedAt = null` (self-registration sets it). When a
CLIENT sends a chat message to such a worker, `sendMessageAction` runs
`inviteWorkerIfUnclaimed` in `after()`. It sends a WhatsApp message without a link through the
external gateway `wa-baileys-backend` (separate repo, Baileys, called with a key scoped to
`WA_CLIENT_ID`). Her reply comes back through the gateway to `api/whatsapp/webhook`
(`X-WA-Agent-Secret` = `WA_WEBHOOK_SECRET`). A reply gets a one-time `/acceso/[token]` link
(`LoginToken`, stored as SHA-256 hash, consumed on POST, not on GET). "NO" opts her out.
Entering via the link sets `mustChangePassword`, and `requireUser` then redirects every app page
to `/contrasena` (in `(auth)`, to avoid a loop with the `(app)` layout). State per worker lives in
`WhatsappOutreach` (admin view: `/admin/whatsapp`). Everything is a no-op without the `WA_*` env
vars. There are caps: `WA_DAILY_LIMIT` invites per 24 h, at most 2 invites per worker 7 days
apart.

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

`scripts/backup.sh` is the nightly VPS backup (Postgres dump + `uploads/`, encrypted with restic
to Backblaze B2); installation is in `DEPLOY.md`.

Lead-prospecting scrapers (e.g. `scripts/scrape-leads.mjs`, Playwright) may exist locally but are
gitignored, along with their output (`scripts/out/`) and browser profile
(`scripts/.browser-profile/`). These contain personal data; never commit or upload them.
