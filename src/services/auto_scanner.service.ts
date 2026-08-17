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
 * AutoScannerService — Cooperative Multi-Engine Background Processor
 *
 * Tier 1 (Always Active):
 *   - Wikipedia Arabic Interlanguage API
 *   - Cinemeta Stremio CDN (descriptions, runtimes, directors, cast)
 *   - OMDb / IMDb API (awards, ratings, age classification)
 *   - TMDB Arabic & Taglines (ar-SA overview, Arabic tagline, original English tagline)
 *   - Streaming Sources Knowledge Graph (Netflix, Apple TV+, Disney+, HBO, Amazon Prime, Paramount+)
 *
 * Tier 2 (Opt-in by Admin via POST /api/ai/toggle):
 *   - Gemini & Groq AI Pool
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

  /// Full rescan: multi-engine gap resolution (Tier 1 non-AI + Tier 2 AI if enabled) + category regeneration
  public async resetAndRescanAll(): Promise<{ resetCount: number }> {
    console.log('[AUTO-SCANNER] 🔄 Initiating full cooperative rescan across all engines...');

    this.totalProcessedThisSession = 0;
    this.totalGapFilledThisSession = 0;
    this.currentBatchOffset = 0;
    this.lastError = null;
    this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();
    this.isPaused = false;

    // Run multi-source sync (streaming originals + Wikipedia + Cinemeta + OMDB + TMDB Arabic)
    const result = await this.categorizer.syncUncategorizedMovies(5000);

    this.totalProcessedThisSession = result.processed;
    this.totalGapFilledThisSession = result.updated;

    // Start continuous watcher loop
    this.start();

    return { resetCount: result.processed };
  }

  /// Trigger a single discrete batch scan / audit
  public async scanBatch(batchSize: number = 200): Promise<{ processed: number; updated: number }> {
    this.lastActiveAt = new Date().toISOString();
    console.log(`[AUTO-SCANNER] 📋 Running cooperative batch scan (limit: ${batchSize})...`);

    const result = await this.categorizer.syncUncategorizedMovies(batchSize);

    this.totalProcessedThisSession += result.processed;
    this.totalGapFilledThisSession += result.updated;

    return {
      processed: result.processed,
      updated: result.updated,
    };
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
          supabase.from('movies').select('id', { count: 'exact', head: true }).or('title_ar.is.null,overview_ar.is.null,tagline.is.null,tagline_ar.is.null,studios_json.is.null,studios_json.eq.[]'),
        ]);

        const currentEnriched = enrichedRes.count || 0;
        const currentGaps = gapRes.count || 0;
        this.lastActiveAt = new Date().toISOString();

        // If new movies were enriched by the Python engine, run cooperative pipeline!
        if (lastEnrichedCount !== -1 && currentEnriched !== lastEnrichedCount) {
          const diff = currentEnriched - lastEnrichedCount;
          console.log(`[AUTO-SCANNER] 📡 Database update detected (+${diff} movies). Running multi-engine gap resolution...`);
          await this.categorizer.syncUncategorizedMovies(Math.min(diff * 2, 500)).catch(() => {});
        }

        // Every 10th cycle (~10 minutes), do a periodic gap check across existing library
        if (loopCycle > 0 && loopCycle % 10 === 0 && currentGaps > 0) {
          console.log(`[AUTO-SCANNER] 🔍 Periodic gap check: ${currentGaps} movies have missing fields. Running Tier 1 Multi-Engine...`);
          await this.categorizer.syncUncategorizedMovies(Math.min(currentGaps, 200)).catch(() => {});
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
