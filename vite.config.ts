import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["path", "process"],
      globals: { process: true },
    }),
  ],
  base: "./",
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "production"
    ),
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("monaco-editor") ||
            id.includes("@monaco-editor")
          ) {
            return "editor";
          }
          if (id.includes("node_modules/@babel/")) {
            return "babel";
          }
          if (id.includes("node_modules/typescript/")) {
            return "typescript";
          }
          if (id.includes("node_modules/prettier/")) {
            return "prettier";
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["monaco-editor"],
  },
});
