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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('recharts') || id.includes('monaco-editor')) {
              return 'heavy-vendor';
            }
          }

          // Separate chunks for advanced components
          if (id.includes('components/advanced/')) {
            if (id.includes('VQEPlayground')) {
              return 'advanced-quantum';
            }
            if (id.includes('NoiseSimulator') || id.includes('AdvancedAnalytics')) {
              return 'advanced-analysis';
            }
            if (id.includes('AITutor') || id.includes('GamificationSystem')) {
              return 'advanced-interactive';
            }
          }

          // Quantum core utilities
          if (id.includes('utils/quantum/') || id.includes('utils/core/')) {
            return 'quantum-core';
          }

          // Test files in separate chunk
          if (id.includes('.test.') || id.includes('/__tests__/')) {
            return 'test-files';
          }
        }
      }
    },
    // Enable source maps for debugging
    sourcemap: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: true
  }
}));
