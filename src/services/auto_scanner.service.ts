import { SupabaseService } from './supabase.service';
import { CategorizerService } from './categorizer.service';
import { CategoryGeneratorService } from './category_generator.service';

export interface AutoScannerStatus {
  isRunning: boolean;
  isPaused: boolean;
  totalMovies: number;
  enrichedMovies: number;
  unenrichedRemaining: number;
  gapMoviesCount: number;
  completionPct: number;
  currentBatchOffset: number;
  totalProcessedThisSession: number;
  totalGapFilledThisSession: number;
  lastScannedTitle: string;
  lastError: string | null;
  startedAt: string | null;
  lastActiveAt: string | null;
  isAiGapFillEnabled: boolean;
}

/**
 * AutoScannerService — Real-Time Cooperative Multi-Engine Background Scanner
 *
 * Real-time features:
 * 1. Watches for new database entries every 5 seconds (0 wait time on new Python inserts)
 * 2. Processes backlog in continuous rapid ticks (500ms between batches)
 * 3. Updates `lastScannedTitle` in real-time for live UI dashboard reflection
 * 4. Advances database queue automatically (stamps `enriched_at` on every title)
 */
export class AutoScannerService {
  private static instance: AutoScannerService;
  private categorizer: CategorizerService;
  private generator: CategoryGeneratorService;

  private isRunning = false;
  private isPaused = false;
  private totalProcessedThisSession = 0;
  private totalGapFilledThisSession = 0;
  private lastScannedTitle = 'Initializing multi-engine watcher...';
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

  /// Start or resume real-time cooperative scanner
  public start(): void {
    if (this.isRunning && !this.isPaused) return;

    this.isRunning = true;
    this.isPaused = false;
    if (!this.startedAt) this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();
    this.lastScannedTitle = 'Real-time multi-engine scanner active';

    console.log('[AUTO-SCANNER] 🚀 Real-time cooperative multi-engine scanner online.');
    this.runContinuousLoop().catch((err) => {
      console.error('[AUTO-SCANNER] Fatal loop error:', err.message);
      this.isRunning = false;
    });
  }

  /// Pause scanner
  public pause(): void {
    this.isPaused = true;
    this.lastScannedTitle = 'Paused by admin';
    console.log('[AUTO-SCANNER] ⏸️ Scanner paused by admin.');
  }

  /// Reset all timestamps and run full catalog multi-engine rescan
  public async resetAndRescanAll(): Promise<{ resetCount: number }> {
    console.log('[AUTO-SCANNER] 🔄 Initiating full catalog multi-engine rescan...');
    const supabase = SupabaseService.getClient();

    this.totalProcessedThisSession = 0;
    this.totalGapFilledThisSession = 0;
    this.currentBatchOffset = 0;
    this.lastError = null;
    this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();
    this.isPaused = false;
    this.isRunning = true;
    this.lastScannedTitle = 'Resetting catalogue timestamps...';

    // Clear enriched_at to allow full fresh pass across all engines
    await supabase
      .from('movies')
      .update({ enriched_at: null })
      .not('id', 'is', null);

    console.log('[AUTO-SCANNER] ✅ Catalogue timestamps reset. Starting active loop...');
    this.start();

    // Trigger immediate first batch
    const res = await this.categorizer.syncUncategorizedMovies(100, (title) => {
      this.lastScannedTitle = title;
      this.lastActiveAt = new Date().toISOString();
    });

    this.totalProcessedThisSession += res.processed;
    this.totalGapFilledThisSession += res.updated;

    return { resetCount: res.processed };
  }

  /// Trigger a single discrete batch scan / audit
  public async scanBatch(batchSize: number = 200): Promise<{ processed: number; updated: number }> {
    this.lastActiveAt = new Date().toISOString();
    this.lastScannedTitle = `Processing batch (${batchSize} titles)...`;
    console.log(`[AUTO-SCANNER] 📋 Running cooperative batch scan (limit: ${batchSize})...`);

    const result = await this.categorizer.syncUncategorizedMovies(batchSize, (title) => {
      this.lastScannedTitle = title;
      this.lastActiveAt = new Date().toISOString();
    });

    this.totalProcessedThisSession += result.processed;
    this.totalGapFilledThisSession += result.updated;
    this.lastScannedTitle = `Batch complete: ${result.updated}/${result.processed} updated`;

    return {
      processed: result.processed,
      updated: result.updated,
    };
  }

