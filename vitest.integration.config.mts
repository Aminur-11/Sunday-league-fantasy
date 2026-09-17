import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/fantasy7_test?schema=public",
    },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(
        import.meta.dirname,
        "./src/lib/__tests__/__stubs__/server-only-stub.ts",
      ),
    },
  },
});
