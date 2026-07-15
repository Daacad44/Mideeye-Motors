# 🚗 Mideeye Motors & Rental Car Co.

A premium, enterprise-grade luxury car-rental platform. Apple-level design, Tesla/BMW-inspired UI, and a fully dynamic **ImageKit-driven** image pipeline where the frontend reflects any image change with **zero code edits**.

> Full redesign of the Mideeye Motors experience — hero, fleet, vehicle details, booking flow, user & admin dashboards — built as a real full-stack monorepo.

---

## ✨ Highlights

- **World-class UI/UX** — glassmorphism, floating search card, soft shadows, rounded corners, premium `Sora`/`Inter` typography, and Framer Motion micro-interactions throughout.
- **ImageKit as the single source of truth for images.** Vehicles store only ImageKit `filePath`s (+ `fileId` for management); every delivery URL (thumbnail → hero → lightbox) is derived on the fly via `?tr=` transformation params. Re-upload/replace the same asset and the whole site updates instantly.
- **Automatic galleries** — image carousel, thumbnail navigation, fullscreen lightbox with keyboard nav and zoom, all generated from a vehicle's gallery array.
- **Responsive & accessible** — pixel-perfect from mobile to desktop, focus-visible rings, reduced-motion support, semantic landmarks, `srcSet`/lazy-loading for performance.
- **Full backend** — Express + Prisma (PostgreSQL) + Redis cache + JWT auth + ImageKit upload/sign/delete/rename.
- **Containerised** — Dockerfiles + `docker-compose.yml`, ready for Coolify.

---

## 🧱 Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion, lucide-react, React Router 7 |
| Backend    | Node.js, Express, TypeScript, Prisma ORM, Zod |
| Database   | PostgreSQL |
| Cache      | Redis (optional, degrades gracefully) |
| Media      | **ImageKit** (official Node SDK server-side; single image source of truth) |
| Auth       | JWT + bcrypt |
| Deploy     | Docker, docker-compose, Coolify |

> **Note on "Next.js Image":** the brief mentioned it, but the chosen stack is **Vite + React**. The equivalent has been implemented as a first-class `VehicleImage` component (`frontend/src/components/VehicleImage.tsx`) that does automatic resizing, format negotiation (AVIF/WebP via `fo-auto`), responsive `srcSet`, skeleton placeholders and native lazy-loading — all via ImageKit URL-based transformations.

---

## 📁 Structure

```
mideeye-motors/
├── frontend/                    # React 19 + Vite SPA
│   ├── src/
│   │   ├── lib/imagekitImages.ts # ⭐ dynamic URL builder (the core image engine)
│   │   ├── components/           # Navbar, Footer, VehicleImage, VehicleCard, Lightbox…
│   │   ├── components/home/      # Hero, SearchCard, Featured, Categories, Testimonials…
│   │   ├── pages/                # Home, Fleet, VehicleDetails, Booking, Admin, Dashboard…
│   │   ├── data/vehicles.ts      # 9-vehicle seed / offline fallback (no image refs)
│   │   └── types/vehicle.ts
│   ├── Dockerfile + nginx.conf
├── backend/                     # Express + Prisma API
│   ├── prisma/schema.prisma     # Vehicle / VehicleImage / MediaImage / Branding / User / Booking
│   ├── prisma/seed.ts           # seeds the 9 vehicles + admin accounts + default branding
│   ├── src/lib/                 # imagekit, prisma, redis, env, fileValidation
│   ├── src/routes/               # vehicles, auth, upload, admin/media, branding, admin, bookings
│   └── Dockerfile + docker-entrypoint.sh
├── docker-compose.yml
└── .env.example
```

---

## 🖼️ How the ImageKit "auto-update, no code changes" works

