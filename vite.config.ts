
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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable minification for production
    minify: mode === 'production',
    // Simplified build options
    sourcemap: true,
    rollupOptions: {
      output: {
        // Ensure we generate predictable chunk names
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    },
  }
}));
