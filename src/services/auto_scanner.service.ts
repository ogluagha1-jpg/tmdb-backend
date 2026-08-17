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
}

/**
 * AutoScannerService — Cooperative Multi-Engine Background Processor
 *
 * This does NOT re-scrape TMDB (that is handled by the local Python engine).
 * Instead it focuses on:
 *   1. Identifying movies with MISSING fields (title_ar, overview_ar, studios_json, keywords_json)
 *   2. Using AI engines (Gemini / Groq) to fill those gaps cooperatively
 *   3. Tagging streaming platform originals (Netflix, Apple TV+, Disney+, etc.)
 *   4. Refreshing dynamic home categories after processing
 */
export class AutoScannerService {
  private static instance: AutoScannerService;
  private categorizer: CategorizerService;
  private generator: CategoryGeneratorService;

  private isRunning = false;
  private isPaused = false;
  private totalProcessedThisSession = 0;
  private totalGapFilledThisSession = 0;
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

  /// Start or resume cooperative background scanner
  public start(): void {
    if (this.isRunning && !this.isPaused) return;

    this.isRunning = true;
    this.isPaused = false;
    if (!this.startedAt) this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();

    console.log('[AUTO-SCANNER] 🚀 Cooperative multi-engine background scanner started.');
    this.runContinuousLoop().catch((err) => {
      console.error('[AUTO-SCANNER] Fatal loop error:', err.message);
      this.isRunning = false;
    });
  }

  /// Pause scanning
  public pause(): void {
    this.isPaused = true;
    console.log('[AUTO-SCANNER] ⏸️ Scanner paused by admin.');
  }

  /// Full rescan: streaming originals + AI gap fill + category regeneration
  public async resetAndRescanAll(): Promise<{ resetCount: number }> {
    console.log('[AUTO-SCANNER] 🔄 Initiating full cooperative rescan...');

    this.totalProcessedThisSession = 0;
    this.totalGapFilledThisSession = 0;
    this.currentBatchOffset = 0;
    this.lastError = null;
    this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();
    this.isPaused = false;

    // 1. Tag streaming originals across entire database
    const originalsResult = await this.categorizer.syncMultiSourceStreamingOriginals(200);

    // 2. Run cooperative AI gap-fill on movies missing fields
    const gapResult = await this.runCooperativeBatchGapFill(5000);

    // 3. Regenerate home categories
    await this.generator.generateAndSyncCategories().catch(() => {});

    this.totalProcessedThisSession = originalsResult.processed;
    this.totalGapFilledThisSession = gapResult.enriched;

    // 4. Start continuous watcher loop
    this.start();

    return { resetCount: originalsResult.processed };
  }

  /// Trigger a single discrete batch scan
  public async scanBatch(batchSize: number = 200): Promise<{ processed: number; updated: number }> {
    this.lastActiveAt = new Date().toISOString();
    console.log(`[AUTO-SCANNER] 📋 Running cooperative batch scan (limit: ${batchSize})...`);

    // 1. Tag streaming originals
    const originalsResult = await this.categorizer.syncMultiSourceStreamingOriginals(batchSize);

    // 2. Run cooperative AI gap-fill on movies missing fields
    const gapResult = await this.runCooperativeBatchGapFill(batchSize);

    // 3. Regenerate home categories
    await this.generator.generateAndSyncCategories().catch(() => {});

    this.totalProcessedThisSession += originalsResult.processed;
    this.totalGapFilledThisSession += gapResult.enriched;

    return {
      processed: originalsResult.processed,
      updated: originalsResult.tagged + gapResult.enriched,
    };
  }

