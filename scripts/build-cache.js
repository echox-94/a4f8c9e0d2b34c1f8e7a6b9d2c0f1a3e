// scripts/build-cache.js
import fs from 'fs';

async function fetchAllKV() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const namespaceId = process.env.CF_KV_NAMESPACE_ID;
  const token = process.env.CF_API_TOKEN;

  if (!accountId || !namespaceId || !token) {
    throw new Error('Missing required environment variables');
  }

  // 1. List all keys in KV
  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys`;
  const listRes = await fetch(listUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const listData = await listRes.json();
  const keys = listData.result.map(k => k.name);

  console.log(`📦 Found ${keys.length} keys in KV.`);

  const cache = {};
  let count = 0;

  // 2. Fetch the value for each key (skipping locks)
  for (const key of keys) {
    if (key.startsWith('lock_')) continue;
    
    const valueUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`;
    const valueRes = await fetch(valueUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const value = await valueRes.text();
    cache[key] = value;
    count++;
  }

  // 3. Write to file
  fs.writeFileSync('cache.json', JSON.stringify(cache, null, 2));
  console.log(`✅ cache.json generated with ${count} entries.`);
}

fetchAllKV().catch(err => {
  console.error('❌ Failed to build cache:', err.message);
  process.exit(1);
});
