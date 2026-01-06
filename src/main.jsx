import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Override to prevent native alerts
window.alert = (msg) => {
  console.warn("Supressed Alert:", msg);
  // Optional: Dispatch a custom event to show a Toast if possible, 
  // but for now, just suppressing the annoying popup is the request.
};

const originalConfirm = window.confirm;
window.confirm = (msg) => {
  console.warn("Supressed Confirm:", msg);
  return false; // Default to denying action if native confirm is called
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
