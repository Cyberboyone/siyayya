import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000", // Placeholder for local backend if running
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('API Proxy Error (Normal in local dev if no backend):', err.message);
            // Optionally handle 404s cleanly here if needed
          });
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Siyayya Marketplace',
        short_name: 'Siyayya',
        description: 'Campus Deals & Marketplace',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@tanstack')) return 'vendor-query';
            return 'vendor';
          }
        },
      },
    },
  },
}));
