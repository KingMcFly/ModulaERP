import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'crypto';
import 'dotenv/config';

// ── A05: Validate required env vars at startup — fail fast, don't limp along ──
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
// A02: Enforce a minimum JWT_SECRET length (32 chars = 256 bits)
if (process.env.JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET must be at least 32 characters (use a random 64-hex string)');
  process.exit(1);
}

import authRouter          from './routes/auth.js';
import assetsRouter        from './routes/assets.js';
import loansRouter         from './routes/loans.js';
import maintenanceRouter   from './routes/maintenance.js';
import personnelRouter     from './routes/personnel.js';
import monitoringRouter    from './routes/monitoring.js';
import suppliesRouter      from './routes/supplies.js';
import adminTenantsRouter  from './routes/admin/tenants.js';
import adminModulesRouter  from './routes/admin/modules.js';
import adminUsersRouter    from './routes/admin/users.js';
import adminSettingsRouter from './routes/admin/settings.js';
import catalogRouter       from './routes/catalog.js';
import notificationsRouter from './routes/notifications.js';
import reportsRouter       from './routes/reports.js';
import dashboardRouter     from './routes/dashboard.js';
import activityLogsRouter  from './routes/activity-logs.js';
import importsRouter       from './routes/imports.js';
import attachmentsRouter   from './routes/attachments.js';
import providersRouter     from './routes/providers.js';
import purchasesRouter     from './routes/purchases.js';
import requestsRouter      from './routes/requests.js';
import contractsRouter     from './routes/contracts.js';
import ticketsRouter       from './routes/tickets.js';
import costCentersRouter   from './routes/cost-centers.js';
import usersRouter         from './routes/users.js';
import cronRouter          from './routes/cron.js';
import lookupRouter        from './routes/lookup.js';
import registerRouter      from './routes/register.js';
import statusRouter        from './routes/status.js';
import db from './db.js';

