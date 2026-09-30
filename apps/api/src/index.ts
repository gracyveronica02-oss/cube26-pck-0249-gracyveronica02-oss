export * from './server.js';
export * from './middleware/auth.js';
export * from './middleware/idempotency.js';

import { buildServer } from './server.js';
import { InMemoryRepositories, InMemoryObjectStorage } from '@pack-manager/database';
import { seedDemoData } from './seed.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  const repos = new InMemoryRepositories();
  const storage = new InMemoryObjectStorage();

  seedDemoData(repos, storage).then(() => {
    const server = buildServer({ repos, storage });
    server.listen({ port: PORT, host: HOST }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Pack Manager API server listening at ${address}`);
      console.log(`OpenAPI documentation available at ${address}/documentation`);
    });
  }).catch((err) => {
    console.error('Failed to seed demo data', err);
  });
}
