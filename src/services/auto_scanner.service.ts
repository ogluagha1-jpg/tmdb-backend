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

  /// Start or resume 24/7 continuous background scanning
  public start(): void {
    if (this.isRunning && !this.isPaused) return;

    this.isRunning = true;
    this.isPaused = false;
    if (!this.startedAt) this.startedAt = new Date().toISOString();
    this.lastActiveAt = new Date().toISOString();

    console.log('[AUTO-SCANNER] 🟢 Continuous 24/7 background auto-scanner started!');
    this.runContinuousLoop().catch((err) => {
      console.error('[AUTO-SCANNER] Fatal loop error:', err.message);
      this.isRunning = false;
    });
  }

  /// Pause scanning
  public pause(): void {
    this.isPaused = true;
    console.log('[AUTO-SCANNER] ⏸️ Auto-scanner paused by admin.');
  }

  /// Trigger a single discrete batch scan
  public async scanBatch(batchSize: number = 200): Promise<{ processed: number; updated: number }> {
    const supabase = SupabaseService.getClient();
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, tmdb_title, year, release_date, tmdb_id, imdb_id, title_ar, overview_ar, tagline_ar, enriched_at, studios_json')
      .is('enriched_at', null)
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (error || !movies || movies.length === 0) {
      return { processed: 0, updated: 0 };
    }

    let updated = 0;
    for (const m of movies) {
      this.lastScannedTitle = m.title;
      this.lastActiveAt = new Date().toISOString();
      const ok = await (this.categorizer as any).enrichMovie(m, supabase);
      if (ok) updated++;
      this.totalProcessedThisSession++;
    }

    // Refresh categories after batch
    await this.generator.generateAndSyncCategories().catch(() => {});

    return { processed: movies.length, updated };
  }

  /// Continuous autonomous loop
  private async runContinuousLoop(): Promise<void> {
    const supabase = SupabaseService.getClient();

    while (this.isRunning) {
      if (this.isPaused) {
        await this.delay(3000);
        continue;
      }

      try {
        // Query next batch of unenriched titles (sorted by popularity for maximum user impact first)
        const { data: movies, error } = await supabase
          .from('movies')
          .select('id, title, tmdb_title, year, release_date, tmdb_id, imdb_id, title_ar, overview_ar, tagline_ar, enriched_at, studios_json')
          .is('enriched_at', null)
          .order('popularity', { ascending: false, nullsFirst: false })
          .limit(30);

        if (error) {
          this.lastError = error.message;
          console.error('[AUTO-SCANNER] Supabase query error:', error.message);
          await this.delay(5000);
          continue;
        }

        // If no unenriched movies remain, sleep and re-check for new imports
        if (!movies || movies.length === 0) {
          console.log('[AUTO-SCANNER] 🎉 All movies fully saturated! Sleeping for 60s before next check...');
          await this.delay(60000);
          continue;
        }

        // Process batch with concurrency = 6
        const concurrency = 6;
        for (let i = 0; i < movies.length; i += concurrency) {
          if (this.isPaused || !this.isRunning) break;

          const slice = movies.slice(i, i + concurrency);
          await Promise.all(
            slice.map(async (m) => {
              this.lastScannedTitle = m.title;
              this.lastActiveAt = new Date().toISOString();
              const timeoutPromise = new Promise<boolean>((resolve) =>
                setTimeout(() => resolve(false), 8000)
              );
              try {
                await Promise.race([
                  (this.categorizer as any).enrichMovie(m, supabase),
                  timeoutPromise,
                ]);
              } catch (e: any) {
                this.lastError = e.message;
              }
              this.totalProcessedThisSession++;
            })
          );

          await this.delay(200); // Polite pacing
        }

        this.currentBatchOffset += movies.length;

        // Periodically refresh home categories every 150 processed movies
        if (this.totalProcessedThisSession % 150 < 30) {
          console.log(`[AUTO-SCANNER] ✨ Processed ${this.totalProcessedThisSession} movies. Refreshing home categories...`);
          await this.generator.generateAndSyncCategories().catch(() => {});
        }
      } catch (err: any) {
        this.lastError = err.message;
        console.error('[AUTO-SCANNER] Batch cycle error:', err.message);
        await this.delay(5000);
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

    const totalMovies = totalRes.count || 10244;
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
