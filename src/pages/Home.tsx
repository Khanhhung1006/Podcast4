import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPodcasts, fetchLatestEpisodes } from '../api';
import { usePlayerStore, Episode } from '../store/playerStore';
import { Play, Pause, RefreshCw, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { STATIC_PODCASTS } from '../data/podcastsData';

export default function Home() {
  // Pre-computed instant static data (0ms latency, guaranteed always available)
  const initialPodcasts = useMemo(() => {
    return STATIC_PODCASTS.map(({ episodes, ...rest }) => rest);
  }, []);

  const initialEpisodes: Episode[] = useMemo(() => {
    return STATIC_PODCASTS.flatMap((p: any) =>
      (p.episodes || []).map((ep: any) => ({
        id: ep.id,
        podcastId: p.id,
        podcastTitle: p.title,
        title: ep.title,
        description: ep.description || '',
        audioUrl: ep.audioUrl,
        duration: ep.duration ? String(ep.duration) : '0',
        pubDate: ep.pubDate || Date.now(),
        image: ep.image || p.image,
      }))
    ).slice(0, 15);
  }, []);

  const {
    data: fetchedPodcasts,
    isFetching: fetchingPodcasts,
    refetch: refetchPodcasts,
  } = useQuery({
    queryKey: ['podcasts'],
    queryFn: fetchPodcasts,
    initialData: initialPodcasts,
  });

  const {
    data: fetchedEpisodes,
    isFetching: fetchingEpisodes,
    refetch: refetchEpisodes,
  } = useQuery({
    queryKey: ['latestEpisodes'],
    queryFn: () => fetchLatestEpisodes(15),
    initialData: initialEpisodes,
  });

  const podcasts = (fetchedPodcasts && fetchedPodcasts.length > 0) ? fetchedPodcasts : initialPodcasts;
  const latestEpisodes = (fetchedEpisodes && fetchedEpisodes.length > 0) ? fetchedEpisodes : initialEpisodes;

  const { play, togglePlay, isPlaying, currentEpisode } = usePlayerStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Chào buổi sáng';
    if (hour >= 12 && hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (currentEpisode?.id === episode.id) {
      togglePlay();
    } else {
      play(episode, latestEpisodes);
    }
  };

  const handleRefresh = () => {
    refetchPodcasts();
    refetchEpisodes();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{getGreeting()}</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">Lắng nghe podcast chất lượng cao mọi lúc, mọi nơi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Làm mới nội dung"
            className="p-2 sm:p-2.5 rounded-full bg-surface hover:bg-surface-hover text-muted hover:text-fg transition-all active:scale-95 border border-border-color"
            aria-label="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${fetchingPodcasts || fetchingEpisodes ? 'animate-spin text-primary' : ''}`} />
          </button>
          <PWAInstallButton />
        </div>
      </header>

      {/* Featured Podcasts */}
      <section className="mb-8 sm:mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-bold">Kênh Podcast Nổi Bật</h2>
          </div>
          <span className="text-xs text-muted font-medium">{podcasts.length} kênh phát sóng</span>
        </div>

        {podcasts.length === 0 ? (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border-color">
            <p className="text-muted mb-4">Chưa có kênh podcast nào được tải.</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-primary text-white rounded-full font-medium text-sm hover:scale-105 transition"
            >
              Thử tải lại
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {podcasts.map((podcast: any) => (
              <Link
                to={`/podcast/${podcast.id}`}
                key={podcast.id}
                className="group bg-surface hover:bg-surface-hover p-3 sm:p-4 rounded-xl transition-all duration-300 border border-transparent hover:border-border-color flex flex-col"
              >
                <div className="aspect-square rounded-lg bg-gray-800 mb-3 overflow-hidden shadow-md group-hover:shadow-xl transition-transform duration-300 group-hover:scale-[1.02]">
                  <img
                    src={podcast.image}
                    alt={podcast.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
                  {podcast.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted truncate mt-1">
                  {podcast.author || 'Đang cập nhật'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Latest Episodes */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold">Tập Mới Cập Nhật</h2>
          <span className="text-xs text-muted font-medium">{latestEpisodes.length} tập</span>
        </div>

        {latestEpisodes.length === 0 ? (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border-color">
            <p className="text-muted">Không có tập phát sóng nào.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {latestEpisodes.map((episode: any) => {
              const isActive = currentEpisode?.id === episode.id;
              return (
                <div
                  key={episode.id}
                  onClick={() => handlePlayEpisode(episode)}
                  className={`group flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-surface-hover border-primary/40 shadow-sm'
                      : 'bg-surface hover:bg-surface-hover border-border-color/30'
                  }`}
                >
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-lg overflow-hidden bg-gray-800">
                    <img
                      src={episode.image}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=60';
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayEpisode(episode);
                      }}
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label={isActive && isPlaying ? 'Tạm dừng' : 'Phát'}
                    >
                      {isActive && isPlaying ? (
                        <Pause className="fill-white w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <Play className="fill-white w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-xs sm:text-sm md:text-base truncate transition-colors ${
                        isActive ? 'text-primary' : 'text-fg'
                      }`}
                    >
                      {episode.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted truncate mt-1">
                      {episode.podcastTitle}
                    </p>
                  </div>
                  {isActive && isPlaying && (
                    <div className="flex items-center gap-1 pr-2 shrink-0">
                      <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                      <span className="w-1 h-5 bg-primary rounded-full animate-pulse delay-75" />
                      <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

