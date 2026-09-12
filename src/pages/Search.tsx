import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchPodcasts } from '../api';
import { Search as SearchIcon, Play, Pause, Calendar, Tag, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore, Episode } from '../store/playerStore';

const POPULAR_TAGS = [
  'Tài chính',
  'Phát triển bản thân',
  'Thiền',
  'Kỹ năng sống',
  'HIEU.TV',
  'Minh Niệm',
  'Sách nói',
  'Tâm sự',
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { play, togglePlay, isPlaying, currentEpisode } = usePlayerStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchPodcasts(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  const handlePlayEpisode = (episode: Episode) => {
    if (currentEpisode?.id === episode.id) {
      togglePlay();
    } else {
      play(episode, results?.episodes || []);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="sticky top-0 z-20 bg-bg/90 backdrop-blur-xl pb-4 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-muted" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 sm:py-3.5 bg-surface border border-border-color rounded-2xl text-fg placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm sm:text-base"
            placeholder="Tìm kênh podcast, tác giả, hoặc chủ đề..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 pb-1">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition border ${
                query.toLowerCase() === tag.toLowerCase()
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface hover:bg-surface-hover text-muted hover:text-fg border-border-color/50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {!debouncedQuery ? (
          <div className="text-center py-16 sm:py-24 text-muted">
            <SearchIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-base sm:text-lg font-medium text-fg">Khám phá nội dung bạn yêu thích</h3>
            <p className="text-xs sm:text-sm text-muted mt-1">Chọn từ khóa gợi ý phía trên hoặc nhập tên podcast để tìm kiếm tức thì.</p>
          </div>
        ) : isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-surface rounded-xl" />
            <div className="h-20 bg-surface rounded-xl" />
            <div className="h-20 bg-surface rounded-xl" />
          </div>
        ) : results && (results.podcasts.length > 0 || results.episodes.length > 0) ? (
          <div className="space-y-8">
            {/* Podcasts Results */}
            {results.podcasts.length > 0 && (
              <section>
                <h2 className="text-lg sm:text-xl font-bold mb-4">
                  Kênh Podcast ({results.podcasts.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {results.podcasts.map((podcast: any) => (
                    <Link
                      to={`/podcast/${podcast.id}`}
                      key={podcast.id}
                      className="group bg-surface hover:bg-surface-hover p-3 sm:p-4 rounded-xl transition-all duration-300 border border-transparent hover:border-border-color"
                    >
                      <div className="aspect-square rounded-lg bg-gray-800 mb-3 overflow-hidden shadow-md group-hover:shadow-xl transition">
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
              </section>
            )}

            {/* Episodes Results */}
            {results.episodes.length > 0 && (
              <section>
                <h2 className="text-lg sm:text-xl font-bold mb-4">
                  Tập Podcast ({results.episodes.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {results.episodes.map((episode: any) => {
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
                            className={`font-semibold text-xs sm:text-sm md:text-base mb-1 truncate transition-colors ${
                              isActive ? 'text-primary' : 'text-fg'
                            }`}
                          >
                            {episode.title}
                          </h3>
                          <div className="flex items-center gap-3 text-[11px] sm:text-xs text-muted">
                            <span className="truncate max-w-[150px]">{episode.podcastTitle}</span>
                            {episode.pubDate ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />{' '}
                                {new Date(episode.pubDate).toLocaleDateString('vi-VN')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-muted">
            <p className="text-base">Không tìm thấy kết quả nào cho "{debouncedQuery}"</p>
            <p className="text-xs text-muted mt-1">Hãy thử với từ khóa khác như "HIEU.TV", "Thiền", "Tài chính"...</p>
          </div>
        )}
      </div>
    </div>
  );
}