// ── A09: Bootstrap audit log table (runs once on startup) ─────────────────────
db.query(`
  CREATE TABLE IF NOT EXISTS security_audit_log (
    id         BIGSERIAL PRIMARY KEY,
    event      VARCHAR(64)  NOT NULL,
    user_id    INTEGER,
    tenant_id  INTEGER,
    ip_address VARCHAR(45),
    request_id VARCHAR(36),
    meta       JSONB,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[DB] audit log table init failed:', err.message));

db.query(`
  CREATE INDEX IF NOT EXISTS idx_audit_event      ON security_audit_log (event);
  CREATE INDEX IF NOT EXISTS idx_audit_user       ON security_audit_log (user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_tenant     ON security_audit_log (tenant_id);
  CREATE INDEX IF NOT EXISTS idx_audit_created_at ON security_audit_log (created_at);
`).catch(() => {/* indexes non-fatal */});

// ── Security: 2FA (TOTP) columns + multi-device session tracking ──────────────
db.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(64);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
`).catch(err => console.error('[DB] 2FA columns init failed:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id           BIGSERIAL PRIMARY KEY,
    session_id   VARCHAR(64) UNIQUE NOT NULL,
    user_id      INTEGER     NOT NULL,
    user_agent   TEXT,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('[DB] user_sessions table init failed:', err.message));

db.query(`
  CREATE INDEX IF NOT EXISTS idx_sessions_user    ON user_sessions (user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_session ON user_sessions (session_id);
`).catch(() => {/* indexes non-fatal */});

// ── Regional / platform settings (single-row config) ──────────────────────────
db.query(`
  CREATE TABLE IF NOT EXISTS system_settings (
    id          INT PRIMARY KEY,
    locale      VARCHAR(10) NOT NULL DEFAULT 'es-CL',
    timezone    VARCHAR(64) NOT NULL DEFAULT 'America/Santiago',
    currency    VARCHAR(8)  NOT NULL DEFAULT 'CLP',
    date_style  VARCHAR(10) NOT NULL DEFAULT 'medium',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
  .then(() => db.query(`INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`))
  .catch(err => console.error('[DB] system_settings init failed:', err.message));

const app = express();

// Trust Vercel/proxy headers so req.ip resolves correctly (needed for rate limiting)
app.set('trust proxy', 1);

// ── A09: X-Request-ID — correlate logs across services ────────────────────────
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || randomBytes(8).toString('hex');
  next();
});

// ── A05: Security headers ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"], // kept for API docs/admin UIs
      imgSrc:         ["'self'", 'data:', 'blob:'],
      connectSrc:     ["'self'"],
      fontSrc:        ["'self'"],
      objectSrc:      ["'none'"],
      baseUri:        ["'none'"],              // A01: prevent base tag injection
      frameAncestors: ["'none'"],              // A01: clickjacking prevention
      formAction:     ["'self'"],              // A01: restrict form submissions
    },
    reportOnly: false,
  },
  crossOriginEmbedderPolicy: false,
  // Strict-Transport-Security included by helmet by default (HSTS)
}));

// A05: Remove X-Powered-By (already done by helmet, explicit for clarity)
app.disable('x-powered-by');

// ── A05: CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin (no origin header) and server-to-server calls
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origen no permitido'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
}));

// ── A05: Body parsing limits — prevent DoS via large payloads ─────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── A05: Static uploads (no directory listing, no dotfiles) ───────────────────
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads', {
  dotfiles: 'deny',
  index: false,
}));

app.use('/public', express.static(new URL('../public', import.meta.url).pathname, {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d',
}));

// ── A07: Global rate limiter — defense against scraping and DoS ───────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta más tarde.' },
  keyGenerator: (req) => req.ip,
});
app.use('/api', globalLimiter);

// ── A07: Tighter rate limit for mutation endpoints ────────────────────────────
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  keyGenerator: (req) => req.ip,
  message: { error: 'Demasiadas escrituras. Intenta más tarde.' },
});
app.use('/api', writeLimiter);

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/assets',        assetsRouter);
app.use('/api/loans',         loansRouter);
app.use('/api/maintenance',   maintenanceRouter);
app.use('/api/personnel',     personnelRouter);
app.use('/api/monitoring',    monitoringRouter);
app.use('/api/supplies',      suppliesRouter);
app.use('/api/admin/tenants', adminTenantsRouter);
app.use('/api/admin/modules', adminModulesRouter);
app.use('/api/admin/users',   adminUsersRouter);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/catalog',        catalogRouter);
app.use('/api/notifications',  notificationsRouter);
app.use('/api/reports',        reportsRouter);
app.use('/api/dashboard',      dashboardRouter);
app.use('/api/activity-logs',  activityLogsRouter);
app.use('/api/import',         importsRouter);
app.use('/api/attachments',    attachmentsRouter);
app.use('/api/providers',      providersRouter);
app.use('/api/purchases',      purchasesRouter);
app.use('/api/requests',       requestsRouter);
app.use('/api/contracts',      contractsRouter);
app.use('/api/tickets',        ticketsRouter);
app.use('/api/cost-centers',   costCentersRouter);
app.use('/api/users',          usersRouter);
app.use('/api/cron',           cronRouter);
app.use('/api/lookup',         lookupRouter);
app.use('/api/register',       registerRouter);
app.use('/api/status',         statusRouter);

// ── A05: Health check — also pings DB so OpenStatus can detect DB outages ─────
app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// ── A05: Security contact disclosure (RFC 9116) ───────────────────────────────
app.get('/.well-known/security.txt', (_req, res) => {
  res.type('text/plain').send([
    'Contact: mailto:security@fbcore.cloud',
    'Preferred-Languages: es, en',
    `Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}`,
    'Policy: https://fbcore.cloud/security-policy',
  ].join('\n'));
});

// ── A05: Error handler — no stack traces exposed to clients ───────────────────
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const rid = req.id || '-';
  console.error(`[${new Date().toISOString()}][${rid}] ${req.method} ${req.path} → ${status}: ${err.message}`);
  if (status === 500) {
    res.status(500).json({ error: 'Error interno del servidor', request_id: rid });
  } else {
    res.status(status).json({ error: err.message });
  }
});

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`FB Core API running on port ${PORT}`));
}

export default app;
