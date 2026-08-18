import cron from 'node-cron';
import { env } from '../config/env';
import { CategorizerService } from '../services/categorizer.service';
import { CategoryGeneratorService } from '../services/category_generator.service';

export function setupCronJobs(): void {
  const categorizer = new CategorizerService();
  const generator = new CategoryGeneratorService();

  console.log('[CRON] Initializing automated background schedulers...');

  // 1. Movie Enrichment Sync (Runs on MOVIES_SYNC_CRON_SCHEDULE, e.g. every 2 hours)
  cron.schedule(env.MOVIES_SYNC_CRON_SCHEDULE, async () => {
    console.log('[CRON] Executing scheduled movie categorization sync...');
    try {
      await categorizer.syncUncategorizedMovies(100);
    } catch (e: any) {
      console.error('[CRON] Error during movie categorization sync:', e.message);
    }
  });
  console.log(`[CRON] Scheduled movie enrichment: ${env.MOVIES_SYNC_CRON_SCHEDULE}`);

  // 2. Home Categories Regeneration (Runs on CATEGORIES_CRON_SCHEDULE, e.g. every 6 hours)
  cron.schedule(env.CATEGORIES_CRON_SCHEDULE, async () => {
    console.log('[CRON] Executing scheduled home category regeneration...');
    try {
      await generator.generateAndSyncCategories();
    } catch (e: any) {
      console.error('[CRON] Error during category regeneration:', e.message);
    }
  });
  console.log(`[CRON] Scheduled category regeneration: ${env.CATEGORIES_CRON_SCHEDULE}`);
}
