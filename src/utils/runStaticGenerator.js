
// Simple wrapper script to execute the static page generator
import('./generateStaticCampaignPages.js').then(() => {
  console.log('Static campaign generator completed successfully');
}).catch(err => {
  console.error('Error importing static campaign generator:', err);
  process.exit(1);
});
