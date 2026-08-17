import { SupabaseService } from './supabase.service';
import { TmdbService } from './tmdb.service';
import { CategoryGeneratorService } from './category_generator.service';

/**
 * CategorizerService:
 * Streamlined backend service for multi-source original tagging,
 * cooperative missing-metadata identification, and category synchronization.
 * (Direct official TMDB enrichment is delegated to the local Python engine).
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

  /// Cooperative Missing-Fields Sync:
  /// Identifies titles that still lack Arabic metadata, studios, or keywords after TMDB ingestion,
  /// tags streaming originals, and updates dynamic home categories.
  async syncUncategorizedMovies(
    batchSize: number = 100,
    _offset: number = 0
  ): Promise<{ processed: number; updated: number; gapsIdentified: number }> {
    const supabase = SupabaseService.getClient();

    console.log('[CATEGORIZER] Running cooperative metadata audit across database...');

    // 1. Tag streaming originals across database
    const originalsResult = await this.syncMultiSourceStreamingOriginals(batchSize);

    // 2. Identify gap titles requiring AI translation / studio tagging
    const { data: gapMovies, count: totalGaps } = await supabase
      .from('movies')
      .select('id, title, tmdb_id, title_ar, overview_ar, studios_json', { count: 'exact' })
      .or('title_ar.is.null,overview_ar.is.null,studios_json.is.null,studios_json.eq.[]')
      .limit(batchSize);

    const gapsCount = totalGaps || gapMovies?.length || 0;
    console.log(`[CATEGORIZER] Cooperative audit complete: ${originalsResult.tagged} originals tagged, ${gapsCount} gap titles identified.`);

    // 3. Regenerate dynamic home categories
    await this.generator.generateAndSyncCategories().catch((e) => {
      console.error('[CATEGORIZER] Error syncing categories:', e.message);
    });

    return {
      processed: originalsResult.processed,
      updated: originalsResult.tagged,
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

    console.log('[CATEGORIZER] 📡 Starting Multi-Source Streaming Originals Sync across database...');

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
