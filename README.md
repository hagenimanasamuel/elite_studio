# elite_studio — Elite Images Studio

Photography studio platform for Musanze, Rwanda: a public marketing site with a CMS-managed
landing page, plus an admin dashboard for client galleries, shareable links, users and inquiries.

## Stack

| Layer   | Tech |
|---------|------|
| Backend | Node.js + Express 5, MySQL (mysql2), Multer uploads, JWT auth (httpOnly cookies), Archiver (ZIP) |
| Frontend | React 19 + Vite, Tailwind v4, Framer Motion, React Router 7 |

## Quick Start

```bash
# 1. Backend — requires a running MySQL server
cd backend
cp .env.example .env        # fill in DB credentials + secrets
npm install
npm run dev                 # creates all tables + seeds the admin user on boot

# 2. Frontend
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Login at `/login` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the backend `.env`.

## Features

### Client Galleries (Upload & Share)
- Upload **up to 100 images per gallery** (15 MB each; JPEG/PNG/WebP/GIF/AVIF)
- Every gallery gets a public link: `https://your-site/g/<token>`
- Access conditions per gallery:
  - **Read only** or **read + download** (per-image and full-ZIP downloads)
  - **Password protection** (optional, bcrypt-hashed) — combine with either access mode
  - **Expiry date** — link dies automatically after the chosen date
  - **Max views** — locks after N opens
  - **Delete after first view** — self-destructs once opened
  - **Delete after first download** — erases everything after one download completes
- Share links can be regenerated at any time (old link instantly invalid)
- Views/downloads are counted per gallery and per image, with IP + agent logs

### Landing Page Gallery (admin managed)
- Admins upload portfolio photos in **Dashboard → Gallery Management**
- Captions + categories per photo, ordering, show/hide toggle
- Published photos appear in the landing-page Gallery section instantly

### CMS (Dashboard → CMS)
- Edit Hero (rotating keywords, stats, CTAs), About, Services, Testimonials,
  Contact details & hours, and Footer social links
- Changes publish live to the public site on save; sections can be reset to defaults

### Also included
- Dashboard analytics: galleries, views, downloads, storage used, 7-day view trend
- User management (super_admin / admin / staff roles; staff can only use Upload & Share)
- Booking inquiry inbox from the public contact form
- Password reset codes via SMTP (optional — works without a mail server in dev)

## Project Layout

```
backend/            Express API (server.js is the entry point)
  ├── controllers/  auth, users, contact, galleries, share, content, stats
  ├── middleware/   auth guards, multer upload pipeline, error handler
  ├── routes/       mounted under /api/*
  └── config/dbConfig.js  schema auto-creation + admin seed

frontend/src/
  ├── components/sections/   landing page sections (CMS-driven)
  ├── pages/dashboard/       admin dashboard (lazy-loaded routes)
  ├── pages/ShareViewer.jsx  public /g/:token gallery viewer
  └── context/               AuthContext + SiteContentContext (CMS)
```
