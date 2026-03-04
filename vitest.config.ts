import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/server/__tests__/**/*.test.ts'],
    setupFiles: ['src/server/__tests__/setup.ts'],
    pool: 'forks',
  },
});
