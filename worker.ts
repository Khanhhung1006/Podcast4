import { STATIC_PODCASTS } from './src/data/podcastsData';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API Routes for Cloudflare Workers
    if (url.pathname.startsWith('/api/')) {
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      // GET /api/podcasts
      if (url.pathname === '/api/podcasts') {
        const channels = STATIC_PODCASTS.map(({ episodes, ...rest }) => rest);
        return new Response(JSON.stringify(channels), { headers });
      }

      // GET /api/episodes/latest
      if (url.pathname === '/api/episodes/latest') {
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const allEpisodes: any[] = [];
        for (const p of STATIC_PODCASTS) {
          if (Array.isArray(p.episodes)) {
            for (const ep of p.episodes) {
              allEpisodes.push({
                ...ep,
                podcastTitle: ep.podcastTitle || p.title,
                image: ep.image || p.image,
              });
            }
          }
        }
        allEpisodes.sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0));
        return new Response(JSON.stringify(allEpisodes.slice(0, limit)), { headers });
      }

      // GET /api/podcasts/:id
      if (url.pathname.startsWith('/api/podcasts/')) {
        const id = url.pathname.replace('/api/podcasts/', '');
        const found = STATIC_PODCASTS.find(
          (p) => p.id === id || p.title.toLowerCase().includes(id.toLowerCase())
        );
        if (found) {
          return new Response(JSON.stringify(found), { headers });
        }
        return new Response(JSON.stringify({ error: 'Podcast not found' }), {
          status: 404,
          headers,
        });
      }

      // GET /api/search?q=
      if (url.pathname === '/api/search') {
        const q = (url.searchParams.get('q') || '').toLowerCase().trim();
        const results = STATIC_PODCASTS.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        ).map(({ episodes, ...rest }) => rest);
        return new Response(JSON.stringify(results), { headers });
      }

      return new Response(JSON.stringify({ status: 'ok' }), { headers });
    }

    // Serve static frontend assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
