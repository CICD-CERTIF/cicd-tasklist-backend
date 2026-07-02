import { defineConfig } from "vitest/config";

// On force Prisma à utiliser un fichier SQLite local pendant les tests
process.env.DATABASE_URL = 'file:./test-e2e.db';

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    
    // CORRECTION ICI : On cible directement TOUT ce qui est dans __tests__ sans exception
    include: ["src/__tests__/**/*.{test,spec,}.ts", "src/__tests__/**/*.ts"],
    
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