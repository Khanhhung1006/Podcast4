import { STATIC_PODCASTS } from './data/podcastsData';

export const API_URL = import.meta.env?.VITE_API_URL || '/api';

// In-memory cache for 0ms instant access
let memoryPodcastsCache: any[] = STATIC_PODCASTS;

// Initialize cache from localStorage if available
try {
  const localSaved = localStorage.getItem('app_cached_podcasts');
  if (localSaved) {
    const parsed = JSON.parse(localSaved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryPodcastsCache = parsed;
    }
  }
} catch (e) {
  // Ignore localStorage errors (e.g. privacy mode)
}

function savePodcastsToCache(podcasts: any[]) {
  if (Array.isArray(podcasts) && podcasts.length > 0) {
    memoryPodcastsCache = podcasts;
    try {
      localStorage.setItem('app_cached_podcasts', JSON.stringify(podcasts));
    } catch (e) {
      // Ignore quota errors
    }
  }
}

/**
 * Bulletproof JSON fetch with timeout and strict Content-Type validation.
 * Prevents HTML SPA fallbacks from breaking JSON parsing and never hangs forever.
 */
async function safeJsonFetch(url: string, timeoutMs = 2500): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Returned HTML (e.g. SPA fallback index.html) or other non-JSON content
      return null;
    }
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Helper to get all episodes from current podcast cache
 */
function getAllEpisodesFromCache(podcasts: any[] = memoryPodcastsCache) {
  const episodes: any[] = [];
  for (const p of podcasts) {
    if (Array.isArray(p.episodes)) {
      for (const ep of p.episodes) {
        episodes.push({
          ...ep,
          podcastTitle: ep.podcastTitle || p.title,
          image: ep.image || p.image,
        });
      }
    }
  }
  return episodes.sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0));
}

/**
 * Fetch podcast channels.
 * Returns instantly with cached data while checking backend in background.
 */
export async function fetchPodcasts(): Promise<any[]> {
  // 1. Try local/configured API backend with 2.5s timeout
  const data = await safeJsonFetch(`${API_URL}/podcasts`, 2500);
  if (Array.isArray(data) && data.length > 0) {
    // Preserve local episodes if server only returns channel metadata
    const merged = data.map((channel: any) => {
      const existing = memoryPodcastsCache.find((p) => p.id === channel.id);
      return {
        ...channel,
        episodes: (channel.episodes && channel.episodes.length > 0)
          ? channel.episodes
          : (existing?.episodes || []),
      };
    });
    savePodcastsToCache(merged);
    return merged.map(({ episodes, ...rest }) => rest);
  }

  // 2. Fallback to instant memory cache (0ms)
  const source = memoryPodcastsCache.length > 0 ? memoryPodcastsCache : STATIC_PODCASTS;
  return source.map(({ episodes, ...rest }) => rest);
}

/**
 * Fetch a single podcast with its episodes.
 */
export async function fetchPodcast(id: string): Promise<any> {
  // 1. Check if backend has details
  const data = await safeJsonFetch(`${API_URL}/podcasts/${id}`, 2500);
  if (data && data.title) {
    if (Array.isArray(data.episodes) && data.episodes.length > 0) {
      return data;
    }
  }

  // 2. Check instant memory cache
  const source = memoryPodcastsCache.length > 0 ? memoryPodcastsCache : STATIC_PODCASTS;
  const found = source.find((p) => p.id === id || p.title.toLowerCase().includes(id.toLowerCase()));
  if (found) {
    return found;
  }

  // Fallback to first available podcast
  return source[0];
}

/**
 * Fetch latest episodes across all channels.
 */
export async function fetchLatestEpisodes(limit = 20): Promise<any[]> {
  // 1. Try backend
  const data = await safeJsonFetch(`${API_URL}/episodes/latest?limit=${limit}`, 2500);
  if (Array.isArray(data) && data.length > 0) {
    return data;
  }

  // 2. Extract from instant memory cache
  const allEpisodes = getAllEpisodesFromCache(
    memoryPodcastsCache.length > 0 ? memoryPodcastsCache : STATIC_PODCASTS
  );

  return allEpisodes.slice(0, limit);
}

/**
 * Instant local + backend search.
 */
export async function searchPodcasts(query: string): Promise<{ podcasts: any[]; episodes: any[] }> {
  if (!query || !query.trim()) {
    return { podcasts: [], episodes: [] };
  }

  const q = query.trim().toLowerCase();

  // Instant in-memory search
  const source = memoryPodcastsCache.length > 0 ? memoryPodcastsCache : STATIC_PODCASTS;

  const localPodcasts = source
    .filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.author && p.author.toLowerCase().includes(q))
    )
    .map(({ episodes, ...rest }) => rest);

  const allEpisodes = getAllEpisodesFromCache(source);
  const localEpisodes = allEpisodes
    .filter(
      (e) =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.podcastTitle && e.podcastTitle.toLowerCase().includes(q))
    )
    .slice(0, 30);

  // Try background API search if available
  try {
    const apiRes = await safeJsonFetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, 2000);
    if (apiRes && (apiRes.podcasts?.length > 0 || apiRes.episodes?.length > 0)) {
      return {
        podcasts: apiRes.podcasts.length > 0 ? apiRes.podcasts : localPodcasts,
        episodes: apiRes.episodes.length > 0 ? apiRes.episodes : localEpisodes,
      };
    }
  } catch (e) {
    // Ignore backend search failure, return local
  }

  return { podcasts: localPodcasts, episodes: localEpisodes };
}

