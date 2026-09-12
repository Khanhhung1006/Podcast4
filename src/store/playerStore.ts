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
}

// Single persistent HTML5 Audio Element for iOS Safari, iPad, Chrome, and Android
let globalAudio: HTMLAudioElement | null = null;
let unlockAttempted = false;

function getAudioElement(): HTMLAudioElement {
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.setAttribute('playsinline', 'true');
    (globalAudio as any).playsInline = true;
    (globalAudio as any).webkitPlaysInline = true;
    globalAudio.preload = 'metadata';
  }
  return globalAudio;
}

export function unlockAudioForMobile() {
  if (unlockAttempted) return;
  const audio = getAudioElement();
  audio.play().then(() => {
    audio.pause();
    unlockAttempted = true;
  }).catch(() => {
    // Keep ready for user gesture
  });
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const audio = getAudioElement();

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

  audio.addEventListener('playing', () => {
    set({ isPlaying: true, isLoadingAudio: false });
  });

  audio.addEventListener('pause', () => {
    set({ isPlaying: false });
  });

  audio.addEventListener('timeupdate', () => {
    set({ progress: audio.currentTime });
  });

  audio.addEventListener('ended', () => {
    set({ isPlaying: false, isLoadingAudio: false });
    get().next();
  });

  audio.addEventListener('error', () => {
    console.error('Audio error code:', audio.error?.code, audio.error?.message);
    set({ isPlaying: false, isLoadingAudio: false });
  });

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

    play: (episode, queue) => {
      const audioElement = getAudioElement();

      // Direct CDN stream URL resolution
      let directAudioUrl = episode.audioUrl;
      if (directAudioUrl && directAudioUrl.includes("https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net")) {
        const match = directAudioUrl.match(/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F([^&]+)/);
        if (match) {
          directAudioUrl = "https://d3ctxlq1ktw2nl.cloudfront.net/staging/" + decodeURIComponent(match[1]);
        }
      }

      set({
        currentEpisode: episode,
        queue: queue || get().queue,
        isLoadingAudio: true,
        isPlaying: false,
        progress: 0,
        duration: episode.duration ? parseFloat(episode.duration) || 0 : 0
      });

      if (audioElement.src !== directAudioUrl) {
        audioElement.src = directAudioUrl;
        audioElement.playbackRate = get().playbackRate;
        audioElement.volume = get().volume;
        audioElement.load();
      }

      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            set({ isPlaying: true, isLoadingAudio: false });
          })
          .catch((err) => {
            console.warn('Audio play() notice:', err.message);
            set({ isPlaying: false, isLoadingAudio: false });
          });
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: episode.title,
          artist: episode.podcastTitle || 'VN Podcast Pro',
          artwork: [
            { src: episode.image, sizes: '96x96', type: 'image/jpeg' },
            { src: episode.image, sizes: '256x256', type: 'image/jpeg' },
            { src: episode.image, sizes: '512x512', type: 'image/jpeg' },
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => get().togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => get().togglePlay());
        navigator.mediaSession.setActionHandler('seekbackward', () => get().seek(get().progress - 15));
        navigator.mediaSession.setActionHandler('seekforward', () => get().seek(get().progress + 30));
        navigator.mediaSession.setActionHandler('previoustrack', () => get().prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => get().next());
      }
    },

    togglePlay: () => {
      const audioElement = getAudioElement();
      const { isPlaying, currentEpisode } = get();

      if (!currentEpisode) return;

      if (isPlaying) {
        audioElement.pause();
        set({ isPlaying: false });
      } else {
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              set({ isPlaying: true });
            })
            .catch((err) => {
              console.warn('togglePlay notice:', err.message);
            });
        }
      }
    },

    pause: () => {
      const audioElement = getAudioElement();
      audioElement.pause();
      set({ isPlaying: false });
    },

    seek: (time) => {
      const audioElement = getAudioElement();
      const duration = get().duration || audioElement.duration || 0;
      const safeTime = Math.max(0, Math.min(time, duration));
      
      try {
        audioElement.currentTime = safeTime;
        set({ progress: safeTime });
      } catch (e) {
        console.warn('Seek notice:', e);
      }
    },

    setVolume: (vol) => {
      const audioElement = getAudioElement();
      audioElement.volume = vol;
      set({ volume: vol });
    },

    setPlaybackRate: (rate) => {
      const audioElement = getAudioElement();
      audioElement.playbackRate = rate;
      set({ playbackRate: rate });
    },

    next: () => {
      const { queue, currentEpisode, play } = get();
      if (!currentEpisode || queue.length === 0) return;
      const currentIndex = queue.findIndex(e => e.id === currentEpisode.id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        play(queue[currentIndex + 1], queue);
      }
    },

    prev: () => {
      const { queue, currentEpisode, play } = get();
      if (!currentEpisode || queue.length === 0) return;
      const currentIndex = queue.findIndex(e => e.id === currentEpisode.id);
      if (currentIndex > 0) {
        play(queue[currentIndex - 1], queue);
      }
    },

    setSleepTimer: (minutes) => {
      set({ sleepTimer: minutes });
    }
  };
});
