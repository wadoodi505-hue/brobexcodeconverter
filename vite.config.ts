import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["process"],
      globals: {
        process: true,
        Buffer: true,
        global: true
      },
      protocolImports: true
    })
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify("development")
  },
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true
  }
});