  /// Real-time continuous cooperative processing loop
  private async runContinuousLoop(): Promise<void> {
    while (this.isRunning) {
      if (this.isPaused) {
        await this.delay(2000);
        continue;
      }

      try {
        const supabase = SupabaseService.getClient();

        // 1. Check real-time database state
        const [totalRes, unenrichedRes, gapRes] = await Promise.all([
          supabase.from('movies').select('id', { count: 'exact', head: true }),
          supabase.from('movies').select('id', { count: 'exact', head: true }).is('enriched_at', null),
          supabase.from('movies').select('id', { count: 'exact', head: true }).or('title_ar.is.null,overview_ar.is.null,tagline.is.null,tagline_ar.is.null,studios_json.is.null,studios_json.eq.[]'),
        ]);

        const totalMovies = totalRes.count || 0;
        const unenrichedCount = unenrichedRes.count || 0;
        const gapCount = gapRes.count || 0;
        this.lastActiveAt = new Date().toISOString();

        // CASE A: Newly inserted / unenriched records exist -> PROCESS IMMEDIATELY
        if (unenrichedCount > 0) {
          const batchSize = Math.min(unenrichedCount, 50);
          console.log(`[AUTO-SCANNER] ⚡ Real-time backlog: ${unenrichedCount} unenriched movies found. Processing batch of ${batchSize}...`);

          const result = await this.categorizer.syncUncategorizedMovies(batchSize, (title) => {
            this.lastScannedTitle = title;
            this.lastActiveAt = new Date().toISOString();
          });

          this.totalProcessedThisSession += result.processed;
          this.totalGapFilledThisSession += result.updated;

          // Short breather between active batches (500ms) to allow rapid processing
          await this.delay(500);
          continue;
        }

        // CASE B: Existing movies have missing fields -> Steadily upgrade catalog
        if (gapCount > 0) {
          const batchSize = Math.min(gapCount, 25);
          console.log(`[AUTO-SCANNER] 🔍 Gap resolution: ${gapCount} titles with missing fields. Processing batch of ${batchSize}...`);

          const result = await this.categorizer.syncUncategorizedMovies(batchSize, (title) => {
            this.lastScannedTitle = title;
            this.lastActiveAt = new Date().toISOString();
          });

          this.totalProcessedThisSession += result.processed;
          this.totalGapFilledThisSession += result.updated;

          // 2-second pace when working on secondary gap upgrades
          await this.delay(2000);
          continue;
        }

        // CASE C: Catalog is 100% saturated -> Idle polling for new Python inserts
        this.lastScannedTitle = `Idle / Real-Time Watcher Online (${totalMovies} movies saturated)`;
        await this.delay(5000); // Check every 5 seconds for new arrivals
      } catch (err: any) {
        this.lastError = err.message;
        this.lastScannedTitle = `Error: ${err.message}`;
        console.error('[AUTO-SCANNER] Real-time loop notice:', err.message);
        await this.delay(5000);
      }
    }
  }

  /// Get status metrics for UI dashboard
  public async getStatus(): Promise<AutoScannerStatus> {
    const supabase = SupabaseService.getClient();

    const [totalRes, enrichedRes, gapRes] = await Promise.all([
      supabase.from('movies').select('id', { count: 'exact', head: true }),
      supabase.from('movies').select('id', { count: 'exact', head: true }).not('enriched_at', 'is', null),
      supabase.from('movies').select('id', { count: 'exact', head: true }).or('title_ar.is.null,overview_ar.is.null,tagline.is.null,tagline_ar.is.null,studios_json.is.null,studios_json.eq.[]'),
    ]);

    const totalMovies = totalRes.count || 0;
    const enrichedMovies = enrichedRes.count || 0;
    const gapMoviesCount = gapRes.count || 0;
    const unenrichedRemaining = Math.max(0, totalMovies - enrichedMovies);
    const completionPct = totalMovies > 0 ? Math.round((enrichedMovies / totalMovies) * 1000) / 10 : 0;

    // Check if AI gap-fill is admin-enabled
    let isAiGapFillEnabled = false;
    try {
      const { GeminiPoolService } = await import('./gemini_pool.service');
      isAiGapFillEnabled = GeminiPoolService.getInstance().isAiEnabled();
    } catch {}

    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      totalMovies,
      enrichedMovies,
      unenrichedRemaining,
      gapMoviesCount,
      completionPct,
      currentBatchOffset: this.currentBatchOffset,
      totalProcessedThisSession: this.totalProcessedThisSession,
      totalGapFilledThisSession: this.totalGapFilledThisSession,
      lastScannedTitle: this.lastScannedTitle,
      lastError: this.lastError,
      startedAt: this.startedAt,
      lastActiveAt: this.lastActiveAt,
      isAiGapFillEnabled,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
