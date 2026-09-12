import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Howler } from 'howler';

// Automatically unlock Web Audio API AudioContext on first user interaction for Android WebView
function initAudioUnlock() {
  const unlock = () => {
    try {
      if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {});
      }
    } catch (e) {
      // Ignore audio context resume errors
    }
  };

  window.addEventListener('click', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
}

initAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

