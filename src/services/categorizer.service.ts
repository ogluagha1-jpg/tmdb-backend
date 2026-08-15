import { SupabaseService } from './supabase.service';
import { TmdbService } from './tmdb.service';
import { ImdbService } from './imdb.service';

export class CategorizerService {
  private tmdb: TmdbService;
  private imdb: ImdbService;

  constructor() {
    this.tmdb = new TmdbService();
    this.imdb = new ImdbService();
  }

  /// Clean movie title helper to remove quality tags, year, resolution, etc.
  private cleanTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/[\(\[\{].*?[\)\]\}]/g, ' ') // Remove brackets
      .replace(/\b(19\d\d|20\d\d)\b/g, ' ') // Remove years
      .replace(/\b(4k|2160p|1080p|720p|480p|bluray|web-dl|hdrip|x264|x265|hevc|aac|dts)\b/gi, ' ')
      .replace(/[._\-+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /// Scans and enriches un-categorized or newly added movies in the Supabase database
  async syncUncategorizedMovies(batchSize: number = 50): Promise<{ processed: number; updated: number }> {
    const supabase = SupabaseService.getClient();
    console.log(`[CATEGORIZER] Starting movie metadata enrichment scan (batch size: ${batchSize})...`);

    // 1. Fetch movies that are missing genres_json or tmdb_id
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, tmdb_id, year, release_date, genres_json, poster_path, backdrop_path, title_ar')
      .or('genres_json.is.null,genres_json.eq.[],tmdb_id.is.null')
      .limit(batchSize);

    if (error) {
      console.error('[CATEGORIZER] Error querying movies from Supabase:', error.message);
      return { processed: 0, updated: 0 };
    }

    if (!movies || movies.length === 0) {
      console.log('[CATEGORIZER] All movies in database are up to date and categorized!');
      return { processed: 0, updated: 0 };
    }

    console.log(`[CATEGORIZER] Found ${movies.length} movies needing enrichment.`);
    let updatedCount = 0;

    for (const movie of movies) {
      try {
        let tmdbDetails = null;

        // Try direct fetch if tmdb_id is present
        if (movie.tmdb_id && movie.tmdb_id > 0) {
          tmdbDetails = await this.tmdb.getMovieDetails(movie.tmdb_id);
        }

        // Fallback: Search by clean title
        if (!tmdbDetails) {
          const cleaned = this.cleanTitle(movie.title);
          if (cleaned.length > 0) {
            tmdbDetails = await this.tmdb.searchMovie(cleaned, movie.year || movie.release_date);
          }
        }

        if (!tmdbDetails) {
          console.warn(`[CATEGORIZER] Could not match movie #${movie.id} "${movie.title}" on TMDB.`);
          continue;
        }

        // Fetch Arabic metadata if not present
        let arMeta: any = {};
        if (!movie.title_ar) {
          arMeta = await this.tmdb.getArabicMetadata(tmdbDetails.id);
        }

        // Extract director
        let director: string | undefined;
        if (tmdbDetails.credits?.crew) {
          const dir = tmdbDetails.credits.crew.find((c: any) => c.job === 'Director');
          if (dir) director = dir.name;
        }

        // Extract trailer
        let trailerUrl: string | undefined;
        let trailerKey: string | undefined;
        let trailerSite: string | undefined;
        if (tmdbDetails.videos?.results) {
          const trailer = tmdbDetails.videos.results.find(
            (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
          );
          if (trailer) {
            trailerKey = trailer.key;
            trailerSite = 'YouTube';
            trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
          }
        }

        // Standardize cast
        const castJson = (tmdbDetails.credits?.cast || [])
          .slice(0, 10)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profile_path: c.profile_path,
          }));

        // Standardize genres & keywords
        const genresJson = (tmdbDetails.genres || []).map((g: any) => ({
          id: g.id,
          name: g.name,
        }));

        const keywordsJson = (tmdbDetails.keywords?.keywords || []).map((k: any) => ({
          id: k.id,
          name: k.name,
        }));

        // Extract release year
        const releaseDate = tmdbDetails.release_date || movie.release_date || '';
        const year = releaseDate && releaseDate.length >= 4 ? releaseDate.substring(0, 4) : movie.year;

        // Build update payload
        const updatePayload: any = {
          tmdb_id: tmdbDetails.id,
          tmdb_title: tmdbDetails.title,
          genres_json: genresJson,
          overview: tmdbDetails.overview || '',
          runtime: tmdbDetails.runtime,
          vote_average: tmdbDetails.vote_average,
          popularity: tmdbDetails.popularity,
          tagline: tmdbDetails.tagline,
          original_language: tmdbDetails.original_language,
          director: director,
          trailer_url: trailerUrl,
          trailer_key: trailerKey,
          trailer_site: trailerSite,
          cast_json: castJson,
          release_date: releaseDate,
          year: year,
          imdb_id: tmdbDetails.imdb_id,
        };

        // Upgrade poster & backdrop if relative TMDB path is available
        if (tmdbDetails.poster_path) {
          updatePayload.poster_path = tmdbDetails.poster_path;
        }
        if (tmdbDetails.backdrop_path) {
          updatePayload.backdrop_path = tmdbDetails.backdrop_path;
        }

        if (arMeta.titleAr) updatePayload.title_ar = arMeta.titleAr;
        if (arMeta.overviewAr) updatePayload.overview_ar = arMeta.overviewAr;
        if (arMeta.taglineAr) updatePayload.tagline_ar = arMeta.taglineAr;

        // Update database row
        const { error: updateErr } = await supabase
          .from('movies')
          .update(updatePayload)
          .eq('id', movie.id);

        if (updateErr) {
          console.error(`[CATEGORIZER] Failed to update movie #${movie.id}:`, updateErr.message);
        } else {
          updatedCount++;
          console.log(`[CATEGORIZER] ✓ Successfully enriched movie #${movie.id} "${tmdbDetails.title}"`);
        }
      } catch (err: any) {
        console.error(`[CATEGORIZER] Error processing movie #${movie.id}:`, err.message);
      }
    }

    console.log(`[CATEGORIZER] Enrichment batch finished: ${updatedCount}/${movies.length} updated.`);
    return { processed: movies.length, updated: updatedCount };
  }

  /// Continuously scans and enriches all uncategorized movies in the database
  async startContinuousEnrichment(maxBatches: number = 100): Promise<void> {
    console.log('[CATEGORIZER] 🚀 Starting continuous background movie categorization pipeline...');
    let totalUpdated = 0;
    for (let batch = 0; batch < maxBatches; batch++) {
      const res = await this.syncUncategorizedMovies(50);
      if (res.processed === 0) {
        console.log('[CATEGORIZER] 🎉 All movies in database have been categorized!');
        break;
      }
      totalUpdated += res.updated;
      console.log(`[CATEGORIZER] Pipeline progress: ${totalUpdated} movies categorized so far.`);
      // Small breather delay between batches
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
