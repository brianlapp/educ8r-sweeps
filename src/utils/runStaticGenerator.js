
// Simple wrapper script to execute the static page generator
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Ensure the path is absolute
const generatorPath = new URL('./generateStaticCampaignPages.js', import.meta.url).pathname;

console.log('Importing static generator from:', generatorPath);

import('./generateStaticCampaignPages.js').catch(err => {
  console.error('Error importing static campaign generator:', err);
  process.exit(1);
});
