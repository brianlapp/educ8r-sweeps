
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initAllOptimizations } from './utils/performanceBootstrap';

// Initialize performance optimizations as early as possible
initAllOptimizations();

// Add error handling and debugging
console.log('Application starting...', {
  url: window.location.href,
  environment: process.env.NODE_ENV,
  buildTime: import.meta.env.BUILDTIME || 'development',
  isStaticPage: document.head.innerHTML.includes('Static page generated for campaign')
});

// Define a function to show a user-friendly error
const showErrorFallback = (rootElement: HTMLElement, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Fatal error during application initialization:', error);
  
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif;">
      <h2>Application Error</h2>
      <p>Sorry, something went wrong while loading the application.</p>
      <p style="color: red; margin-top: 10px;">${errorMessage}</p>
      <p style="margin-top: 20px;">
        <a href="/" style="color: blue; text-decoration: underline;">Try returning to the home page</a>
      </p>
    </div>
  `;
};

try {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found! This could indicate the page wasn't loaded correctly.");
    throw new Error("Root element not found in DOM");
  }
  
  console.log('Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  // Add a loading indicator while React initializes
  rootElement.innerHTML = '<div style="text-align:center;padding:20px;font-family:sans-serif;"><p>Loading application...</p></div>';
  
  console.log('Rendering App component...');
  
  // Small delay to ensure the DOM is fully available
  setTimeout(() => {
    try {
      root.render(<App />);
      console.log('App rendered successfully');
      
      // Log performance in development mode only
      if (process.env.NODE_ENV === 'development') {
        console.log('App initialized in development mode');
      }
    } catch (renderError) {
      console.error('Error rendering React application:', renderError);
      showErrorFallback(rootElement, renderError);
    }
  }, 0);
  
  // Add a visible message if the page is a statically generated one
  if (document.head.innerHTML.includes('Static page generated for campaign')) {
    console.log('This is a statically generated page!');
  }
} catch (error) {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    showErrorFallback(rootElement, error);
  } else {
    // If we can't even find the root element, add an element to the body
    const fallbackElement = document.createElement('div');
    fallbackElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2>Critical Application Error</h2>
        <p>The application could not initialize properly.</p>
        <p style="color: red; margin-top: 10px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p style="margin-top: 20px;">
          <a href="/" style="color: blue; text-decoration: underline;">Try refreshing the page</a>
        </p>
      </div>
    `;
    document.body.appendChild(fallbackElement);
  }
}
