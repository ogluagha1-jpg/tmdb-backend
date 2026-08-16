import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { SupabaseService } from './services/supabase.service';
import { CategorizerService } from './services/categorizer.service';
import { CategoryGeneratorService } from './services/category_generator.service';
import { MetricsService } from './services/metrics.service';
import { renderDashboardHtml } from './views/dashboard.html';
import { setupCronJobs } from './jobs/cron';

const app = express();
app.use(cors());
app.use(express.json());

const categorizer = new CategorizerService();
const generator = new CategoryGeneratorService();
const metrics = new MetricsService();

// 1. Interactive Admin Health & Live Metrics Web Dashboard
app.get(['/', '/dashboard'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderDashboardHtml());
});

// 2. Real-time Live Metrics Aggregation Endpoint
app.get('/api/metrics', async (_req: Request, res: Response) => {
  try {
    const data = await metrics.getDashboardMetrics();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Healthcheck Endpoint for Railway Zero-Downtime Deployments & Uptime Monitoring
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 4. Fetch Active Home Categories (Direct API Fallback)
app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const supabase = SupabaseService.getClient();
    const { data, error } = await supabase
      .from('home_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.status(200).json({ success: true, count: data?.length || 0, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

let rollingScanOffset = 0;

// 5. Admin Trigger: Manual Movie Categorization Sync
app.post('/api/sync/movies', async (req: Request, res: Response) => {
  try {
    const batchSize = parseInt(req.query.batch as string, 10) || 100;
    const requestedOffset = req.query.offset !== undefined ? parseInt(req.query.offset as string, 10) : rollingScanOffset;
    const result = await categorizer.syncUncategorizedMovies(batchSize, requestedOffset);
    
    // Auto-advance cursor through all 10,244 movies
    rollingScanOffset = (requestedOffset + batchSize) % 10300;

    res.status(200).json({
      success: true,
      scannedOffset: requestedOffset,
      nextOffset: rollingScanOffset,
      result: {
        ...result,
        message: `Scanned titles #${requestedOffset}-${requestedOffset + batchSize}: Updated ${result.updated} movies! Next batch will scan from #${rollingScanOffset}.`
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Admin Trigger: Manual Home Category Regeneration
app.post('/api/sync/categories', async (_req: Request, res: Response) => {
  try {
    const result = await generator.generateAndSyncCategories();
    res.status(200).json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Admin Real-Time Category Creator
app.post('/api/categories/create', async (req: Request, res: Response) => {
  try {
    const { title, title_ar, filter_query, category_type, order_by } = req.body;
    if (!title || !filter_query) {
      return res.status(400).json({ success: false, error: 'English Title and Filter Query are required.' });
    }

    const count = await generator.countQueryForFilter(filter_query);
    if (count < 1) {
      return res.status(400).json({ success: false, error: `No movies in database match filter: ${filter_query}` });
    }

    const id = 'custom_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
    const supabase = SupabaseService.getClient();
    const { data, error } = await supabase
      .from('home_categories')
      .upsert({
        id,
        title: title.toUpperCase(),
        title_ar: title_ar || null,
        category_type: category_type || 'thematic',
        filter_query,
        order_by: order_by || 'popularity.desc',
        movie_count: count,
        sort_order: 99,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;
    res.status(200).json({ success: true, count, category: data?.[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Admin Real-Time Category Deletion
app.delete('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supabase = SupabaseService.getClient();
    const { error } = await supabase.from('home_categories').delete().eq('id', id);
    if (error) throw error;
    res.status(200).json({ success: true, message: `Category "${id}" deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Watch Provider Re-Scan: Injects streaming platform tags into existing enriched movies
let wpScanOffset = 0;
let wpScanRunning = false;

app.post('/api/sync/watch-providers', async (req: Request, res: Response) => {
  if (wpScanRunning) {
    return res.status(200).json({ success: true, message: 'Watch provider scan already running in background.' });
  }
  const batchSize = parseInt(req.query.batch as string, 10) || 50;
  const fullScan = req.query.full === 'true';
  if (fullScan) wpScanOffset = 0;

  res.status(200).json({ success: true, message: `Watch provider re-scan started from offset ${wpScanOffset}. Check logs for progress.` });

  // Run in background
  wpScanRunning = true;
  runWatchProviderScan(batchSize).finally(() => { wpScanRunning = false; });
});

async function runWatchProviderScan(batchSize: number) {
  const supabase = SupabaseService.getClient();
  const tmdb = new (await import('./services/tmdb.service')).TmdbService();
  let totalInjected = 0;

  // Major studio IDs — movies with these are NOT streaming originals
  const MAJOR_STUDIO_IDS = new Set([
    174, 429, 9993, 12, 128064, 33, 67, 33413, 10338, 5, 34, 84, 2251, 559,
    4, 24955, 2348, 8302, 333, 2, 6125, 5218, 127928, 25, 787, 9383, 1632, 35, 85885, 1634,
  ]);
  const STREAMING_PLATFORMS = [
    { providerId: 8, studioId: 178464, name: 'Netflix', logo: '/pbpMk2JmcoNnQwB5JGpXAbmLui6.png', country: 'US' },
    { providerId: 1796, studioId: 178464, name: 'Netflix', logo: '/pbpMk2JmcoNnQwB5JGpXAbmLui6.png', country: 'US' },
    { providerId: 350, studioId: 194232, name: 'Apple Studios', logo: '/4KAy34EHvRM25Ih8wb82AuGU7zJ.png', country: 'US' },
    { providerId: 9, studioId: 20580, name: 'Amazon Studios', logo: '/5GIBEqGoNzhAGkwGMzgdUiMFhIP.png', country: 'US' },
    { providerId: 119, studioId: 20580, name: 'Amazon Studios', logo: '/5GIBEqGoNzhAGkwGMzgdUiMFhIP.png', country: 'US' },
  ];
  const STREAMING_STUDIO_IDS = new Set(STREAMING_PLATFORMS.map(p => p.studioId));

  console.log(`[WP-SCAN] 🚀 Starting watch provider re-scan from offset ${wpScanOffset}...`);

  while (true) {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, tmdb_id, studios_json')
      .order('id', { ascending: true })
      .range(wpScanOffset, wpScanOffset + batchSize - 1);

    if (error || !movies || movies.length === 0) {
      console.log(`[WP-SCAN] ✅ Scan complete! Total streaming tags injected: ${totalInjected}`);
      break;
    }

    // Filter to movies that: have tmdb_id, have studios, but DON'T already have a streaming tag
    const candidates = movies.filter((m: any) => {
      if (!m.tmdb_id) return false;
      const studios = m.studios_json || [];
      const hasMajor = studios.some((s: any) => MAJOR_STUDIO_IDS.has(s.id));
      if (hasMajor) return false; // Major studio owns it — skip
      const hasStreaming = studios.some((s: any) => STREAMING_STUDIO_IDS.has(s.id));
      if (hasStreaming) return false; // Already has streaming tag — skip
      return true;
    });

    if (candidates.length > 0) {
      console.log(`[WP-SCAN] [Offset ${wpScanOffset}] Processing ${candidates.length}/${movies.length} candidates...`);

      for (const movie of candidates) {
        try {
          const providers = await tmdb.getWatchProviders(movie.tmdb_id);
          const providerIds = new Set(providers.map(p => p.id));
          const studios = [...(movie.studios_json || [])];
          const existingIds = new Set(studios.map((s: any) => s.id));
          let injected = false;

          for (const platform of STREAMING_PLATFORMS) {
            if (providerIds.has(platform.providerId) && !existingIds.has(platform.studioId)) {
              studios.push({
                id: platform.studioId,
                name: platform.name,
                logo_path: platform.logo,
                origin_country: platform.country,
              });
              existingIds.add(platform.studioId);
              injected = true;
            }
          }

          if (injected) {
            await supabase.from('movies').update({ studios_json: studios }).eq('id', movie.id);
            totalInjected++;
          }
        } catch {
          // Skip individual failures
        }
      }
    }

    wpScanOffset += movies.length;
    console.log(`[WP-SCAN] Progress: ${wpScanOffset} movies scanned, ${totalInjected} streaming tags injected.`);
    await new Promise(r => setTimeout(r, 200));
  }
}

// Start Server
const port = parseInt(env.PORT, 10) || 3000;
app.listen(port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Teraflix Categorization Backend Server Online`);
  console.log(`📍 Listening on port: ${port}`);
  console.log(`📊 Admin Web Dashboard: http://localhost:${port}/dashboard`);
  console.log(`🔗 Healthcheck endpoint: http://localhost:${port}/health`);
  console.log(`=======================================================`);

  // Start background schedulers
  setupCronJobs();

  // Run initial category evaluation on boot
  console.log('[BOOT] Running initial dynamic categories scan...');
  generator
    .generateAndSyncCategories()
    .then(() => {
      // Start background continuous movie enrichment pipeline
      categorizer
        .startContinuousEnrichment(200)
        .then(() => {
          console.log('[BOOT] Enrichment pass finished. Starting watch provider scan...');
          // Auto-start watch provider re-scan after enrichment completes
          wpScanRunning = true;
          runWatchProviderScan(50).finally(() => {
            wpScanRunning = false;
            console.log('[BOOT] Watch provider scan finished. Refreshing categories...');
            generator.generateAndSyncCategories().catch((err) => {
              console.error('[BOOT] Refresh categories failed:', err.message);
            });
          });
        })
        .catch((e) => {
          console.error('[BOOT] Continuous enrichment error:', e.message);
        });
    })
    .catch((e) => {
      console.error('[BOOT] Initial category scan failed:', e.message);
    });
});

