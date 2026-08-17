import { SupabaseService } from './supabase.service';
import { CategorizerService } from './categorizer.service';
import { CategoryGeneratorService } from './category_generator.service';

export interface AutoScannerStatus {
  isRunning: boolean;
  isPaused: boolean;
  totalMovies: number;
  enrichedMovies: number;
  unenrichedRemaining: number;
  completionPct: number;
  currentBatchOffset: number;
  totalProcessedThisSession: number;
  lastScannedTitle: string;
  lastError: string | null;
  startedAt: string | null;
  lastActiveAt: string | null;
}

/**
 * AutoScannerService:
 * Cooperative Background Watcher & Health Monitor.
 * Monitors database saturation, coordinates with local Python ingestion,
 * and maintains fresh Home Categories without redundant TMDB scraping.
 */
export class AutoScannerService {
  private static instance: AutoScannerService;
  private categorizer: CategorizerService;
  private generator: CategoryGeneratorService;

  private isRunning = false;
  private isPaused = false;
  private totalProcessedThisSession = 0;
  private lastScannedTitle = '';
  private lastError: string | null = null;
  private startedAt: string | null = null;
  private lastActiveAt: string | null = null;
  private currentBatchOffset = 0;

  private constructor() {
    this.categorizer = new CategorizerService();
    this.generator = new CategoryGeneratorService();
  }

  public static getInstance(): AutoScannerService {
    if (!AutoScannerService.instance) {
      AutoScannerService.instance = new AutoScannerService();
    }
    return AutoScannerService.instance;
  }

  /// Start or resume cooperative background watcher
  public start(): void {
    if (this.isRunning && !this.isPaused) return;

    this.isRunning = true;
    this.isPaused = false;
    if (!this.startedAt) this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();

    console.log('[AUTO-SCANNER] 🚀 Cooperative background watcher online.');
    this.runContinuousLoop().catch((err) => {
      console.error('[AUTO-SCANNER] Fatal loop error:', err.message);
      this.isRunning = false;
    });
  }

  /// Pause watcher
  public pause(): void {
    this.isPaused = true;
    console.log('[AUTO-SCANNER] ⏸️ Cooperative watcher paused.');
  }

  /// Trigger full streaming originals sync and category regeneration
  public async resetAndRescanAll(): Promise<{ resetCount: number }> {
    console.log('[AUTO-SCANNER] 🔄 Initiating full category & streaming sync...');

    this.totalProcessedThisSession = 0;
    this.currentBatchOffset = 0;
    this.lastError = null;
    this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();
    this.isPaused = false;

    // Run streaming sync and category refresh
    const res = await this.categorizer.syncUncategorizedMovies(200);

    return { resetCount: res.processed };
  }

  /// Trigger a single discrete batch scan / audit
  public async scanBatch(batchSize: number = 200): Promise<{ processed: number; updated: number }> {
    this.lastActiveAt = new Date().toISOString();
    const res = await this.categorizer.syncUncategorizedMovies(batchSize);
    this.totalProcessedThisSession += res.processed;
    return { processed: res.processed, updated: res.updated };
  }

  /// Continuous cooperative loop
  private async runContinuousLoop(): Promise<void> {
    let lastEnrichedCount = -1;

    while (this.isRunning) {
      if (this.isPaused) {
        await this.delay(3000);
        continue;
      }

      try {
        const supabase = SupabaseService.getClient();

        // Check current database saturation
        const { count: enrichedCount, error } = await supabase
          .from('movies')
          .select('id', { count: 'exact', head: true })
          .not('enriched_at', 'is', null);

        if (error) {
          this.lastError = error.message;
          await this.delay(10000);
          continue;
        }

        const currentEnriched = enrichedCount || 0;
        this.lastActiveAt = new Date().toISOString();

        // If new movies were enriched by the Python engine, update home categories!
        if (lastEnrichedCount !== -1 && currentEnriched !== lastEnrichedCount) {
          console.log(`[AUTO-SCANNER] 📡 Detected database update (${currentEnriched} enriched movies, diff: +${currentEnriched - lastEnrichedCount}). Refreshing home categories...`);
          await this.generator.generateAndSyncCategories().catch((e) => {
            console.error('[AUTO-SCANNER] Category refresh error:', e.message);
          });
        }

        lastEnrichedCount = currentEnriched;

        // Polite polling interval (every 60 seconds)
        await this.delay(60000);
      } catch (err: any) {
        this.lastError = err.message;
        console.error('[AUTO-SCANNER] Watcher cycle error:', err.message);
        await this.delay(10000);
      }
    }
  }

  /// Get status metrics for UI dashboard
  public async getStatus(): Promise<AutoScannerStatus> {
    const supabase = SupabaseService.getClient();

    const [totalRes, enrichedRes] = await Promise.all([
      supabase.from('movies').select('id', { count: 'exact', head: true }),
      supabase.from('movies').select('id', { count: 'exact', head: true }).not('enriched_at', 'is', null),
    ]);

    const totalMovies = totalRes.count || 0;
    const enrichedMovies = enrichedRes.count || 0;
    const unenrichedRemaining = Math.max(0, totalMovies - enrichedMovies);
    const completionPct = totalMovies > 0 ? Math.round((enrichedMovies / totalMovies) * 1000) / 10 : 0;

    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      totalMovies,
      enrichedMovies,
      unenrichedRemaining,
      completionPct,
      currentBatchOffset: this.currentBatchOffset,
      totalProcessedThisSession: this.totalProcessedThisSession,
      lastScannedTitle: this.lastScannedTitle,
      lastError: this.lastError,
      startedAt: this.startedAt,
      lastActiveAt: this.lastActiveAt,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
