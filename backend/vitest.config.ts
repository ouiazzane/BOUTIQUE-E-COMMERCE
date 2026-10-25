import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['**/*.js', 'dist/**', 'node_modules/**'],
    hookTimeout: 120000,
    testTimeout: 120000,
    setupFiles: ['./tests/setup.ts']
  }
});
