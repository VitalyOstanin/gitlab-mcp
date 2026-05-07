import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Cap worker pool tightly — tests run alongside the user's other work,
    // and saturating CPU has frozen the machine before. Keep this low.
    maxWorkers: '10%',
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/server.ts',
      ],
      reportsDirectory: 'coverage',
      // Coverage thresholds are intentionally a low floor while the test
      // surface is just `src/utils/date.ts`. Raise these as new test files
      // land (mappers, gitlab-version, tool-response are obvious next
      // targets).
      thresholds: {
        statements: 1,
        branches: 1,
        functions: 1,
        lines: 1,
      },
    },
  },
});
