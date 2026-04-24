/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "/pillar-inflation/",
  plugins: [react()],
  resolve: {
    alias: {
      "@fixtures": path.resolve(__dirname, "../shared/fixtures"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "node",
  },
});
