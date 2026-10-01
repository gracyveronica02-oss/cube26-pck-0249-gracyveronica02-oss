import { buildServer } from '../apps/api/src/server.js';
import {
  InMemoryRepositories,
  InMemoryObjectStorage
} from '@pack-manager/database';
import { seedDemoData } from '../apps/api/src/seed.js';

let serverPromise: Promise<any> | null = null;

async function getServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const repos = new InMemoryRepositories();
      const storage = new InMemoryObjectStorage();

      await seedDemoData(repos, storage);

      const server = buildServer({
        repos,
        storage
      });

      await server.ready();

      return server;
    })();
  }

  return serverPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const server = await getServer();

    server.server.emit('request', req, res);
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'API initialization failed'
        })
      );
    }
  }
}