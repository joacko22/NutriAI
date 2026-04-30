import 'express-async-errors';
import express       from 'express';
import cors          from 'cors';
import helmet        from 'helmet';
import pinoHttp      from 'pino-http';
import { config }    from './config';
import { errorHandler } from './shared/middleware/error.middleware';
import { authRouter }    from './modules/auth/auth.router';
import { profileRouter } from './modules/profile/profile.router';
import { chatRouter }    from './modules/chat/chat.router';
import { plansRouter }   from './modules/plans/plans.router';
import { recordsRouter } from './modules/records/records.router';

export function createApp() {
  const app = express();

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin:      config.clientUrl,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // ── Parsing ───────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ───────────────────────────────────────────────────────────────
  app.use(pinoHttp({ quietReqLogger: true }));

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      ts:     new Date().toISOString(),
      env:    config.nodeEnv,
    });
  });

  // ── API routes ────────────────────────────────────────────────────────────
  app.use('/api/v1/auth',    authRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/chat',    chatRouter);
  app.use('/api/v1/plans',   plansRouter);
  app.use('/api/v1/records', recordsRouter);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: { message: 'Ruta no encontrada', code: 'NOT_FOUND' } });
  });

  // ── Error handler (siempre al final) ──────────────────────────────────────
  app.use(errorHandler);

  return app;
}
