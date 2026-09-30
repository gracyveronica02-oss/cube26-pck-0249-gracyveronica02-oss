import type { IncomingMessage, ServerResponse } from 'node:http';
import { InMemoryObjectStorage, InMemoryRepositories } from '@pack-manager/database';
import { buildServer } from '../apps/api/src/server.js';
import { seedDemoData } from '../apps/api/src/seed.js';

let serverPromise: ReturnType<typeof createServer> | undefined;

async function createServer() {
  const repos = new InMemoryRepositories();
  const storage = new InMemoryObjectStorage();
  await seedDemoData(repos, storage);

  const server = buildServer({ repos, storage });
  await server.ready();
  return server;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    serverPromise ??= createServer();
    const server = await serverPromise;
    server.routing(req, res);
  } catch (error) {
    serverPromise = undefined;
    console.error('Failed to initialize Pack Manager API', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'API_INITIALIZATION_FAILED' }));
    }
  }
}
