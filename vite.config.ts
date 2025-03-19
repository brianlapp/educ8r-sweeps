import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";
import type { OutputBundle, OutputOptions, OutputChunk, OutputAsset } from "rollup";

// Custom plugin to generate asset manifest
function generateManifest() {
  return {
    name: 'generate-asset-manifest',
    writeBundle(options: OutputOptions, bundle: OutputBundle) {
      // Create a mapping of original filenames to output filenames
      const manifest: Record<string, string> = {};
      
      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        
        // For JS entry points and CSS files
        if (chunk.type === 'chunk') {
          const chunkWithFacade = chunk as OutputChunk;
          const originalFile = chunkWithFacade.facadeModuleId;
          if (originalFile) {
            // Strip the project root path to get a relative path
            const relativePath = originalFile.includes('src/') 
              ? originalFile.substring(originalFile.indexOf('src/')) 
              : originalFile;
            
            manifest[relativePath] = fileName;
          }
        } else if (chunk.type === 'asset') {
          // Handle assets without facadeModuleId
          const assetChunk = chunk as OutputAsset;
          if (assetChunk.name) {
            manifest[assetChunk.name] = fileName;
          }
        }
      }
      
      // Write the manifest file
      fs.writeFileSync(
        path.resolve(options.dir || '', 'asset-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      console.log('✅ Asset manifest generated successfully');
    }
  };
}

// Plugin to inline critical CSS
function inlineCriticalCSS() {
  return {
    name: 'inline-critical-css',
    transformIndexHtml(html: string) {
      // Define critical CSS - this should match what's in criticalPathOptimizer.ts
      const criticalCSS = `
        body { font-family: 'Poppins', sans-serif; }
        .hero-section { min-height: 30vh; position: relative; }
        header, .banner { min-height: 64px; }
        img { width: auto; height: auto; max-width: 100%; }
        [class*='fade-in'] { opacity: 0; }
        [class*='animate'] { opacity: 1; transition: opacity 0.5s; }
      `;
      
      // Add critical CSS inline in head
      return html.replace('</head>', `<style id="critical-css">${criticalCSS}</style></head>`);
    }
  };
}

// Plugin to add preload directives and resource hints
function addResourceHints() {
  return {
    name: 'add-resource-hints',
    transformIndexHtml(html: string) {
      // Add resource hints for common external domains
      const preconnects = [
        '<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link rel="preconnect" href="https://epfzraejquaxqrfmkmyx.supabase.co" crossorigin>'
      ];
      
      // Add preload directives for critical assets
      const preloads = [
        '<link rel="preload" href="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" as="image" type="image/webp" fetchpriority="high">',
        '<link rel="preload" href="/lovable-uploads/308c0411-e546-4640-ab1a-b354a074f9c4.png" as="image" type="image/webp" fetchpriority="high">'
      ];
      
      const hints = [...preconnects, ...preloads].join('\n  ');
      return html.replace('<head>', `<head>\n  ${hints}`);
    }
  };
}

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
    mode === 'development' && componentTagger(),
    mode === 'production' && generateManifest(),
    mode === 'production' && inlineCriticalCSS(),
    mode === 'production' && addResourceHints(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable minification for production
    minify: mode === 'production' ? 'terser' : false,
    // Terser options for better optimization
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.log'],
      },
    },
    // Keep sourcemaps for better debugging
    sourcemap: mode === 'production' ? false : true,
    // Split chunks more aggressively for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            'sonner'
          ],
          utils: [
            'clsx', 
            'tailwind-merge', 
            'class-variance-authority'
          ],
          supabase: [
            '@supabase/supabase-js'
          ],
          tanstack: [
            '@tanstack/react-query'
          ]
        },
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
      }
    },
    // Optimize asset URLs for CDN
    assetsDir: 'assets',
    // Target modern browsers for smaller bundles
    target: 'es2020',
  }
}));
