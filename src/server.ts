import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { SupabaseService } from './services/supabase.service';
import { CategorizerService } from './services/categorizer.service';
import { CategoryGeneratorService } from './services/category_generator.service';
import { setupCronJobs } from './jobs/cron';

const app = express();
app.use(cors());
app.use(express.json());

const categorizer = new CategorizerService();
const generator = new CategoryGeneratorService();

// 1. Healthcheck Endpoint for Railway Zero-Downtime Deployments
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 2. Fetch Active Home Categories (Direct API Fallback)
app.get('/api/categories', async (req: Request, res: Response) => {
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

// 3. Admin Trigger: Manual Movie Categorization Sync
app.post('/api/sync/movies', async (req: Request, res: Response) => {
  try {
    const batchSize = parseInt(req.query.batch as string, 10) || 50;
    const result = await categorizer.syncUncategorizedMovies(batchSize);
    res.status(200).json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Admin Trigger: Manual Home Category Regeneration
app.post('/api/sync/categories', async (req: Request, res: Response) => {
  try {
    const result = await generator.generateAndSyncCategories();
    res.status(200).json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
const port = parseInt(env.PORT, 10) || 3000;
app.listen(port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Teraflix Categorization Backend Server Online`);
  console.log(`📍 Listening on port: ${port}`);
  console.log(`🔗 Healthcheck endpoint: http://localhost:${port}/health`);
  console.log(`=======================================================`);

  // Start background schedulers
  setupCronJobs();

  // Run initial category evaluation on boot
  console.log('[BOOT] Running initial dynamic categories scan...');
  generator.generateAndSyncCategories().catch((e) => {
    console.error('[BOOT] Initial category scan failed:', e.message);
  });
});
