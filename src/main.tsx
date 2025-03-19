
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Simple initialization without complex scheduling
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Log performance in development mode only
if (process.env.NODE_ENV === 'development') {
  console.log('App initialized in development mode');
}
