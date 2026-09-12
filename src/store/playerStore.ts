import { create } from 'zustand';
import { Howl, Howler } from 'howler';

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: string;
  pubDate: number;
  image: string;
  podcastTitle?: string;
}

interface PlayerState {
  currentEpisode: Episode | null;
  queue: Episode[];
  isPlaying: boolean;
  isLoadingAudio: boolean;
  progress: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  sleepTimer: number | null;

  // Actions
  play: (episode: Episode, queue?: Episode[]) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  next: () => void;
  prev: () => void;
  setSleepTimer: (minutes: number | null) => void;

  // Compatibility setters
  setIsPlaying: (playing: boolean) => void;
  setIsLoadingAudio: (loading: boolean) => void;
  setProgress: (prog: number) => void;
  setDuration: (dur: number) => void;
}

if (typeof window !== 'undefined') {
  Howler.autoUnlock = true;
  Howler.html5PoolSize = 10;
}

function resolveAudioUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let direct = rawUrl;
  if (direct.includes("https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net")) {
    const match = direct.match(/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F([^&]+)/);
    if (match) {
      direct = "https://d3ctxlq1ktw2nl.cloudfront.net/staging/" + decodeURIComponent(match[1]);
    }
  }
  return direct;
}

let currentSound: Howl | null = null;
let progressInterval: number | null = null;
let isUnlocked = false;

function globalUnlock() {
  if (isUnlocked) return;
  isUnlocked = true;
  
  // Unlock Web Audio
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume();
  }

  // Play a silent base64 audio to unlock the HTML5 pool natively
  const silentHowl = new Howl({
    src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='],
    html5: true,
    volume: 0,
    onplay: () => {
      setTimeout(() => silentHowl.unload(), 100);
    }
  });
  silentHowl.play();
  
  const node = (silentHowl as any)._sounds?.[0]?._node;
  if (node && typeof node.play === 'function') {
    const p = node.play();
    if (p !== undefined) p.catch(() => {});
  }
}

