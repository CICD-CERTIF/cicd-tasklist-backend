import { defineConfig } from "vitest/config";

// On force Prisma à utiliser un fichier SQLite local pendant les tests
process.env.DATABASE_URL = 'file:./test-e2e.db';

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // include: ["src/__tests__/**/*.test.ts"],
    include: ['src/__tests__/e2e/**/*.test.ts'],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/__tests__/**",
        "src/server.ts",
        "src/app.ts",          
        "src/lib/prisma.ts",   
        "src/routes/**",       
        "**/*.config.ts",
      ],
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "reports/junit.xml",
    },
  },
});