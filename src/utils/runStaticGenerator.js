
// Simple wrapper script to execute the static page generator
console.log('Attempting to import static generator...');

// Use dynamic import to load the generator module
import('./generateStaticCampaignPages.js')
  .then(() => {
    console.log('Static generator imported and executed successfully');
  })
  .catch(err => {
    console.error('Error importing static campaign generator:', err);
    process.exit(1);
  });
