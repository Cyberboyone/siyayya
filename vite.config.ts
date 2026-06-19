import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 5188,
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
}));
