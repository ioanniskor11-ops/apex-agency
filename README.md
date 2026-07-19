# ── Apex Agency — README ────────────────────────────────────

# Apex Agency 🚀

The world's most trusted growth partner for premium brands.

A full-stack marketing website built with **Eleventy (11ty)**, **Tailwind CSS**, **Express.js**, **PostgreSQL**, and **Redis**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Eleventy (11ty), Liquid, Tailwind CSS |
| **Backend** | Express.js, Node.js 18+ |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Email** | Nodemailer (SendGrid/MailHog for dev) |
| **Security** | Helmet, hCaptcha, CSRF, Rate Limiting |
| **Validation** | Zod (backend), Joi (forms) |
| **Deployment** | Vercel / Netlify / Docker |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/apexagency/website
cd apex-agency
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your settings

# 3. Start services with Docker
docker-compose up -d

# 4. Start development
npm run dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend (8080) and backend (3000) |
| `npm run dev:frontend` | Start Eleventy dev server only |
| `npm run dev:backend` | Start Express API server only |
| `npm run build` | Build frontend + backend |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run lint` | Lint all code |

## Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build

# Stop
docker-compose down

# Full reset (destroys volumes)
docker-compose down -v
```

### Services (Docker)

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| MailHog UI | 8025 | http://localhost:8025 |

## Project Structure

```
apex-agency/
├── _data/              # Global data files (YAML)
│   ├── site.yml
│   ├── navigation.yml
│   ├── services.yml
│   ├── team.yml
│   ├── testimonials.yml
│   ├── case_studies.yml
│   └── trust_badges.yml
├── _includes/          # Liquid partials
│   ├── header.liquid
│   ├── footer.liquid
│   └── cookie-banner.liquid
├── _layouts/           # Page layouts
│   ├── default.liquid
│   ├── page.liquid
│   ├── blog.liquid
│   ├── work.liquid
│   └── post.liquid
├── _src/               # Backend source
│   ├── server/
│   │   ├── index.js    # Express server entry
│   │   └── build.js    # Production build script
│   ├── routes/
│   │   ├── contact.js
│   │   ├── blog.js
│   │   └── newsletter.js
│   └── db/
│       ├── index.js    # Database client
│       └── schema.sql  # PostgreSQL schema
├── assets/
│   ├── css/
│   │   ├── main.css    # Full styles (Tailwind)
│   │   └── critical.css # Inlined critical CSS
│   └── js/
│       └── main.js     # Vanilla JS bundle
├── pages/              # Page templates
│   ├── index.liquid    # Homepage
│   ├── services.liquid
│   ├── work.liquid
│   ├── about.liquid
│   ├── contact.liquid
│   ├── blog.liquid
│   ├── case-study-detail.liquid
│   └── posts/          # Blog posts (Markdown)
│       ├── growthos-framework.md
│       └── premium-brand-paradox.md
├── .eleventy.js        # Eleventy config
├── tailwind.config.js
├── postcss.config.js
├── vercel.json         # Vercel deployment config
├── netlify.toml        # Netlify deployment config
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check ✓ |
| `POST` | `/api/contact` | Submit contact form |
| `GET` | `/api/contact/verify` | Verify contact email |
| `GET` | `/api/blog` | List blog posts |
| `GET` | `/api/blog/:slug` | Get single post |
| `POST` | `/api/newsletter` | Subscribe to newsletter |
| `GET` | `/api/newsletter/confirm` | Confirm subscription |

## Environment Variables

See `.env.example` for all available variables.

## Security Features

- ✅ Content Security Policy (CSP)
- ✅ HTTP Strict Transport Security (HSTS)
- ✅ X-Frame-Options DENY
- ✅ X-Content-Type-Options nosniff
- ✅ Referrer-Policy strict
- ✅ Rate limiting (global + per-endpoint)
- ✅ hCaptcha integration
- ✅ Input sanitization (Zod validation + HTML sanitize)
- ✅ CSRF protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ Double opt-in email confirmation

## Performance

- ✅ Critical CSS inlined in `<head>`
- ✅ Async CSS loading with `preload`
- ✅ Lazy loading images
- ✅ Redis caching for API responses
- ✅ CDN-friendly asset hashing
- ✅ Minified HTML in production
- ✅ Brotli + Gzip compression

## Accessibility

- ✅ WCAG 2.1 AA+ compliance
- ✅ Semantic HTML structure
- ✅ ARIA labels and roles
- ✅ Skip to main content link
- ✅ Keyboard navigation
- ✅ Focus management in modals
- ✅ prefers-reduced-motion support

---

Built with ❤️ by Apex Agency
