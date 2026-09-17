// Vitest doesn't get Next.js's special webpack aliasing of the real
// `server-only` package (which unconditionally throws so it can be
// swapped for a no-op only in server bundles). This stub replaces it in
// tests via a resolve alias — see vitest.integration.config.mts.
export {};
