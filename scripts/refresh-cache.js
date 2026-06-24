// scripts/refresh-cache.js
const CACHE_URL = 'https://raw.githubusercontent.com/echox-94/a4f8c9e0d2b34c1f8e7a6b9d2c0f1a3e/main/cache.json';
const WORKER_URL = 'https://a4f8c9e0d2b34c1f8e7a6b9d2c0f1a3e.app-pulse.workers.dev';
const DELAY_MS = 2000;

async function refreshAll() {
  console.log('📥 Fetching current cache...');
  const response = await fetch(CACHE_URL);
  if (!response.ok) throw new Error(`Failed to fetch cache: ${response.status}`);
  const cache = await response.json();
  const entries = Object.keys(cache);
  console.log(`📦 Found ${entries.length} cached entries.`);

  let successCount = 0;
  let failCount = 0;

  for (const key of entries) {
    if (key.startsWith('lock_')) continue;

    let tmdbId, season, episode;
    if (key.startsWith('movie_')) {
      tmdbId = key.replace('movie_', '');
    } else if (key.startsWith('tv_')) {
      const parts = key.replace('tv_', '').split('_');
      tmdbId = parts[0];
      season = parts[1];
      episode = parts[2];
    } else {
      console.warn(`⚠️ Skipping unknown key: ${key}`);
      continue;
    }

    const url = new URL(WORKER_URL);
    url.searchParams.append('tmdb', tmdbId);
    if (season) url.searchParams.append('season', season);
    if (episode) url.searchParams.append('episode', episode);
    url.searchParams.append('force', 'true');

    console.log(`🔄 Refreshing ${key}...`);
    try {
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.m3u8) {
          successCount++;
          console.log(`✅ ${key} updated`);
        } else {
          failCount++;
          console.warn(`⚠️ ${key} returned no m3u8`);
        }
      } else {
        failCount++;
        console.error(`❌ ${key} failed: ${res.status}`);
      }
    } catch (err) {
      failCount++;
      console.error(`❌ ${key} error: ${err.message}`);
    }

    // Wait to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  console.log(`\n🎉 Refresh complete. Success: ${successCount}, Failed: ${failCount}`);
}

refreshAll().catch(console.error);
