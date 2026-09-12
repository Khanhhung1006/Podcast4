import { STATIC_PODCASTS } from './src/data/podcastsData';
import { fetchPodcasts, fetchLatestEpisodes } from './src/api';

async function main() {
  console.log("STATIC_PODCASTS channels count:", STATIC_PODCASTS.length);
  const p = await fetchPodcasts();
  console.log("fetchPodcasts returns:", p.length);
  const eps = await fetchLatestEpisodes(10);
  console.log("fetchLatestEpisodes returns:", eps.length);
}
main();
