import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Howler } from 'howler';

// Tự động mở khóa Web Audio và HTML5 Audio Pool trên Safari iOS & Android WebView
function initAudioUnlock() {
  const unlock = () => {
    try {
      // 1. Mở khóa Web Audio Context
      if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {});
      }
      // 2. Mở khóa các node HTML5 Audio trong pool của Safari
      if (Howler && (Howler as any)._html5AudioPool) {
        const pool = (Howler as any)._html5AudioPool;
        for (let i = 0; i < pool.length; i++) {
          const a = pool[i];
          if (a && !a._unlocked) {
            a.load();
            a._unlocked = true;
          }
        }
      }
    } catch (e) {
      // Bỏ qua lỗi unlock nếu đã chạy trước đó
    }
  };

  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });
}

initAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
