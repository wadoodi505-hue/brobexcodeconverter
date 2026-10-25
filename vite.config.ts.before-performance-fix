
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  base: "./",

  // Replace Babel's Node.js environment check at build time.
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },

  server: {
    sourcemapIgnoreList: (sourcePath) =>
      sourcePath.includes("monaco-editor"),
  },

  build: {
    target: "es2022",
    sourcemap: true,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("monaco-editor") ||
            id.includes("@monaco-editor")
          ) {
            return "editor";
          }

          if (
            id.includes("node_modules/@babel") ||
            id.includes("node_modules/typescript")
          ) {
            return "compiler";
          }
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ["monaco-editor"],
  },
});