  /**
   * Cooperative AI Gap-Fill: Finds movies missing Arabic metadata, studios, or keywords
   * and uses Gemini / Groq AI to fill those gaps.
   * This does NOT re-scrape TMDB. It only targets fields the Python engine couldn't resolve.
   */
  private async runCooperativeBatchGapFill(maxTitles: number): Promise<{ totalGaps: number; enriched: number; failed: number }> {
    try {
      const { GeminiPoolService } = await import('./gemini_pool.service');
      const pool = GeminiPoolService.getInstance();
      const metrics = pool.getPoolMetrics();

      // Check if any AI keys are available (Gemini or Groq)
      const hasAiKeys = metrics.totalKeys > 0 || (metrics.groq?.isConfigured ?? false);
      if (!hasAiKeys) {
        console.log('[AUTO-SCANNER] ℹ️ No AI keys configured (Gemini or Groq). Skipping gap-fill. To enable, add GEMINI_API_KEYS or GROQ_API_KEY.');
        // Still report gap count for dashboard visibility
        const supabase = SupabaseService.getClient();
        const { count } = await supabase
          .from('movies')
          .select('id', { count: 'exact', head: true })
          .or('title_ar.is.null,overview_ar.is.null,studios_json.is.null,studios_json.eq.[]');
        return { totalGaps: count || 0, enriched: 0, failed: 0 };
      }

      // If cooperative gap-scan is not already running, launch it for this batch
      if (!metrics.cooperativeScan.isRunning) {
        console.log(`[AUTO-SCANNER] 🧠 Launching cooperative AI gap-fill for up to ${maxTitles} titles...`);
        const result = await pool.startCooperativeGapScan({ maxTitles });
        console.log(`[AUTO-SCANNER] ${result.message}`);

        // Wait for the gap scan to complete (with a reasonable timeout)
        const maxWaitMs = Math.min(maxTitles * 2000, 600000); // ~2s per title, max 10 minutes
        const startWait = Date.now();
        while (Date.now() - startWait < maxWaitMs) {
          const status = pool.getPoolMetrics().cooperativeScan;
          this.lastScannedTitle = status.currentTitle;
          this.lastActiveAt = new Date().toISOString();

          if (!status.isRunning) break;
          await new Promise((r) => setTimeout(r, 3000));
        }

        const finalStatus = pool.getPoolMetrics().cooperativeScan;
        return {
          totalGaps: finalStatus.totalGaps,
          enriched: finalStatus.enriched,
          failed: finalStatus.failed,
        };
      } else {
        console.log('[AUTO-SCANNER] ℹ️ Cooperative AI Gap-Scan already running. Skipping duplicate launch.');
        const status = metrics.cooperativeScan;
        return { totalGaps: status.totalGaps, enriched: status.enriched, failed: status.failed };
      }
    } catch (err: any) {
      console.error('[AUTO-SCANNER] Error in cooperative gap-fill:', err.message);
      return { totalGaps: 0, enriched: 0, failed: 0 };
    }
  }

  /// Continuous cooperative loop
  private async runContinuousLoop(): Promise<void> {
    let lastEnrichedCount = -1;
    let loopCycle = 0;

    while (this.isRunning) {
      if (this.isPaused) {
        await this.delay(3000);
        continue;
      }

      try {
        const supabase = SupabaseService.getClient();

        // Check current database saturation
        const [enrichedRes, gapRes] = await Promise.all([
          supabase.from('movies').select('id', { count: 'exact', head: true }).not('enriched_at', 'is', null),
          supabase.from('movies').select('id', { count: 'exact', head: true }).or('title_ar.is.null,overview_ar.is.null,studios_json.is.null,studios_json.eq.[]'),
        ]);

        const currentEnriched = enrichedRes.count || 0;
        const currentGaps = gapRes.count || 0;
        this.lastActiveAt = new Date().toISOString();

        // If new movies were enriched by the Python engine, react!
        if (lastEnrichedCount !== -1 && currentEnriched !== lastEnrichedCount) {
          const diff = currentEnriched - lastEnrichedCount;
          console.log(`[AUTO-SCANNER] 📡 Database update detected (+${diff} enriched). Running cooperative pipeline...`);

          // Tag streaming originals on newly added movies
          await this.categorizer.syncMultiSourceStreamingOriginals(200).catch(() => {});

          // If gaps exist and AI keys are available, launch AI gap-fill
          if (currentGaps > 0) {
            await this.runCooperativeBatchGapFill(Math.min(currentGaps, 500)).catch(() => {});
          }

          // Refresh home categories
          await this.generator.generateAndSyncCategories().catch((e) => {
            console.error('[AUTO-SCANNER] Category refresh error:', e.message);
          });
        }

        // Every 10th cycle (~10 minutes), do a periodic gap check even without new imports
        if (loopCycle > 0 && loopCycle % 10 === 0 && currentGaps > 0) {
          console.log(`[AUTO-SCANNER] 🔍 Periodic gap check: ${currentGaps} movies still missing fields. Running cooperative gap-fill...`);
          await this.runCooperativeBatchGapFill(Math.min(currentGaps, 200)).catch(() => {});
          await this.generator.generateAndSyncCategories().catch(() => {});
        }

        lastEnrichedCount = currentEnriched;
        loopCycle++;

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

    const [totalRes, enrichedRes, gapRes] = await Promise.all([
      supabase.from('movies').select('id', { count: 'exact', head: true }),
      supabase.from('movies').select('id', { count: 'exact', head: true }).not('enriched_at', 'is', null),
      supabase.from('movies').select('id', { count: 'exact', head: true }).or('title_ar.is.null,overview_ar.is.null,studios_json.is.null,studios_json.eq.[]'),
    ]);

    const totalMovies = totalRes.count || 0;
    const enrichedMovies = enrichedRes.count || 0;
    const gapMoviesCount = gapRes.count || 0;
    const unenrichedRemaining = Math.max(0, totalMovies - enrichedMovies);
    const completionPct = totalMovies > 0 ? Math.round((enrichedMovies / totalMovies) * 1000) / 10 : 0;

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
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
