
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths for development and production
const DIST_DIR = path.resolve(__dirname, '../../dist');
const MANIFEST_PATH = path.join(DIST_DIR, 'asset-manifest.json');

/**
 * Reads the asset manifest file if it exists
 * @returns {Object|null} The asset manifest or null if not found
 */
export function readAssetManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
      return JSON.parse(manifestContent);
    }
    console.warn('Asset manifest not found, using development paths');
    return null;
  } catch (error) {
    console.error('Error reading asset manifest:', error);
    return null;
  }
}

/**
 * Gets the correct asset path for a source file
 * @param {string} sourcePath - The original source path (e.g., "src/main.tsx")
 * @param {Object|null} manifest - The asset manifest
 * @returns {string} The correct path to use in HTML
 */
export function getAssetPath(sourcePath, manifest) {
  if (!manifest) {
    // In development, we can use the source path directly
    return `/${sourcePath}`;
  }
  
  // In production, look up the hashed filename
  const hashedFile = manifest[sourcePath];
  if (hashedFile) {
    return `/${hashedFile}`;
  }
  
  // Fallback if the exact path isn't found
  console.warn(`Asset not found in manifest: ${sourcePath}`);
  
  // If it's a main entry point, we need to make a best guess
  if (sourcePath === 'src/main.tsx') {
    // Look for any entry file that might match
    const possibleEntries = Object.keys(manifest).filter(key => 
      key.includes('main') && manifest[key].endsWith('.js')
    );
    
    if (possibleEntries.length > 0) {
      return `/${manifest[possibleEntries[0]]}`;
    }
  }
  
  // If we can't find it, return the original path with a warning
  console.error(`Could not resolve asset path for: ${sourcePath}`);
  return `/${sourcePath}`;
}

/**
 * Determines if we're running in development or production mode
 * @returns {boolean} True if in development mode
 */
export function isDevelopment() {
  return process.env.NODE_ENV !== 'production' && !fs.existsSync(DIST_DIR);
}

/**
 * Gets all JS entry points from the manifest
 * @param {Object} manifest - The asset manifest
 * @returns {Array<string>} Array of JS file paths to preload
 */
export function getJsEntryPoints(manifest) {
  if (!manifest) return ['/src/main.tsx'];
  
  return Object.entries(manifest)
    .filter(([key, value]) => 
      (key.includes('main') || key.includes('index')) && 
      value.endsWith('.js')
    )
    .map(([_, value]) => `/${value}`);
}

/**
 * Gets all CSS files from the manifest
 * @param {Object} manifest - The asset manifest
 * @returns {Array<string>} Array of CSS file paths to preload
 */
export function getCssFiles(manifest) {
  if (!manifest) return [];
  
  return Object.values(manifest)
    .filter(value => value.endsWith('.css'))
    .map(value => `/${value}`);
}
