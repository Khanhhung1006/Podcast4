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

  // Internal state setters used by AudioController
  setIsPlaying: (playing: boolean) => void;
  setIsLoadingAudio: (loading: boolean) => void;
  setProgress: (prog: number) => void;
  setDuration: (dur: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
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
    set({
      currentEpisode: episode,
      queue: queue || get().queue,
      isPlaying: true,
      isLoadingAudio: true,
      progress: 0,
      duration: episode.duration ? parseFloat(episode.duration) || 0 : 0,
    });

    if ('mediaSession' in navigator) {
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
    set({ isPlaying: !isPlaying });
  },

  pause: () => {
    set({ isPlaying: false });
  },

  seek: (time: number) => {
    const { duration } = get();
    const safeTime = Math.max(0, Math.min(time, duration || Infinity));
    set({ progress: safeTime });
    const audio = document.getElementById('global-podcast-audio') as HTMLAudioElement | null;
    if (audio) {
      try {
        audio.currentTime = safeTime;
      } catch (e) {
        // Ignore
      }
    }
  },

  setVolume: (vol: number) => {
    const audio = document.getElementById('global-podcast-audio') as HTMLAudioElement | null;
    if (audio) {
      audio.volume = vol;
    }
    set({ volume: vol });
  },

  setPlaybackRate: (rate: number) => {
    const audio = document.getElementById('global-podcast-audio') as HTMLAudioElement | null;
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
}));

// Tương thích ngược tránh lỗi build trên Cloudflare
export function getAudioElement(): HTMLAudioElement | null {
  return typeof document !== 'undefined' ? (document.getElementById('global-podcast-audio') as HTMLAudioElement | null) : null;
}

export function unlockAudioForMobile(): void {
  // Được xử lý tự động trong React Lifecycle bởi AudioController
}
