// ── Apex Agency — Express Server ────────────────────────────
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const requestId = require('express-request-id');
const path = require('path');
const { initializeDatabase, healthCheck, shutdown } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Trust proxy (for rate limiting behind Vercel/Netlify) ──
app.set('trust proxy', 1);

// ── Security Headers ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://www.googletagmanager.com', 'https://hcaptcha.com', 'https://*.hcaptcha.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https://images.ctfassets.net', 'https://*.cloudinary.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://api.apexagency.com', 'https://hcaptcha.com', 'https://*.hcaptcha.com'],
      frameSrc: ['https://hcaptcha.com', 'https://*.hcaptcha.com', 'https://calendly.com'],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: { nosniff: true },
  xDnsPrefetchControl: { allow: false },
  xDownloadOptions: { noopen: true },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400,
}));

// ── Compression ────────────────────────────────────────────
app.use(compression({
  level: 6,
  threshold: 1024,
  brotli: true,
}));

// ── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Cookie Parser ──────────────────────────────────────────
app.use(cookieParser(process.env.SESSION_SECRET));

// ── Request ID ─────────────────────────────────────────────
app.use(requestId());

// ── Request Logger ─────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' || res.statusCode >= 400) {
      console.log(`[${req.id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// ── Rate Limiters ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 60000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const contactLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/contact', contactLimiter);

// ── Static Files (for production API server) ──────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../_site')));
}

// ── Routes ────────────────────────────────────────────────
const contactRoutes = require('./routes/contact');
const blogRoutes = require('./routes/blog');
const newsletterRoutes = require('./routes/newsletter');

app.use('/api/contact', contactRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/newsletter', newsletterRoutes);

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const status = await healthCheck();
  const healthy = status.postgres && status.redis;
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: status,
    uptime: process.uptime(),
  });
});

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    requestId: req.id,
  });
});

// ── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[${req.id}] Error:`, err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      requestId: req.id,
    });
  }

  // Joi validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details,
      requestId: req.id,
    });
  }

  // CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      requestId: req.id,
    });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    requestId: req.id,
  });
});

// ── Start Server ───────────────────────────────────────────
async function startServer() {
  try {
    // Initialize database
    if (process.env.NODE_ENV !== 'test') {
      await initializeDatabase();
    }

    app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
      console.log(`\n  🚀  Apex Agency API Server`);
      console.log(`  ─────────────────────────`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  URL:         http://localhost:${PORT}`);
      console.log(`  Health:      http://localhost:${PORT}/api/health`);
      console.log(`\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// ── Graceful Shutdown ──────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('\n[SIGTERM] Shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n[SIGINT] Shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

// ── Start ──────────────────────────────────────────────────
if (require.main === module) {
  startServer();
}

module.exports = app;
