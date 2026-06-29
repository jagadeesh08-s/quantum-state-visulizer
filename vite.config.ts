import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "raf": path.resolve(__dirname, "./src/utils/raf-shim.js"),
    },
  },
  define: {
    'process.env': {}
  },
  // Bundle optimization
  build: {
    // Enable source maps for debugging
    sourcemap: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1500
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true
  }
}));