// Bắt sự kiện chạm ĐẦU TIÊN trên toàn bộ ứng dụng để UNLOCK Safari Audio
if (typeof document !== 'undefined') {
  const events = ['touchstart', 'touchend', 'click', 'keydown'];
  const unlock = () => {
    globalUnlock();
    events.forEach(e => document.removeEventListener(e, unlock, true));
  };
  events.forEach(e => document.addEventListener(e, unlock, true));
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const updateProgress = () => {
    if (currentSound && currentSound.playing()) {
      set({ progress: currentSound.seek() as number });
    }
  };

  const startProgressInterval = () => {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = window.setInterval(updateProgress, 1000);
  };

  const stopProgressInterval = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  return {
    currentEpisode: null,
    queue: [],
    isPlaying: false,
    isLoadingAudio: false,
    progress: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isMuted: false,
    sleepTimer: null,

    setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
    setIsLoadingAudio: (isLoadingAudio: boolean) => set({ isLoadingAudio }),
    setProgress: (progress: number) => set({ progress }),
    setDuration: (duration: number) => set({ duration }),

    play: (episode: Episode, queue?: Episode[]) => {
      const directUrl = resolveAudioUrl(episode.audioUrl);

      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: episode.title,
            artist: episode.podcastTitle || 'YÊU THU PODCAST',
            artwork: [
              { src: episode.image, sizes: '96x96', type: 'image/jpeg' },
              { src: episode.image, sizes: '256x256', type: 'image/jpeg' },
              { src: episode.image, sizes: '512x512', type: 'image/jpeg' },
            ],
          });

          navigator.mediaSession.setActionHandler('play', () => get().togglePlay());
          navigator.mediaSession.setActionHandler('pause', () => get().togglePlay());
          navigator.mediaSession.setActionHandler('seekbackward', () => get().seek(get().progress - 15));
          navigator.mediaSession.setActionHandler('seekforward', () => get().seek(get().progress + 30));
          navigator.mediaSession.setActionHandler('previoustrack', () => get().prev());
          navigator.mediaSession.setActionHandler('nexttrack', () => get().next());
        } catch (e) {
          // Ignore
        }
      }

      set({
        currentEpisode: episode,
        queue: queue || get().queue,
        isPlaying: true,
        isLoadingAudio: true,
        progress: 0,
        duration: episode.duration ? parseFloat(episode.duration) || 0 : 0,
      });

      if (currentSound) {
        currentSound.unload();
        currentSound = null;
      }

      currentSound = new Howl({
        src: [directUrl],
        format: ['mp3', 'm4a', 'wav', 'aac'],
        html5: true, // Must be true for streaming large podcast files!
        volume: get().volume,
        rate: get().playbackRate,
        preload: true,
        onplay: () => {
          set({ isPlaying: true, isLoadingAudio: false });
          startProgressInterval();
          const dur = currentSound?.duration();
          if (dur && isFinite(dur) && dur > 0) set({ duration: dur });
        },
        onpause: () => {
          set({ isPlaying: false });
          stopProgressInterval();
        },
        onend: () => {
          set({ isPlaying: false, isLoadingAudio: false });
          stopProgressInterval();
          get().next();
        },
        onstop: () => {
          set({ isPlaying: false });
          stopProgressInterval();
        },
        onload: () => {
          set({ isLoadingAudio: false });
          const dur = currentSound?.duration();
          if (dur && isFinite(dur) && dur > 0) set({ duration: dur });
        },
        onloaderror: (id, err) => {
          console.warn('Howler load error:', err);
          set({ isPlaying: false, isLoadingAudio: false });
        },
        onplayerror: (id, err) => {
          console.warn('Howler play error:', err);
          currentSound?.once('unlock', () => {
            currentSound?.play();
          });
          set({ isPlaying: false, isLoadingAudio: false });
        },
      });

      // Synchronous execution (Lệnh gọi gốc của Howler)
      currentSound.play();
      
      // BẮT BUỘC CHO SAFARI: Can thiệp sâu vào thẻ Node HTML5 của Howler 
      // Ép Node ẩn đó phải chạy trực tiếp ngay trong 1 Tick đồng bộ (Synchronous tick)
      try {
        const node = (currentSound as any)._sounds?.[0]?._node;
        if (node && typeof node.play === 'function') {
          const p = node.play();
          if (p !== undefined) {
            p.catch((e: any) => console.warn('Safari override play error:', e));
          }
        }
      } catch (e) {}
    },

    togglePlay: () => {
      const { isPlaying, currentEpisode } = get();
      if (!currentEpisode) return;

      if (isPlaying) {
        if (currentSound) currentSound.pause();
        set({ isPlaying: false });
      } else {
        set({ isPlaying: true });
        if (currentSound) {
          currentSound.play();
          
          // Force Safari Override
          try {
            const node = (currentSound as any)._sounds?.[0]?._node;
            if (node && typeof node.play === 'function') {
              const p = node.play();
              if (p !== undefined) p.catch(() => {});
            }
          } catch (e) {}
        } else {
          get().play(currentEpisode);
        }
      }
    },

    pause: () => {
      if (currentSound) currentSound.pause();
      set({ isPlaying: false });
    },

    seek: (time: number) => {
      const duration = get().duration;
      const safeTime = Math.max(0, Math.min(time, duration || Infinity));
      set({ progress: safeTime });
      if (currentSound) {
        currentSound.seek(safeTime);
      }
    },

    setVolume: (vol: number) => {
      Howler.volume(vol);
      if (currentSound) currentSound.volume(vol);
      set({ volume: vol });
    },

    setPlaybackRate: (rate: number) => {
      if (currentSound) currentSound.rate(rate);
      set({ playbackRate: rate });
    },

    next: () => {
      const { queue, currentEpisode, play } = get();
      if (!currentEpisode || queue.length === 0) return;
      const currentIndex = queue.findIndex((e) => e.id === currentEpisode.id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        play(queue[currentIndex + 1], queue);
      }
    },

    prev: () => {
      const { queue, currentEpisode, play } = get();
      if (!currentEpisode || queue.length === 0) return;
      const currentIndex = queue.findIndex((e) => e.id === currentEpisode.id);
      if (currentIndex > 0) {
        play(queue[currentIndex - 1], queue);
      }
    },

    setSleepTimer: (minutes: number | null) => {
      set({ sleepTimer: minutes });
    },
  };
});

export function getAudioElement(): any {
  return null;
}

export function unlockAudioForMobile(): void {
  // Automatically handled by Howler.js global touch listener
}
