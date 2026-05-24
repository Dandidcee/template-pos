import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Prevent viewport resize on keyboard open (mobile)
if (typeof window !== 'undefined') {
  // Store original viewport height
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setVH();
  
  // Update on resize, but debounce to avoid too many updates
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setVH, 100);
  });
  
  // Prevent scroll when input is focused on mobile
  const inputs = ['input', 'select', 'textarea'];
  inputs.forEach(selector => {
    document.addEventListener('focusin', (e) => {
      if (e.target.matches(selector)) {
        // Scroll to element smoothly
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
