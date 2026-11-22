import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // rolldown accepts only function-form manualChunks; vendor split keeps app chunks small and caches framework bytes
        manualChunks: (id) => {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "vendor-react";
          }
          if (
            id.includes("node_modules/framer-motion/") ||
            id.includes("node_modules/motion-dom/") ||
            id.includes("node_modules/motion-utils/")
          ) {
            return "vendor-motion";
          }
          if (
            id.includes("node_modules/@tanstack/") ||
            id.includes("node_modules/zustand/")
          ) {
            return "vendor-query";
          }
        },
      },
    },
  },
});
