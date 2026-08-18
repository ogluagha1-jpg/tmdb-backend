import { SupabaseService } from './supabase.service';
import { TmdbService } from './tmdb.service';
import { ImdbService } from './imdb.service';
import { CinemetaService } from './cinemeta.service';
import { StreamingSourcesService } from './streaming_sources.service';
import { CategoryGeneratorService } from './category_generator.service';

/**
 * CategorizerService — Cooperative Multi-Engine Metadata & Taxonomist Service
 *
 * Tier 1 (Always Active Non-AI Multi-Engine):
 *   - Wikipedia Arabic Interlanguage API
 *   - TMDB Arabic & Credits (ar-SA overview, Arabic tagline, Arabic cast)
 *   - TMDB Details Fallback (English tagline, director, cast, trailer, keywords)
 *   - Cinemeta Stremio CDN (runtime, description, director, ratings)
 *   - OMDb / IMDb API (awards, ratings, age classification)
 *   - Streaming Sources Knowledge Graph (Netflix, Apple TV+, Disney+, HBO, Amazon Prime, Paramount+)
 *
 * Tier 2 (Opt-in by Admin via POST /api/ai/toggle):
 *   - Gemini / Groq Pool for remaining untranslated gaps
 */
export class CategorizerService {
  private tmdb: TmdbService;
  private imdb: ImdbService;
  private cinemeta: CinemetaService;
  private generator: CategoryGeneratorService;

