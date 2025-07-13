import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './services/keepAlive'  // Auto-start keep-alive service

// Ensure this element exists in your index.html
const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
