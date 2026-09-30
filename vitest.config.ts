import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@pack-manager/config': path.resolve(__dirname, './packages/config/src/index.ts'),
      '@pack-manager/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
      '@pack-manager/domain': path.resolve(__dirname, './packages/domain/src/index.ts'),
      '@pack-manager/database': path.resolve(__dirname, './packages/database/src/index.ts'),
      '@pack-manager/vision': path.resolve(__dirname, './packages/vision/src/index.ts'),
      '@pack-manager/worker': path.resolve(__dirname, './apps/worker/src/index.ts'),
      '@pack-manager/api': path.resolve(__dirname, './apps/api/src/index.ts'),
    },
  },
});
