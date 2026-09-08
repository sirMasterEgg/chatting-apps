import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      // Restricted to CLIENT_ORIGIN only - never '*' in production.
      origin: env.clientOrigin,
    }),
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  return app;
}
