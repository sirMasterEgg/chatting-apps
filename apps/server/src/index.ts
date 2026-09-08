import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';
import { env } from './config/env.js';

// A single bad payload or an unexpected async rejection anywhere in the
// process must not take the whole server down. Log loudly instead of
// crashing so other rooms/sockets keep working; a real, reproducible bug
// should still be visible in these logs for someone to fix.
process.on('uncaughtException', (err) => {
   
  console.error('[server] uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
   
  console.error('[server] unhandled rejection:', reason);
});

const app = createApp();
const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.port, () => {
   
  console.log(`[server] listening on http://localhost:${env.port}`);
});
