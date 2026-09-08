import 'dotenv/config';

function readEnv() {
  const port = Number(process.env.PORT ?? 4000);
  const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT env var: ${process.env.PORT}`);
  }

  return {
    port,
    clientOrigin,
    isProduction: process.env.NODE_ENV === 'production',
  };
}

export const env = readEnv();
