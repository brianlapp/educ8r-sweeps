
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      jsxImportSource: undefined,
      tsDecorators: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable minification for production
    minify: 'terser',
    rollupOptions: {
      output: {
        // Code splitting configuration
        manualChunks: {
          vendor: [
            'react', 
            'react-dom', 
            'react-router-dom', 
            'react-helmet-async'
          ],
          ui: [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          charts: ['recharts'],
          forms: [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          utils: [
            'date-fns',
            'sonner'
          ]
        }
      }
    },
    // Generate source maps for production
    sourcemap: mode === 'development',
  }
}));
