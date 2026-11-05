import { defineConfig } from "vitest/config";

/** Convex function tests (convex-test). Run with `npm test`. */
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
