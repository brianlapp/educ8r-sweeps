
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      // SWC options - removing fastRefresh as it's not in the Options type
      jsxImportSource: undefined,
      tsDecorators: false,
    }),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
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
          // Add more specific chunks
          forms: [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          utils: [
            'date-fns',
            'sonner'
          ]
        },
        // Optimize chunk size
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({name}) => {
          // Apply hash to all assets and organize by type
          if (/\.(gif|jpe?g|png|svg|webp)$/.test(name ?? '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(name ?? '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (/\.css$/.test(name ?? '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[ext]/[name]-[hash].[ext]';
        }
      }
    },
    // Improve CSS optimization
    cssCodeSplit: true,
    // Reduce the size of chunk warnings
    chunkSizeWarningLimit: 1000,
    // Generate source maps for production
    sourcemap: mode === 'development',
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : undefined,
        passes: 2, // Additional optimization pass
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
        keep_infinity: true // to properly compare infinities
      },
      mangle: {
        safari10: true, // for Safari 10 compatibility
      },
      format: {
        comments: false, // Remove comments
        preserve_annotations: true, // Keep important annotations
      }
    },
    // Add additional optimizations
    reportCompressedSize: true,
    modulePreload: {
      polyfill: true,
    },
    // Add browser targeting
    target: 'es2018', // Balance between modern features and browser support
  },
  // Enhanced caching for dev mode
  cacheDir: '.vite-cache',
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@tanstack/react-query',
      'clsx',
      'tailwind-merge',
      'react-hook-form',
      'sonner'
    ],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  // Additional performance configurations
  preview: {
    port: 4173,
    host: true,
    strictPort: true,
  },
  // Add explicit environment variables support
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'import.meta.env.MODE': JSON.stringify(mode)
  }
}));
