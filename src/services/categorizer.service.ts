import { SupabaseService } from './supabase.service';
import { TmdbService } from './tmdb.service';
import { CategoryGeneratorService } from './category_generator.service';

/**
 * CategorizerService — Cooperative Multi-Engine Metadata Processor
 *
 * This does NOT blindly re-scrape TMDB (that is handled by the local Python engine).
 * Instead it cooperatively:
 *   1. Tags streaming platform originals (Netflix, Apple TV+, Disney+, etc.)
 *   2. Identifies movies missing specific fields (title_ar, overview_ar, studios_json, keywords_json)
 *   3. Uses AI (Gemini / Groq) to fill those gaps
 *   4. Regenerates dynamic home categories
 */
export class CategorizerService {
  private tmdb: TmdbService;
  private generator: CategoryGeneratorService;

  constructor() {
    this.tmdb = new TmdbService();
    this.generator = new CategoryGeneratorService();
  }

  /// Advanced title cleaner for scene release tags
  public cleanTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/[\(\[\{].*?[\)\]\}]/g, ' ')
      .replace(/\b(19\d\d|20\d\d)\b/g, ' ')
      .replace(/\b(4k|2160p|1080p|1080i|720p|576p|480p|360p|uhd|fhd|hd|sd|bluray|blu-ray|bdrip|brrip|web-dl|webdl|webrip|web|hdrip|dvdrip|dvd|remux|vhs|cam|telesync|ts|hdcam|hdtc|hdtv|pdtv|dsr|screener|scr|r5)\b/gi, ' ')
      .replace(/\b(x264|x265|h264|h265|hevc|avc|av1|vp9|xvid|divx|10bit|8bit|hdr|hdr10|hdr10plus|dv|dovi|dolby\s*vision|atmos|ddp\d*(\.\d+)?|dd\d*(\.\d+)?|dts-hd|dts|ac3|aac\d*(\.\d+)?|mp3|flac|truehd|mp4|mkv|avi)\b/gi, ' ')
      .replace(/\b(extended|directors\s*cut|unrated|theatrical|remastered|special\s*edition|reloaded|repack|proper|internal|dubbed|subbed|multi|vostfr|sub|gespr)\b/gi, ' ')
      .replace(/-\s*[a-zA-Z0-9_\-]+$/gi, ' ')
      .replace(/[._\-+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /// Helper to process items with controlled concurrency
  private async pMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<any>[] = [];

    for (const item of items) {
      const p = fn(item).then((res) => results.push(res));
      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
        for (let i = executing.length - 1; i >= 0; i--) {
          const isSettled = await Promise.race([executing[i].then(() => true), Promise.resolve(false)]);
          if (isSettled) executing.splice(i, 1);
        }
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Cooperative Missing-Fields Sync:
   * 1. Tags streaming originals across database
   * 2. Identifies titles missing Arabic metadata, studios, or keywords
   * 3. Uses AI (Gemini/Groq) to fill those gaps when keys are available
   * 4. Regenerates dynamic home categories
   */
  async syncUncategorizedMovies(
    batchSize: number = 100,
    _offset: number = 0
  ): Promise<{ processed: number; updated: number; gapsIdentified: number }> {
    const supabase = SupabaseService.getClient();

    console.log('[CATEGORIZER] Running cooperative multi-engine metadata audit...');

    // 1. Tag streaming originals across database
    const originalsResult = await this.syncMultiSourceStreamingOriginals(batchSize);

    // 2. Identify gap titles requiring enrichment
    const { data: gapMovies, count: totalGaps } = await supabase
      .from('movies')
      .select('id, title, tmdb_id, title_ar, overview_ar, studios_json, keywords_json', { count: 'exact' })
      .or('title_ar.is.null,overview_ar.is.null,studios_json.is.null,studios_json.eq.[]')
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(batchSize);

    const gapsCount = totalGaps || gapMovies?.length || 0;

    // 3. Attempt cooperative AI gap-fill if AI keys are configured
    let gapsFilled = 0;
    if (gapsCount > 0) {
      try {
        const { GeminiPoolService } = await import('./gemini_pool.service');
        const pool = GeminiPoolService.getInstance();
        const metrics = pool.getPoolMetrics();
        const hasAiKeys = metrics.totalKeys > 0 || (metrics.groq?.isConfigured ?? false);

        if (hasAiKeys && !metrics.cooperativeScan.isRunning) {
          console.log(`[CATEGORIZER] 🧠 ${gapsCount} movies missing fields. Launching AI cooperative gap-fill...`);
          await pool.startCooperativeGapScan({ maxTitles: Math.min(gapsCount, batchSize) });

          // Wait for gap scan to finish (with timeout)
          const maxWait = Math.min(batchSize * 2000, 300000);
          const start = Date.now();
          while (Date.now() - start < maxWait) {
            const status = pool.getPoolMetrics().cooperativeScan;
            if (!status.isRunning) break;
            await new Promise((r) => setTimeout(r, 3000));
          }
          gapsFilled = pool.getPoolMetrics().cooperativeScan.enriched;
        } else if (hasAiKeys && metrics.cooperativeScan.isRunning) {
          console.log(`[CATEGORIZER] ℹ️ AI gap-scan already in progress. ${gapsCount} gaps pending.`);
        } else {
          console.log(`[CATEGORIZER] ℹ️ No AI keys configured. ${gapsCount} gap titles identified but skipping AI fill.`);
        }
      } catch (err: any) {
        console.warn('[CATEGORIZER] AI gap-fill error (non-fatal):', err.message);
      }
    }

    console.log(`[CATEGORIZER] ✅ Cooperative audit complete: ${originalsResult.tagged} originals tagged, ${gapsFilled} gaps filled by AI, ${gapsCount} total gaps identified.`);

    // 4. Regenerate dynamic home categories
    await this.generator.generateAndSyncCategories().catch((e) => {
      console.error('[CATEGORIZER] Error syncing categories:', e.message);
    });

    return {
      processed: originalsResult.processed,
      updated: originalsResult.tagged + gapsFilled,
      gapsIdentified: gapsCount,
    };
  }

  /// Fast multi-source knowledge graph sync across titles in Supabase
  async syncMultiSourceStreamingOriginals(batchSize: number = 200): Promise<{ processed: number; tagged: number }> {
    const streamingSources = (await import('./streaming_sources.service')).StreamingSourcesService.getInstance();
    await streamingSources.initialize();

    const supabase = SupabaseService.getClient();
    let offset = 0;
    let totalTagged = 0;
    let totalProcessed = 0;

    console.log('[CATEGORIZER] 📡 Starting Multi-Source Streaming Originals Sync...');

    while (true) {
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title, tmdb_title, year, release_date, studios_json')
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error || !movies || movies.length === 0) break;

      for (const movie of movies) {
        const year = movie.year || (movie.release_date || '').slice(0, 4);
        const match = streamingSources.matchOriginal(movie.title, movie.tmdb_title, year);

        if (match) {
          const studios = movie.studios_json || [];
          const hasStudio = studios.some((s: any) => s.id === match.studioId);

          if (!hasStudio) {
            const updatedStudios = [
              ...studios,
              {
                id: match.studioId,
                name: match.studioName,
                logo_path: match.logoPath,
                origin_country: 'US',
              },
            ];

            const { error: updateErr } = await supabase
              .from('movies')
              .update({ studios_json: updatedStudios })
              .eq('id', movie.id);

            if (!updateErr) {
              totalTagged++;
            }
          }
        }
      }

      totalProcessed += movies.length;
      offset += movies.length;
      if (movies.length < batchSize) break;
    }

    console.log(`[CATEGORIZER] ✅ Multi-Source sync finished! Processed: ${totalProcessed}, Tagged: ${totalTagged} originals.`);
    return { processed: totalProcessed, tagged: totalTagged };
  }
}
