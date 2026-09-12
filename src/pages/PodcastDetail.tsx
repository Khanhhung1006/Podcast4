import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPodcast } from '../api';
import { usePlayerStore, Episode } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { Play, Pause, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { STATIC_PODCASTS } from '../data/podcastsData';

export default function PodcastDetail() {
  const { id } = useParams<{ id: string }>();

  // Find instant match from static data (0ms initial render)
  const initialPodcast = useMemo(() => {
    if (!id) return STATIC_PODCASTS[0];
    return (
      STATIC_PODCASTS.find(
        (p) => p.id === id || p.title.toLowerCase().includes(id.toLowerCase())
      ) || STATIC_PODCASTS[0]
    );
  }, [id]);

  const { data: podcast = initialPodcast, isLoading } = useQuery({
    queryKey: ['podcast', id],
    queryFn: () => fetchPodcast(id!),
    enabled: !!id,
    initialData: initialPodcast,
  });

  const { play, togglePlay, isPlaying, currentEpisode } = usePlayerStore();
  const { isFollowed, followPodcast, unfollowPodcast } = useLibraryStore();

  const followed = podcast ? isFollowed(podcast.id) : false;

  const handleToggleFollow = () => {
    if (!podcast) return;
    if (followed) {
      unfollowPodcast(podcast.id);
    } else {
      followPodcast({
        id: podcast.id,
        title: podcast.title,
        author: podcast.author,
        image: podcast.image,
      });
    }
  };

  if (!podcast) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <p className="text-muted mb-4">Không tìm thấy thông tin podcast này.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:scale-105 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Trang Chủ
        </Link>
      </div>
    );
  }

  const handlePlayEpisode = (episode: Episode) => {
    if (currentEpisode?.id === episode.id) {
      togglePlay();
    } else {
      const q = (podcast.episodes || []).map((e: any) => ({
        ...e,
        podcastTitle: podcast.title,
      }));
      play({ ...episode, podcastTitle: podcast.title }, q);
    }
  };

  return (
    <div className="relative pb-12">
      {/* Top back navigation button */}
      <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted hover:text-fg bg-surface/60 hover:bg-surface px-3 py-1.5 rounded-full backdrop-blur transition"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
      </div>

      {/* Header Background Glow */}
      <div
        className="absolute top-0 left-0 right-0 h-96 opacity-20 blur-3xl pointer-events-none"
        style={{
          backgroundImage: `url(${podcast.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10 px-4 sm:px-6 pt-6 md:px-8 md:pt-10 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end">
        <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-bg border border-border-color">
          <img
            src={podcast.image}
            alt={podcast.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=60';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] uppercase tracking-widest text-primary font-bold">
            Kênh Podcast
          </span>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mt-1 mb-2 text-balance">
            {podcast.title}
          </h1>
          <p className="text-sm sm:text-base text-fg/80 font-medium">
            {podcast.author || 'Tác giả đang cập nhật'}
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6 sm:mt-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleToggleFollow}
            className={`font-semibold text-sm px-6 py-2.5 rounded-full hover:scale-105 transition active:scale-95 border ${
              followed
                ? 'bg-surface text-fg border-primary'
                : 'bg-primary text-white border-primary shadow-md'
            }`}
          >
            {followed ? 'Đang theo dõi' : 'Theo Dõi'}
          </button>
        </div>

        {podcast.description && (
          <p className="text-muted text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl mb-8 line-clamp-3">
            {podcast.description.replace(/<[^>]+>/g, '')}
          </p>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold">
            Tất cả tập ({podcast.episodes?.length || 0})
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {(!podcast.episodes || podcast.episodes.length === 0) ? (
            <div className="p-8 text-center bg-surface rounded-xl border border-border-color">
              <p className="text-muted text-sm">Chưa có tập phát sóng nào.</p>
            </div>
          ) : (
            podcast.episodes.map((episode: any) => {
              const isActive = currentEpisode?.id === episode.id;
              return (
                <div
                  key={episode.id}
                  onClick={() => handlePlayEpisode(episode)}
                  className={`group flex items-center gap-3 sm:gap-4 p-3 rounded-xl transition cursor-pointer border ${
                    isActive
                      ? 'bg-surface-hover border-primary/30'
                      : 'bg-surface hover:bg-surface-hover border-border-color/30'
                  }`}
                >
                  <button
                    className={`h-9 w-9 sm:h-10 sm:w-10 shrink-0 flex items-center justify-center rounded-full transition ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-surface-hover text-fg group-hover:bg-primary group-hover:text-white'
                    }`}
                    aria-label={isActive && isPlaying ? 'Tạm dừng' : 'Phát'}
                  >
                    {isActive && isPlaying ? (
                      <Pause className="fill-current w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Play className="fill-current w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-xs sm:text-sm md:text-base mb-1 truncate transition-colors ${
                        isActive ? 'text-primary' : 'text-fg'
                      }`}
                    >
                      {episode.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] sm:text-xs text-muted">
                      {episode.pubDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{' '}
                          {new Date(episode.pubDate).toLocaleDateString('vi-VN')}
                        </span>
                      ) : null}
                      {episode.duration ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {episode.duration}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

