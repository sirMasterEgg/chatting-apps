import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';
import { env } from './config/env.js';

const app = createApp();
const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${env.port}`);
});