1. Every image lives in a central **`MediaImage`** table: `fileId` (ImageKit's canonical reference), `filePath`, `url`, `thumbnailUrl`, dimensions, `folder`, `tags`, and who uploaded it.
2. `Vehicle.heroImage/coverImage/thumbnail` and each `VehicleImage` (gallery row) are just **foreign keys to `MediaImage`** — no raw URLs or paths duplicated across tables.
3. The frontend never hardcodes a URL. `ik(filePath, preset)` builds the delivery URL at render time by appending a `?tr=...` transformation string — resizing is **URL-based**, not a pre-registered variant, so the same `filePath` can render at any preset (hero/card/gallery/thumb) with zero extra uploads.
4. **Replacing** an image (Media Library → Replace) uploads a new ImageKit asset, deletes the old one, and updates the same `MediaImage` row in place — every page referencing it updates immediately, with no redeploy.
5. The admin panel (`/admin` → Fleet tab) attaches vehicles to media by pasting a `MediaImage` id copied from the Media Library — set hero/cover/thumbnail or build the gallery, all persisted via the real API (`PATCH /api/vehicles/:id`, `PUT /api/vehicles/:id/gallery`).

The 9 seeded vehicles start with **no images** (see "Cloudinary → ImageKit migration" below for why) — `VehicleImage` shows an on-brand silhouette placeholder until an admin uploads real photos via the Media Library.

### Image presets (`tr=` transformation strings)
| Preset | Transform | Use |
|---|---|---|
| `hero` | `w-1920,h-1080,c-maintain_ratio,fo-auto,q-80` | Homepage hero |
| `card` | `w-800,h-600,c-maintain_ratio,fo-auto,q-80` | Fleet/featured cards |
| `gallery` | `w-1600,h-1200,c-at_max,fo-auto,q-85` | Vehicle details main image |
| `team` | `w-600,h-600,c-maintain_ratio,fo-auto,q-80` | Team/testimonial avatars |
| `blogcover` | `w-1200,h-630,c-maintain_ratio,fo-auto,q-80` | Blog cover images |
| `thumb` | `w-400,h-300,c-maintain_ratio,fo-auto,q-70` | Thumbnails, nav strips |
| `logo` | *(none)* | Original quality, no resize/crop, alpha preserved |

Defined once in `backend/src/lib/imagekit.ts::PRESETS` and mirrored in `frontend/src/lib/imagekitImages.ts` (the frontend has no access to the server-only module, so the mapping is intentionally duplicated — keep both in sync if a preset changes).

Supported gallery tags (free-form, not DB-enforced): `front`, `rear`, `side`, `left`, `right`, `interior`, `exterior`, `dashboard`, `engine`, `wheel`, `360`, `thumbnail`, `gallery`.

---

## 🚀 Getting Started

### 1. Prerequisites
Node 20+, and either Docker **or** a local PostgreSQL (Redis optional). An [ImageKit](https://imagekit.io) account (free tier works) for real image uploads — the app runs fine without one, just with placeholder images.

### 2. Environment
```bash
cp .env.example .env            # fill in ImageKit + DB creds
cp .env.example frontend/.env   # set VITE_API_URL + VITE_IMAGEKIT_PUBLIC_KEY + VITE_IMAGEKIT_URL_ENDPOINT
```

### 3. Run everything with Docker (recommended)
```bash
docker compose up --build
# Web  → http://localhost:8080
# API  → http://localhost:4000/api/health
```

### 4. Or run locally
```bash
# Backend
cd backend
npm install
npx prisma migrate deploy # apply migrations (creates tables)
npm run seed               # seed 9 vehicles + admin accounts + branding
npm run dev                 # http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

The frontend works **without** the backend too — it falls back to the bundled seed fleet, so the UI always renders for previews.

### Seeded accounts
```
Super Admin  daacaddeveloper@gmail.com  /  Daacad@44Xxv
Admin        admin@mideeyemotors.com    /  admin1234
```
Both are env-overridable per deployment (`SEED_SUPER_ADMIN_EMAIL/PASSWORD`, `SEED_ADMIN_EMAIL/PASSWORD`). Passwords are hashed with bcrypt (cost 12). Sign in at `/login`, then `/admin`
opens the tabbed dashboard (Media Library · Fleet · Team & Roles · Audit Log).
`/dashboard` is the renter view.

---

## 🔌 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/vehicles` | List (supports `?featured=true`, `?category=SUV`) |
| GET    | `/api/vehicles/:slug` | Single vehicle + gallery |
| PATCH  | `/api/vehicles/:id` | Update pricing / featured / availability / hero / cover / thumbnail *(admin)* |
| PUT    | `/api/vehicles/:id/gallery` | Replace & reorder gallery *(admin)* |
| POST   | `/api/upload` | Single-file upload → ImageKit + `MediaImage` row *(staff+)* |
| POST   | `/api/upload/sign` | Auth params for a direct browser → ImageKit upload *(staff+)* |
| DELETE | `/api/upload/:fileId` | Remove an image from ImageKit + DB *(staff+, `?force=true` if in use)* |
| GET/POST | `/api/admin/media` | List (search/filter/sort/paginate) · single upload *(staff+)* |
| POST   | `/api/admin/media/bulk-upload` | Drag-and-drop multi-upload *(staff+)* |
| PATCH  | `/api/admin/media/:id` | Rename (real ImageKit rename) / alt / caption / folder / tags *(staff+)* |
| PUT    | `/api/admin/media/:id/replace` | Replace the underlying asset in place *(staff+)* |
| DELETE | `/api/admin/media/:id` · `/bulk-delete` | Delete (blocks if in use unless `force`) *(staff+)* |
| GET    | `/api/branding` | Public — resolved logo/favicon/hero + contact info |
| PATCH  | `/api/branding` | Update branding *(staff+)* |
| POST   | `/api/bookings` | Create a booking (server-side price calc) |
| POST   | `/api/auth/register` · `/login` · `/refresh` · `/logout` · GET `/me` | JWT access + rotating refresh cookie |
| GET/POST | `/api/admin/users` | List · create staff/manager/admin *(super admin)* |
| PATCH/POST/DELETE | `/api/admin/users/:id/role · /status · /reset-password` | Assign role · suspend · reset · delete *(super admin)* |
| GET | `/api/admin/audit` | Recent audit log *(admin+)* |

Responses are cached in Redis for 60s where useful and invalidated on write. Every route is wrapped by `express-async-errors` + a global error handler — no request can crash the process; failures return a JSON `{ error }` with the correct status code, and full stack traces are logged server-side only.

---

## 🩺 Troubleshooting: Login shows "Failed to fetch" / 500

**"Failed to fetch"** means the **browser can't reach the API** (not an auth bug). Check:
1. **Is the API running?** `curl http://localhost:4000/api/health` → `{"status":"ok"}`.
2. **`VITE_API_URL`** must point at the API's public URL — baked at build time, rebuild the frontend after changing it.
3. **`CORS_ORIGIN`** on the API must include the web app's origin (credentials are sent for the refresh cookie).

**HTTP 500 on login** almost always means **the database has no schema/no seeded users**. Fix:
1. Run `npx prisma migrate deploy` against the target database (creates tables).
2. Run `npm run seed` (or let the Docker entrypoint do it on boot — see below).
3. Confirm: `SELECT email, role FROM "User";` should show the Super Admin + Admin.

The app surfaces meaningful messages instead of a blind 500/"Failed to fetch":
*Invalid email or password* · *Network connection failed — cannot reach the
server* · *Too many attempts* · *Server error* · *Your session has expired*.

## 🔄 Cloudinary → ImageKit migration (what changed, and why)

This codebase originally used Cloudinary, briefly used Cloudflare Images, and now uses **ImageKit** as the final, sole image provider. Every Cloudinary/Cloudflare dependency, env var, helper, DB field and type has been removed.

**Data migration decision (explicit, documented, reversible):** the old `Vehicle.heroImage/coverImage/thumbnail` and `VehicleImage.publicId` columns held Cloudinary publicIds pointing at assets that no longer exist under this provider. Rather than fake a remap, the migration (`backend/prisma/migrations/*_imagekit_migration/migration.sql`) explicitly **wipes the placeholder `VehicleImage` rows** and leaves the FK columns `NULL` — see the migration file's header comment for the full rationale. All non-image data (pricing, specs, descriptions, bookings, users, roles) is untouched. An admin re-uploads real photos via the Media Library, which populates these fields automatically.

## 🖼️ Official logo policy

The official Mideeye Motors logo is **never** recreated, vectorized, drawn in
CSS/SVG, or replaced with text. The `Logo` component renders **only** the real
PNG, resolved dynamically:

1. **Upload once** via the Admin Media Manager into the **`/mideeye-motors/brand`**
   folder (there's a one-click "🏷️ brand" preset on the dropzone).
2. **PATCH `/api/branding`** with `{ logoImageId: <MediaImage id> }` to set it as the site logo.
3. The public **`GET /api/branding`** endpoint returns the resolved delivery URL; the frontend
   uses it in the **navbar, footer, login/register, dashboard,
   admin, booking confirmation, loading screen, favicon and PWA manifest** —
   everywhere, with zero code changes.
4. If no logo has been set yet, the space is reserved with a transparent
   placeholder — **never** a fake wordmark or badge.

> The chat-uploaded PNG's bytes cannot be injected into the repo/ImageKit
> automatically — upload it once via the dashboard and it propagates everywhere.

## 🗂️ Admin Media Library (`/admin` → Media Library)

The single place administrators manage images. Drag-and-drop / multi-upload with
progress, search + folder filter, sort (recent/name/size), per-item **copy URL /
copy MediaImage ID / replace / rename (real ImageKit rename) / delete**, "in use"
badges + usage tracking (which vehicle/branding entry references each image),
and **bulk select + bulk delete** (blocked with a confirmation if any selected
image is in use — pass `force` to delete anyway). Every upload flows
`Dashboard → API (multer, magic-byte validated) → ImageKit SDK → PostgreSQL metadata → frontend`.
ImageKit auto-serves WebP/AVIF (`fo-auto`); no local storage, ever. Deletes
remove both the ImageKit asset and the DB row (no orphans).

## 🔐 Roles, security & audit

- **RBAC** — `SUPER_ADMIN › ADMIN › MANAGER › STAFF › CUSTOMER` with a rank
  hierarchy. Only the Super Admin can create/suspend/delete admins, assign roles
  and reset passwords; Super Admin accounts are protected from modification.
  Admin/Manager/Staff can manage media & vehicles but not users/roles.
- **Auth** — short-lived JWT access tokens + rotating httpOnly refresh cookies;
  suspended accounts are blocked and their tokens revoked.
- **Hardening** — Helmet headers, per-window rate limiting (stricter on `/auth`),
  CORS with credentials, Zod validation on every mutation, server-side magic-byte
  file validation (PNG/JPEG/GIF/WebP only — SVG rejected to avoid stored-XSS), 20MB upload cap.
- **Audit log** — every privileged action (media upload/replace/delete, user
  create/suspend/role-change, password reset, branding update) is recorded with actor + IP.
- **Credentials never reach the frontend** — `IMAGEKIT_PRIVATE_KEY` is server-side only; the browser only ever sees `VITE_IMAGEKIT_PUBLIC_KEY` + `VITE_IMAGEKIT_URL_ENDPOINT`.

---

## 🌍 Deploying to Coolify

**The web and API are same-origin in production:** the web container's nginx
reverse-proxies `/api` → the internal `api` service, and the SPA is built with
`VITE_API_URL=/api`. This removes CORS, mixed-content (HTTPS→HTTP) and
wrong-host failures — the browser only ever talks to the web domain.

1. Create a **Docker Compose** resource pointing at this repo's `docker-compose.yml`.
2. Set env vars in Coolify: `POSTGRES_*`, `JWT_SECRET`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`.
   You do **not** need to set `VITE_API_URL` (defaults to `/api`) or `CORS_ORIGIN`
   (defaults to reflect) for the single-compose deploy.
3. Expose only the **web** service's port 80 to your domain; the `api` service
   stays internal (`expose`, never `ports`) and is reached via the nginx proxy.
4. Deploy. The API's `docker-entrypoint.sh` runs `prisma migrate deploy` (falls back to
   `db push`), then seeds idempotently — so login works
   immediately on first boot, no manual seed step. Every `[boot] …` line in
   the deploy log tells you exactly what happened.

> **Deploying web + API as two separate services instead?** Then there's no
> shared network for the nginx proxy: set `VITE_API_URL` to the API's public
> **https** URL and `CORS_ORIGIN` to the web URL.

### Login shows "cannot reach the server" or 500? Check, in order:
1. Is the **api** container running (not crash-looping)? `docker logs` — it must
   print `🚗 Mideeye Motors API running` and the `[boot] …` lines showing migrate/seed succeeded.
2. `curl https://<your-domain>/api/health` → `{"status":"ok"}`. If this returns
   HTML, the nginx `/api` proxy isn't active (rebuild the web image).
3. `DATABASE_URL` valid and the `db` service healthy; migrations actually applied (`npx prisma migrate status`).
4. `IMAGEKIT_PUBLIC_KEY`/`IMAGEKIT_PRIVATE_KEY` set — otherwise media routes return a clear 502 (not a 500) but the rest of the app works fine.

---

## ♿ Accessibility & Performance

- Semantic HTML, `aria-label`s on icon buttons, `aria-pressed` on toggles, focus-visible outlines.
- `prefers-reduced-motion` disables animations.
- ImageKit `fo-auto` (automatic AVIF/WebP) + responsive `srcSet` + lazy-loading keep payloads small.
- Route-level page transitions with `AnimatePresence`.

---

_© Mideeye Motors & Rental Car Co. — designed for the road ahead._
