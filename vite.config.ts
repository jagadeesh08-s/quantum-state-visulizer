import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

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
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'placeholder.svg'],
      manifest: {
        name: 'Bloch Verse',
        short_name: 'BlochVerse',
        description: 'An interactive quantum computing educational tool for visualizing Bloch spheres and quantum circuits',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'placeholder.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
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
            if (id.includes('VQEPlayground') || id.includes('QuantumMedicalImaging')) {
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
