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

// 9. Multi-Source Streaming Originals Knowledge Graph Sync
let multiSourceRunning = false;
app.post('/api/sync/multi-source', async (_req: Request, res: Response) => {
  if (multiSourceRunning) {
    return res.status(200).json({ success: true, message: 'Multi-source sync is already running in background.' });
  }
  res.status(200).json({ success: true, message: 'Multi-source sync started across all 10,244 titles. Check logs for live progress.' });

  multiSourceRunning = true;
  categorizer
    .syncMultiSourceStreamingOriginals(200)
    .then((r) => {
      console.log(`[BOOT] Multi-source sync complete: Tagged ${r.tagged} originals.`);
      generator.generateAndSyncCategories().catch(() => {});
    })
    .finally(() => {
      multiSourceRunning = false;
    });
});

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

  // Initialize Multi-Source Knowledge Graph (Wikipedia/IMDb/Wikidata)
  import('./services/streaming_sources.service').then(({ StreamingSourcesService }) => {
    StreamingSourcesService.getInstance()
      .initialize()
      .then(() => {
        // Run multi-source catalogue sync
        categorizer
          .syncMultiSourceStreamingOriginals(200)
          .then(() => {
            console.log('[BOOT] Multi-source sync complete. Refreshing home categories...');
            generator.generateAndSyncCategories().catch(() => {});
          })
          .catch((err) => {
            console.error('[BOOT] Multi-source sync error:', err.message);
          });
      })
      .catch((e) => {
        console.error('[BOOT] StreamingSourcesService init error:', e.message);
      });
  });

  // Run initial category evaluation on boot
  console.log('[BOOT] Running initial dynamic categories scan...');
  generator
    .generateAndSyncCategories()
    .catch((e) => {
      console.error('[BOOT] Initial category scan failed:', e.message);
    });
});

