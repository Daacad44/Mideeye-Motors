import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Unit tests never touch a real database or ImageKit; these only satisfy
    // the env validation in src/lib/env.ts.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      IMAGEKIT_PUBLIC_KEY: 'test',
      IMAGEKIT_PRIVATE_KEY: 'test',
    },
  },
});
