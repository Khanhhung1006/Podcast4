import { create } from 'zustand';

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

let globalAudio: HTMLAudioElement | null = null;

export function getAudio(): HTMLAudioElement {
  if (!globalAudio) {
    const existing = typeof document !== 'undefined' ? (document.getElementById('global-podcast-audio') as HTMLAudioElement | null) : null;
    if (existing) {
      globalAudio = existing;
    } else if (typeof document !== 'undefined') {
      globalAudio = document.createElement('audio');
      globalAudio.id = 'global-podcast-audio';
      globalAudio.setAttribute('playsinline', 'true');
      (globalAudio as any).playsInline = true;
      (globalAudio as any).webkitPlaysInline = true;
      globalAudio.setAttribute('webkit-playsinline', 'true');
      globalAudio.setAttribute('x-webkit-airplay', 'allow');
      globalAudio.preload = 'auto';
      globalAudio.style.display = 'none';

      if (document.body) {
        document.body.appendChild(globalAudio);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (globalAudio && !document.body.contains(globalAudio)) {
            document.body.appendChild(globalAudio);
          }
        });
      }
    }
  }
  return globalAudio!;
}

// Chuyển đổi link CDN Anchor / CloudFront trực tiếp
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

export const usePlayerStore = create<PlayerState>((set, get) => {
  if (typeof window !== 'undefined') {
    const audio = getAudio();
    if (audio) {
      audio.addEventListener('loadstart', () => {
        set({ isLoadingAudio: true });
      });

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          set({ duration: audio.duration, isLoadingAudio: false });
        }
      });

      audio.addEventListener('durationchange', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          set({ duration: audio.duration });
        }
      });

      audio.addEventListener('canplay', () => {
        set({ isLoadingAudio: false });
      });

      audio.addEventListener('canplaythrough', () => {
        set({ isLoadingAudio: false });
      });

      audio.addEventListener('playing', () => {
        set({ isPlaying: true, isLoadingAudio: false });
      });

      audio.addEventListener('pause', () => {
        set({ isPlaying: false });
      });

      audio.addEventListener('waiting', () => {
        set({ isLoadingAudio: true });
      });

      audio.addEventListener('timeupdate', () => {
        set({ progress: audio.currentTime });
      });

      audio.addEventListener('ended', () => {
        set({ isPlaying: false, isLoadingAudio: false });
        get().next();
      });

      audio.addEventListener('error', () => {
        console.warn('Audio playback error notice:', audio.error?.code, audio.error?.message);
        set({ isPlaying: false, isLoadingAudio: false });
      });
    }
  }

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
      const audio = getAudio();
      const directUrl = resolveAudioUrl(episode.audioUrl);

      set({
        currentEpisode: episode,
        queue: queue || get().queue,
        isPlaying: true,
        isLoadingAudio: true,
        progress: 0,
        duration: episode.duration ? parseFloat(episode.duration) || 0 : 0,
      });

      if (audio) {
        if (audio.src !== directUrl) {
          audio.src = directUrl;
          audio.playbackRate = get().playbackRate;
          audio.volume = get().volume;
        }

        // BẮT BUỘC CHO SAFARI: audio.play() phải gọi ĐỒNG BỘ trong cùng sự kiện click
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              set({ isPlaying: true, isLoadingAudio: false });
            })
            .catch((err) => {
              console.warn('Playback error:', err.name, err.message);
              set({ isPlaying: false, isLoadingAudio: false });
            });
        }
      }

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
    },

    togglePlay: () => {
      const { isPlaying, currentEpisode } = get();
      if (!currentEpisode) return;
      const audio = getAudio();

      if (isPlaying) {
        if (audio) audio.pause();
        set({ isPlaying: false });
      } else {
        set({ isPlaying: true });
        if (audio) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                set({ isPlaying: true });
              })
              .catch((err) => {
                console.warn('togglePlay notice:', err.name, err.message);
                set({ isPlaying: false });
              });
          }
        }
      }
    },

    pause: () => {
      const audio = getAudio();
      if (audio) audio.pause();
      set({ isPlaying: false });
    },

    seek: (time: number) => {
      const audio = getAudio();
      const duration = get().duration || audio?.duration || 0;
      const safeTime = Math.max(0, Math.min(time, duration || Infinity));
      set({ progress: safeTime });
      if (audio) {
        try {
          audio.currentTime = safeTime;
        } catch (e) {
          // Ignore
        }
      }
    },

    setVolume: (vol: number) => {
      const audio = getAudio();
      if (audio) {
        audio.volume = vol;
      }
      set({ volume: vol });
    },

    setPlaybackRate: (rate: number) => {
      const audio = getAudio();
      if (audio) {
        audio.playbackRate = rate;
      }
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

export function getAudioElement(): HTMLAudioElement | null {
  return typeof document !== 'undefined' ? getAudio() : null;
}

export function unlockAudioForMobile(): void {
  if (typeof document !== 'undefined') {
    const audio = getAudio();
    if (audio && !audio.src) {
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => audio.pause()).catch(() => {});
      }
    }
  }
}
