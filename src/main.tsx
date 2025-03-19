
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add error handling and debugging
console.log('Application starting...');
console.log('Current URL:', window.location.href);
console.log('Environment:', process.env.NODE_ENV);

try {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found! This could indicate the page wasn't loaded correctly.");
    throw new Error("Root element not found in DOM");
  }
  
  console.log('Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  console.log('Rendering App component...');
  root.render(<App />);
  console.log('App rendered successfully');
  
  // Log performance in development mode only
  if (process.env.NODE_ENV === 'development') {
    console.log('App initialized in development mode');
  }
  
  // Add a visible message if the page is a statically generated one
  if (document.head.innerHTML.includes('Static page generated for campaign')) {
    console.log('This is a statically generated page!');
  }
} catch (error) {
  console.error('Fatal error during application initialization:', error);
  // Display fallback UI when React fails to render
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2>Application Error</h2>
        <p>Sorry, something went wrong while loading the application.</p>
        <p style="color: red; margin-top: 10px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p style="margin-top: 20px;">
          <a href="/" style="color: blue; text-decoration: underline;">Try returning to the home page</a>
        </p>
      </div>
    `;
  }
}
