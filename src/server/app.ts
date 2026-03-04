import express from 'express';
import type { Express, RequestHandler } from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import { DatabaseManager, runMigrations } from './infrastructure/database/index.js';
import { SQLiteSessionStore } from './infrastructure/sessionStore.js';
import { CronManager } from './infrastructure/scheduler/cronManager.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Route factories
import { createAuthRoutes } from './routes/authRoutes.js';
import { createUserRoutes } from './routes/userRoutes.js';
import { createConfigRoutes } from './routes/configRoutes.js';
import { createRunRoutes } from './routes/runRoutes.js';
import { createWeekPlanRoutes } from './routes/weekPlanRoutes.js';
import { createScheduleRoutes } from './routes/scheduleRoutes.js';
import { createAuditRoutes } from './routes/auditRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateAppOptions {
  /** Middleware injected before routes (e.g. test auth injection) */
  preRouteMiddleware?: RequestHandler[];
}

export function createApp(options?: CreateAppOptions): Express {
  // Initialize database and run migrations
  const dbManager = DatabaseManager.getInstance();
  runMigrations(dbManager.getDb());
  logger.info('Database initialized and migrations applied');

  const app = express();

  // Trust proxy (required for secure cookies behind reverse proxy)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Body parsers with explicit limits
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  // Session middleware
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }

  const sessionStore = new SQLiteSessionStore();
  app.use(session({
    store: sessionStore as any,
    secret: sessionSecret ?? 'trainbot-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  }));

  // Session user middleware — attach user to req from session
  app.use((req, _res, next) => {
    if (req.session?.user) {
      req.user = req.session.user;
    }
    next();
  });

  // Inject pre-route middleware (for test auth injection etc.)
  if (options?.preRouteMiddleware) {
    for (const mw of options.preRouteMiddleware) {
      app.use(mw);
    }
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes — split: OAuth redirects at /auth, API endpoints at /api/auth
  const { oauthRouter, authApiRouter } = createAuthRoutes();
  app.use('/auth', oauthRouter);
  app.use('/api/auth', authApiRouter);

  // API routes
  app.use('/api/users', createUserRoutes());
  app.use('/api/config', createConfigRoutes());
  app.use('/api/runs', createRunRoutes());
  app.use('/api/week-plans', createWeekPlanRoutes());
  app.use('/api/schedules', createScheduleRoutes());
  app.use('/api/audit-logs', createAuditRoutes());

  // Serve static files in production (before error handler so SPA fallback works)
  if (process.env.NODE_ENV === 'production') {
    const clientDir = path.resolve(__dirname, '../client');
    app.use(express.static(clientDir));
    // SPA fallback — exclude /api paths to return proper 404s
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  // Error handler (must be after all routes)
  app.use(errorHandler);

  // Start cron scheduler
  CronManager.getInstance().start();

  return app;
}
