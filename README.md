# 🚗 Mideeye Motors & Rental Car Co.

A premium, enterprise-grade luxury car-rental platform. Apple-level design, Tesla/BMW-inspired UI, and a fully dynamic **Cloudinary-driven** image pipeline where the frontend reflects any image change with **zero code edits**.

> Full redesign of the Mideeye Motors experience — hero, fleet, vehicle details, booking flow, user & admin dashboards — built as a real full-stack monorepo.

---

## ✨ Highlights

- **World-class UI/UX** — glassmorphism, floating search card, soft shadows, rounded corners, premium `Sora`/`Inter` typography, and Framer Motion micro-interactions throughout.
- **Cloudinary as the single source of truth for images.** Vehicles store only Cloudinary `publicId`s; every URL (thumbnail → hero → lightbox) is derived on the fly. Re-upload to the same `publicId` and the whole site updates instantly.
- **Automatic galleries** — image carousel, thumbnail navigation, fullscreen lightbox with keyboard nav and zoom, all generated from a vehicle's gallery array.
- **Responsive & accessible** — pixel-perfect from mobile to desktop, focus-visible rings, reduced-motion support, semantic landmarks, `srcSet`/lazy-loading for performance.
- **Full backend** — Express + Prisma (PostgreSQL) + Redis cache + JWT auth + Cloudinary upload/sign/delete.
- **Containerised** — Dockerfiles + `docker-compose.yml`, ready for Coolify.

---

## 🧱 Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion, lucide-react, React Router 7 |
| Backend    | Node.js, Express, TypeScript, Prisma ORM, Zod |
| Database   | PostgreSQL |
| Cache      | Redis (optional, degrades gracefully) |
| Media      | **Cloudinary** (single image source of truth) |
| Auth       | JWT + bcrypt |
| Deploy     | Docker, docker-compose, Coolify |

> **Note on "Next.js Image":** the brief mentioned it, but the chosen stack is **Vite + React**. The equivalent has been implemented as a first-class `VehicleImage` component (`frontend/src/components/VehicleImage.tsx`) that does automatic resizing, format negotiation (AVIF/WebP), compression, responsive `srcSet`, blur-up placeholders and native lazy-loading — all via Cloudinary transformations.

---

## 📁 Structure

```
mideeye-motors/
├── frontend/                 # React 19 + Vite SPA
│   ├── src/
│   │   ├── lib/cloudinary.ts # ⭐ dynamic URL builder (the core image engine)
│   │   ├── components/        # Navbar, Footer, VehicleImage, VehicleCard, Lightbox…
│   │   ├── components/home/   # Hero, SearchCard, Featured, Categories, Testimonials…
│   │   ├── pages/             # Home, Fleet, VehicleDetails, Booking, Admin, Dashboard…
│   │   ├── data/vehicles.ts   # 9-vehicle seed / offline fallback
│   │   └── types/vehicle.ts
│   ├── Dockerfile + nginx.conf
├── backend/                  # Express + Prisma API
│   ├── prisma/schema.prisma  # Vehicle / VehicleImage / User / Booking
│   ├── prisma/seed.ts        # seeds the 9 vehicles + admin user
│   ├── src/lib/              # cloudinary, prisma, redis, env
│   ├── src/routes/           # vehicles, auth, upload, bookings
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## ☁️ How the Cloudinary "auto-update, no code changes" works

1. Each vehicle record stores **publicIds only** — `heroImage`, `coverImage`, `thumbnail`, `cloudinaryPublicId`, and a `gallery[]` of `{ publicId, alt, tag }`.
2. The frontend never hardcodes a URL. `cld(publicId, { width, crop, quality:'auto', format:'auto' })` builds the delivery URL at render time.
3. Because URLs key on the **publicId** (not an immutable versioned URL), re-uploading an image to the same publicId in Cloudinary makes the new image appear **everywhere at once** — hero, cards, details, booking summary, dashboards — with no redeploy.
4. The admin panel (`/admin`) uploads straight into a vehicle's Cloudinary folder and appends the returned publicId; the UI updates live.

The 9 seeded vehicles reference publicIds under `mideeye-motors/<slug>/…`. Until real studio photos are uploaded to those ids, `VehicleImage` shows an on-brand silhouette placeholder so the layout is always intact.

### Supported per-vehicle images
`hero`, `cover`, `thumb`, plus gallery tags: `front`, `rear`, `side`, `interior`, `dashboard`, `wheel`, `engine` — and unlimited additional gallery images.

---

## 🚀 Getting Started

### 1. Prerequisites
Node 20+, and either Docker **or** a local PostgreSQL (Redis optional).

### 2. Environment
```bash
cp .env.example .env            # fill in Cloudinary + DB creds
cp .env.example frontend/.env   # set VITE_API_URL + VITE_CLOUDINARY_CLOUD_NAME
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
npx prisma db push        # create tables
npm run seed              # seed 9 vehicles + admin
npm run dev               # http://localhost:4000

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
Passwords are hashed with bcrypt (cost 12). Sign in at `/login`, then `/admin`
opens the tabbed dashboard (Media Library · Fleet · Team & Roles · Audit Log).
`/dashboard` is the renter view.

