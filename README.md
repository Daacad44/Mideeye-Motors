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

### Admin credentials (from seed)
```
email:    admin@mideeyemotors.com
password: admin1234
```
Visit `/admin` for fleet + Cloudinary media management, `/dashboard` for the renter view.

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
| POST   | `/api/auth/register` · `/login` · GET `/me` | JWT auth |

Responses are cached in Redis for 60s where useful and invalidated on write.

---

## 🌍 Deploying to Coolify

1. Create a **Docker Compose** resource pointing at this repo's `docker-compose.yml`.
2. Set env vars in Coolify: `POSTGRES_*`, `JWT_SECRET`, `CLOUDINARY_*`, `VITE_API_URL` (your public API URL), `CORS_ORIGIN` (your web URL).
3. Deploy. The API auto-runs `prisma migrate deploy` (falls back to `db push`) on boot.
4. Seed once from a shell: `npm --prefix backend run seed`.

---

## ♿ Accessibility & Performance

- Semantic HTML, `aria-label`s on icon buttons, `aria-pressed` on toggles, focus-visible outlines.
- `prefers-reduced-motion` disables animations.
- Cloudinary `f_auto,q_auto` + responsive `srcSet` + lazy-loading keep payloads small.
- Route-level page transitions with `AnimatePresence`.

---

_© Mideeye Motors & Rental Car Co. — designed for the road ahead._
