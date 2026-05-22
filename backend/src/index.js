import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import 'dotenv/config';

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

const app = express();

// Trust Vercel/proxy headers so req.ip resolves correctly (needed for rate limiting)
app.set('trust proxy', 1);

// ── Security headers (A05) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS (A05) ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origen no permitido'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing — tamaño reducido para prevenir DoS (A05) ─────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Archivos estáticos de uploads (A05) ───────────────────────────────────
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads', {
  dotfiles: 'deny',
  index: false,
}));

// ── Rate limiting global (A07) ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta más tarde.' },
});
app.use('/api', globalLimiter);

// ── Rutas ──────────────────────────────────────────────────────────────────
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

// Health — sin información sensible del servidor (A05)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Error handler global — no expone detalles internos (A05, A09) ──────────
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  // Log con contexto pero sin stack en respuesta
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}:`, err.message);
  if (status === 500) {
    res.status(500).json({ error: 'Error interno del servidor' });
  } else {
    res.status(status).json({ error: err.message });
  }
});

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`FB Core API running on port ${PORT}`));
}

export default app;