---

## 🔌 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/vehicles` | List (supports `?featured=true`, `?category=SUV`) |
| GET    | `/api/vehicles/:slug` | Single vehicle + gallery |
| PATCH  | `/api/vehicles/:id` | Update pricing / featured / availability / hero / cover *(admin)* |
| PUT    | `/api/vehicles/:id/gallery` | Replace & reorder gallery *(admin)* |
| POST   | `/api/upload` | Upload image → Cloudinary, returns `publicId` |
| POST   | `/api/upload/sign` | Signature for direct browser uploads *(admin)* |
| DELETE | `/api/upload/:publicId` | Remove image from Cloudinary *(admin)* |
| POST   | `/api/bookings` | Create a booking (server-side price calc) |
| POST   | `/api/auth/register` · `/login` · `/refresh` · `/logout` · GET `/me` | JWT access + rotating refresh cookie |
| GET/POST | `/api/media` | List (search/filter/folder) · multi-upload → Cloudinary + metadata *(staff+)* |
| PATCH/PUT/DELETE | `/api/media/:id` · `/:id/replace` · bulk `/media/bulk-delete` | Rename/reorder/hero-cover · replace · delete (Cloudinary + DB) |
| GET/POST | `/api/admin/users` | List · create staff/manager/admin *(super admin)* |
| PATCH/POST/DELETE | `/api/admin/users/:id/role · /status · /reset-password` | Assign role · suspend · reset · delete *(super admin)* |
| GET | `/api/admin/audit` | Recent audit log *(admin+)* |

Responses are cached in Redis for 60s where useful and invalidated on write.

---

## 🩺 Troubleshooting: Login shows "Failed to fetch"

This means the **browser can't reach the API** — it is not a bug in the auth
code (login/register/refresh/JWT are verified working end-to-end). Check:

1. **Is the API running?** `curl http://localhost:4000/api/health` → `{"status":"ok"}`.
2. **`VITE_API_URL`** in the web app must point at the API's public URL
   (e.g. `http://localhost:4000/api`, or your deployed API origin). It is baked
   at build time — rebuild the frontend after changing it.
3. **`CORS_ORIGIN`** on the API must include the web app's origin (credentials
   are sent for the refresh cookie).
4. **Database** must be reachable (`DATABASE_URL`) and migrated + seeded
   (`npx prisma db push && npm run seed`).

The app now surfaces meaningful messages instead of "Failed to fetch":
*Invalid email or password* · *Network connection failed — cannot reach the
server* · *Too many attempts* · *Server error* · *Your session has expired*.

## ✅ Verified locally (this build)
Against a real Postgres 16 + the API, driven in a headless browser:
Super-Admin login → `/admin` dashboard loads · register · refresh · `/me` ·
protected routes 401 without a token · wrong password → "Invalid email or
password" · a Cloudinary upload with bad keys returns a clear 502 **without
crashing the server** · the official logo renders as an `<img>` from
`/api/branding` (no text recreation).

## 🖼️ Official logo policy

The official Mideeye Motors logo is **never** recreated, vectorized, drawn in
CSS/SVG, or replaced with text. The `Logo` component renders **only** the real
PNG, resolved dynamically:

1. **Upload once** via the Admin Media Manager into the **`mideeye-motors/brand`**
   folder (there's a one-click "🏷️ brand" preset on the dropzone).
2. The public **`GET /api/branding`** endpoint returns that image; the frontend
   uses its `secure_url` in the **navbar, footer, login/register, dashboard,
   admin, booking confirmation, loading screen, favicon and PWA manifest** —
   everywhere, with zero code changes.
3. If no logo has been uploaded yet, the space is reserved with a transparent
   placeholder — **never** a fake wordmark or badge.

(`VITE_LOGO_PUBLIC_ID`, default `mideeye-motors/brand/logo`, is the fallback
Cloudinary publicId when the branding API is unavailable.)

> I cannot inject the chat-uploaded PNG's bytes into the repo/Cloudinary
> myself — upload it once via the dashboard and it propagates automatically.

## 🗂️ Admin Media Manager (`/admin` → Media Library)

The single place administrators manage images. Drag-and-drop / multi-upload with
progress, search + folder filter, per-item **copy URL / copy publicId / replace /
rename / delete**, and **bulk select + bulk delete**. Every upload flows
`Dashboard → API → Cloudinary → PostgreSQL metadata → frontend`. Cloudinary
auto-serves WebP/AVIF (`f_auto`) and compresses (`q_auto`); no local storage,
ever. Deletes remove both the Cloudinary asset and the DB row (no orphans).

## 🔐 Roles, security & audit

- **RBAC** — `SUPER_ADMIN › ADMIN › MANAGER › STAFF › CUSTOMER` with a rank
  hierarchy. Only the Super Admin can create/suspend/delete admins, assign roles
  and reset passwords; Super Admin accounts are protected from modification.
- **Auth** — short-lived JWT access tokens + rotating httpOnly refresh cookies;
  suspended accounts are blocked and their tokens revoked.
- **Hardening** — Helmet headers, per-window rate limiting (stricter on `/auth`),
  CORS with credentials, Zod validation on every mutation.
- **Audit log** — every privileged action (media upload/replace/delete, user
  create/suspend/role-change, password reset) is recorded with actor + IP.

---

## 🌍 Deploying to Coolify

**The web and API are same-origin in production:** the web container's nginx
reverse-proxies `/api` → the internal `api` service, and the SPA is built with
`VITE_API_URL=/api`. This removes CORS, mixed-content (HTTPS→HTTP) and
wrong-host failures — the browser only ever talks to the web domain.

1. Create a **Docker Compose** resource pointing at this repo's `docker-compose.yml`.
2. Set env vars in Coolify: `POSTGRES_*`, `JWT_SECRET`, `CLOUDINARY_*`.
   You do **not** need to set `VITE_API_URL` (defaults to `/api`) or `CORS_ORIGIN`
   (defaults to reflect) for the single-compose deploy.
3. Expose only the **web** service's port 80 to your domain; the `api` service
   stays internal (`expose`) and is reached via the nginx proxy.
4. Deploy. On boot the API runs `prisma migrate deploy` (falls back to
   `db push`) **and seeds the Super Admin idempotently**, so login works
   immediately — no manual seed step.

> **Deploying web + API as two separate services instead?** Then there's no
> shared network for the nginx proxy: set `VITE_API_URL` to the API's public
> **https** URL and `CORS_ORIGIN` to the web URL.

### Login shows "cannot reach the server"? Check, in order:
1. Is the **api** container running (not crash-looping)? `docker logs` — it must
   print `🚗 Mideeye Motors API running`. (The entrypoint is `dist/src/index.js`.)
2. `curl https://<your-domain>/api/health` → `{"status":"ok"}`. If this returns
   HTML, the nginx `/api` proxy isn't active (rebuild the web image).
3. `DATABASE_URL` valid and the `db` service healthy.

---

## ♿ Accessibility & Performance

- Semantic HTML, `aria-label`s on icon buttons, `aria-pressed` on toggles, focus-visible outlines.
- `prefers-reduced-motion` disables animations.
- Cloudinary `f_auto,q_auto` + responsive `srcSet` + lazy-loading keep payloads small.
- Route-level page transitions with `AnimatePresence`.

---

_© Mideeye Motors & Rental Car Co. — designed for the road ahead._
