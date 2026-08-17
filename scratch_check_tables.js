const { env } = require('./dist/config/env');
const axios = require('axios');

async function checkTables() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  const tables = ['movies', 'xtream_only_movies', 'stream_tmdb_mappings', 'xtream_only_stream_tmdb_mappings', 'home_categories'];
  for (const t of tables) {
    try {
      const res = await axios.get(`${env.SUPABASE_URL}/rest/v1/${t}?limit=1`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: '0-0',
          Prefer: 'count=exact',
        },
      });
      const count = res.headers['content-range']?.split('/')[1] || '0';
      const sample = res.data?.[0] ? Object.keys(res.data[0]) : [];
      console.log(`✅ Table [${t}]: ${count} rows. Columns:`, sample);
    } catch (err) {
      console.error(`❌ Table [${t}] Error (${err.response?.status}):`, err.response?.data?.message || err.message);
    }
  }
}

checkTables();