  constructor() {
    this.tmdb = new TmdbService();
    this.imdb = new ImdbService();
    this.cinemeta = CinemetaService.getInstance();
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
   * TIER 1: Non-AI Multi-Engine Gap Resolver (Deterministic & Free)
   * Resolves missing tagline, tagline_ar, title_ar, overview_ar, director, cast, trailer, awards, studios
   * using Wikipedia, Cinemeta, OMDB, TMDB Arabic & Streaming Knowledge Graph.
   */
  async resolveGapsWithNonAiEngines(movie: any, supabase: any): Promise<boolean> {
    try {
      const updates: any = {};
      let modified = false;

      const title = movie.title || '';
      const tmdbTitle = movie.tmdb_title || '';
      const effectiveTitle = tmdbTitle || this.cleanTitle(title);
      const year = movie.year || (movie.release_date || '').slice(0, 4);

      // 1. ARABIC METADATA RESOLUTION (TMDB ar-SA + WIKIPEDIA ARABIC FALLBACK)
      const needsArabic = !movie.title_ar || !movie.overview_ar || !movie.tagline_ar;
      if (needsArabic && movie.tmdb_id) {
        try {
          const arMeta = await this.tmdb.getArabicMetadata(movie.tmdb_id, effectiveTitle);
          if (!movie.title_ar && arMeta.titleAr) {
            updates.title_ar = arMeta.titleAr;
            modified = true;
          }
          if (!movie.overview_ar && arMeta.overviewAr) {
            updates.overview_ar = arMeta.overviewAr;
            modified = true;
          }
          if (!movie.tagline_ar && arMeta.taglineAr) {
            updates.tagline_ar = arMeta.taglineAr;
            modified = true;
          }
          if (!movie.cast_json_ar && arMeta.castJsonAr && arMeta.castJsonAr.length > 0) {
            updates.cast_json_ar = arMeta.castJsonAr;
            modified = true;
          }
        } catch {}
      }

      // If title_ar still missing, query Wikipedia Arabic directly
      if (!movie.title_ar && !updates.title_ar && effectiveTitle) {
        try {
          const wikiArabic = await this.tmdb.getWikipediaArabicTitle(effectiveTitle);
          if (wikiArabic) {
            updates.title_ar = wikiArabic;
            modified = true;
          }
        } catch {}
      }

      // 2. ENGLISH TAGLINE, DIRECTOR, CAST, TRAILER, KEYWORDS (TMDB DETAILS FALLBACK)
      const needsDetails = !movie.tagline || !movie.director || !movie.trailer_url || !movie.keywords_json || (Array.isArray(movie.keywords_json) && movie.keywords_json.length === 0);
      if (needsDetails && movie.tmdb_id) {
        try {
          const details = await this.tmdb.getMovieDetails(movie.tmdb_id);
          if (details) {
            if (!movie.tagline && details.tagline) {
              updates.tagline = details.tagline;
              modified = true;
            }
            if (!movie.director && details.credits?.crew) {
              const dir = details.credits.crew.find((c: any) => c.job === 'Director');
              if (dir?.name) {
                updates.director = dir.name;
                modified = true;
              }
            }
            if ((!movie.cast_json || (Array.isArray(movie.cast_json) && movie.cast_json.length === 0)) && details.credits?.cast) {
              updates.cast_json = details.credits.cast.slice(0, 12).map((c: any) => ({
                id: c.id,
                name: c.name,
                character: c.character,
                profile_path: c.profile_path,
              }));
              modified = true;
            }
            if (!movie.trailer_url && details.videos?.results) {
              const trailer = details.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
              if (trailer?.key) {
                updates.trailer_key = trailer.key;
                updates.trailer_site = 'YouTube';
                updates.trailer_url = `https://www.youtube.com/watch?v=${trailer.key}`;
                modified = true;
              }
            }
            if ((!movie.keywords_json || (Array.isArray(movie.keywords_json) && movie.keywords_json.length === 0)) && details.keywords?.keywords) {
              updates.keywords_json = details.keywords.keywords;
              modified = true;
            }
            if (details.imdb_id && !movie.imdb_id) {
              updates.imdb_id = details.imdb_id;
              modified = true;
            }
          }
        } catch {}
      }

      // 3. CINEMETA STREMIO CDN & OMDB (AWARDS, IMDB RATINGS, RUNTIME FALLBACK)
      const targetImdbId = updates.imdb_id || movie.imdb_id;
      if (targetImdbId && targetImdbId.startsWith('tt')) {
        try {
          const [cinemetaMeta, omdbData] = await Promise.all([
            (!movie.director || !movie.overview) ? this.cinemeta.getMeta(targetImdbId).catch(() => null) : null,
            this.imdb.getImdbData(targetImdbId).catch(() => null),
          ]);

          if (cinemetaMeta) {
            if (!movie.director && !updates.director && cinemetaMeta.director && cinemetaMeta.director.length > 0) {
              updates.director = cinemetaMeta.director[0];
              modified = true;
            }
            if (!movie.overview && cinemetaMeta.description) {
              updates.overview = cinemetaMeta.description;
              modified = true;
            }
          }

          if (omdbData) {
            if (omdbData.awards && !movie.awards) {
              updates.awards = omdbData.awards;
              modified = true;
            }
          }
        } catch {}
      }

      // 4. STREAMING ORIGINALS KNOWLEDGE GRAPH TAGGING
      const streamingSources = StreamingSourcesService.getInstance();
      await streamingSources.initialize();
      const match = streamingSources.matchOriginal(title, tmdbTitle, year);
      if (match) {
        let studios = Array.isArray(movie.studios_json) ? [...movie.studios_json] : [];
        if (!studios.some((s: any) => s.id === match.studioId)) {
          studios.push({
            id: match.studioId,
            name: match.studioName,
            logo_path: match.logoPath,
            origin_country: 'US',
          });
          updates.studios_json = studios;
          modified = true;
        }
      }

      // ALWAYS STAMP enriched_at so the queue advances and never gets stuck
      updates.enriched_at = new Date().toISOString();

      const { error: updErr } = await supabase
        .from('movies')
        .update(updates)
        .eq('id', movie.id);

      if (!updErr) return modified;

      // Safe retry if column does not exist
      if (updErr && /awards|cast_json_ar/i.test(updErr.message)) {
        delete updates.awards;
        delete updates.cast_json_ar;
        const retryRes = await supabase.from('movies').update(updates).eq('id', movie.id);
        return !retryRes.error && modified;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Cooperative Multi-Engine Batch Sync:
   * 1. Fetches oldest/unenriched records (prioritizes NULL enriched_at)
   * 2. Runs Tier 1 Multi-Engine Gap Filling (Wikipedia, Cinemeta, OMDB, TMDB Arabic & Taglines)
   * 3. Runs Tier 2 AI Booster if enabled by admin
   * 4. Regenerates dynamic home categories
   */
  async syncUncategorizedMovies(
    batchSize: number = 100,
    onProgressOrOffset?: ((title: string) => void) | number
  ): Promise<{ processed: number; updated: number; gapsIdentified: number }> {
    const supabase = SupabaseService.getClient();
    const onProgress = typeof onProgressOrOffset === 'function' ? onProgressOrOffset : undefined;
    const offset = typeof onProgressOrOffset === 'number' ? onProgressOrOffset : 0;

    // 1. Tag streaming originals across database
    const originalsResult = await this.syncMultiSourceStreamingOriginals(Math.min(batchSize, 200));

    // 2. Fetch movies ordered by oldest enriched_at first (so new arrivals are #1 priority)
    let query = supabase
      .from('movies')
      .select('id, title, tmdb_title, tmdb_id, imdb_id, year, release_date, tagline, tagline_ar, title_ar, overview_ar, director, cast_json, cast_json_ar, keywords_json, studios_json, trailer_url, enriched_at', { count: 'exact' })
      .order('enriched_at', { ascending: true, nullsFirst: true });

    if (offset > 0) {
      query = query.range(offset, offset + batchSize - 1);
    } else {
      query = query.limit(batchSize);
    }

    const { data: movies, count: totalGaps } = await query;

    if (!movies || movies.length === 0) {
      return { processed: 0, updated: 0, gapsIdentified: 0 };
    }

    const gapsCount = totalGaps || movies.length;
    let nonAiUpdated = 0;

    // 3. RUN TIER 1 NON-AI MULTI-ENGINE RESOLVER
    console.log(`[CATEGORIZER] 🔍 Scanning ${movies.length} movies with Tier 1 Multi-Engine...`);
    const results = await this.pMap(movies, 8, async (m) => {
      if (onProgress) onProgress(`${m.title} (#${m.id})`);
      return await this.resolveGapsWithNonAiEngines(m, supabase);
    });

    nonAiUpdated = results.filter(Boolean).length;
    console.log(`[CATEGORIZER] ✅ Tier 1 Multi-Engine enriched: ${nonAiUpdated}/${movies.length} titles.`);

    // 4. RUN TIER 2 AI BOOSTER (ONLY if explicitly enabled by admin)
    let aiUpdated = 0;
    try {
      const { GeminiPoolService } = await import('./gemini_pool.service');
      const pool = GeminiPoolService.getInstance();
      const metrics = pool.getPoolMetrics();
      const hasAiKeys = metrics.totalKeys > 0 || (metrics.groq?.isConfigured ?? false);

      if (hasAiKeys && pool.isAiEnabled() && !metrics.cooperativeScan.isRunning) {
        console.log(`[CATEGORIZER] 🧠 Admin AI Boost is ENABLED. Launching AI gap-fill for remaining gaps...`);
        await pool.startCooperativeGapScan({ maxTitles: Math.min(gapsCount, batchSize) });
        aiUpdated = pool.getPoolMetrics().cooperativeScan.enriched;
      }
    } catch (err: any) {
      console.warn('[CATEGORIZER] AI boost notice:', err.message);
    }

    // 5. Regenerate dynamic home categories
    await this.generator.generateAndSyncCategories().catch((e) => {
      console.error('[CATEGORIZER] Error syncing categories:', e.message);
    });

    return {
      processed: movies.length,
      updated: originalsResult.tagged + nonAiUpdated + aiUpdated,
      gapsIdentified: gapsCount,
    };
  }

  /// Fast multi-source knowledge graph sync across titles in Supabase
  async syncMultiSourceStreamingOriginals(batchSize: number = 200): Promise<{ processed: number; tagged: number }> {
    const streamingSources = StreamingSourcesService.getInstance();
    await streamingSources.initialize();

    const supabase = SupabaseService.getClient();
    let offset = 0;
    let totalTagged = 0;
    let totalProcessed = 0;

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

    return { processed: totalProcessed, tagged: totalTagged };
  }
}
