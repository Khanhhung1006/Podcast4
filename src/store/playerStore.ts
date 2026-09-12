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
  
  // Audio Engine
  howl: Howl | null;
  
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
  howl: null,

  play: (episode, queue) => {
    const { howl } = get();
    if (howl) {
      howl.unload();
    }

    // 1. Chuyển đổi URL Anchor redirect sang link trực tiếp CDN CloudFront
    let directAudioUrl = episode.audioUrl;
    if (directAudioUrl && directAudioUrl.includes("https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net")) {
      const match = directAudioUrl.match(/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F([^&]+)/);
      if (match) {
        directAudioUrl = "https://d3ctxlq1ktw2nl.cloudfront.net/staging/" + decodeURIComponent(match[1]);
      }
    }

    // 2. Chỉ định định dạng tương thích tuyệt đối cho WebKit Safari iOS & Android
    const cleanUrl = directAudioUrl.split('?')[0].toLowerCase();
    const format = cleanUrl.endsWith('.m4a') ? ['m4a', 'mp4', 'aac'] : ['mp3'];

    set({ isLoadingAudio: true, isPlaying: false, progress: 0 });

    let retryCount = 0;

    const createAndPlayHowl = (audioSrc: string) => {
      const newHowl = new Howl({
        src: [audioSrc],
        format: format,
        html5: true, // Bắt buộc dùng HTML5 Audio streaming cho tập dài
        preload: true,
        volume: get().volume,
        rate: get().playbackRate,
        onplay: () => {
          set({ isPlaying: true, isLoadingAudio: false });
        },
        onpause: () => set({ isPlaying: false }),
        onend: () => {
          set({ isPlaying: false, isLoadingAudio: false });
          get().next();
        },
        onload: () => {
          set({ duration: newHowl.duration(), isLoadingAudio: false });
        },
        onloaderror: (id, err) => {
          console.error("Audio Load Error:", err, "URL:", audioSrc);
          if (!audioSrc.includes('/api/stream') && retryCount === 0) {
            retryCount++;
            const proxyUrl = `/api/stream?url=${encodeURIComponent(audioSrc)}`;
            setTimeout(() => {
              createAndPlayHowl(proxyUrl);
            }, 300);
          } else if (retryCount < 2) {
            retryCount++;
            setTimeout(() => {
              createAndPlayHowl(audioSrc);
            }, 500);
          } else {
            set({ isLoadingAudio: false, isPlaying: false });
          }
        },
        onplayerror: (id, err) => {
          console.warn("Audio Play Error:", err);
          set({ isLoadingAudio: false });
          newHowl.once('unlock', () => {
            newHowl.play();
          });
        }
      });

      newHowl.play();
      set({ howl: newHowl });
      return newHowl;
    };

    const newHowl = createAndPlayHowl(directAudioUrl);

    // Hỗ trợ hiển thị trên màn hình khóa điện thoại (Media Session API)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: episode.title,
        artist: episode.podcastTitle || 'VN Podcast Pro',
        artwork: [{ src: episode.image, sizes: '512x512', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => get().togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => get().togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => get().seek(get().progress - 15));
      navigator.mediaSession.setActionHandler('seekforward', () => get().seek(get().progress + 30));
      navigator.mediaSession.setActionHandler('previoustrack', () => get().prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => get().next());
    }

    set({ 
      currentEpisode: episode, 
      howl: newHowl,
      queue: queue || get().queue,
    });
  },

  togglePlay: () => {
    const { howl, isPlaying } = get();
    if (howl) {
      if (isPlaying) howl.pause();
      else howl.play();
    }
  },
  
  pause: () => {
    const { howl } = get();
    if (howl) howl.pause();
  },

  seek: (time) => {
    const { howl, duration } = get();
    if (howl) {
      const safeTime = Math.max(0, Math.min(time, duration));
      howl.seek(safeTime);
      set({ progress: safeTime });
    }
  },

  setVolume: (vol) => {
    const { howl } = get();
    if (howl) howl.volume(vol);
    set({ volume: vol });
  },

  setPlaybackRate: (rate) => {
    const { howl } = get();
    if (howl) howl.rate(rate);
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
}));

// Bộ cập nhật thanh thời gian chạy theo giây
setInterval(() => {
  const { howl, isPlaying } = usePlayerStore.getState();
  if (isPlaying && howl) {
    const seek = howl.seek();
    if (typeof seek === 'number') {
      usePlayerStore.setState({ progress: seek });
    }
  }
}, 1000);
