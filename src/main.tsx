import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { unlockAudioForMobile } from './store/playerStore';

function initAudioUnlock() {
  const unlock = () => {
    try {
      unlockAudioForMobile();
    } catch (e) {
      // Ignore
    }
  };

  window.addEventListener('click', unlock, { passive: true, once: true });
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('touchend', unlock, { passive: true, once: true });
}

initAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
