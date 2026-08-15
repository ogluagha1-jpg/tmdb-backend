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

  /// Helper to process items with controlled concurrency
  private async pMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<any>[] = [];

    for (const item of items) {
      const p = fn(item).then((res) => results.push(res));
      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
        // Remove settled promises
        for (let i = executing.length - 1; i >= 0; i--) {
          const isSettled = await Promise.race([executing[i].then(() => true), Promise.resolve(false)]);
          if (isSettled) executing.splice(i, 1);
        }
      }
    }

    await Promise.all(executing);
    return results;
  }

  /// Enrich a single movie
  private async enrichMovie(movie: any, supabase: any): Promise<boolean> {
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
        return false;
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

      // Standardize production studios / companies
      const studiosJson = (tmdbDetails.production_companies || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        logo_path: s.logo_path || null,
        origin_country: s.origin_country || null,
      }));

      // Extract release year
      const releaseDate = tmdbDetails.release_date || movie.release_date || '';
      const year = releaseDate && releaseDate.length >= 4 ? releaseDate.substring(0, 4) : movie.year;

      // Build update payload
      const updatePayload: any = {
        tmdb_id: tmdbDetails.id,
        tmdb_title: tmdbDetails.title,
        genres_json: genresJson,
        keywords_json: keywordsJson,
        studios_json: studiosJson,
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
        return false;
      }

      return true;
    } catch (err: any) {
      console.error(`[CATEGORIZER] Error processing movie #${movie.id}:`, err.message);
      return false;
    }
  }

  /// Scans and enriches un-categorized or newly added movies in the Supabase database with parallel execution
  async syncUncategorizedMovies(
    batchSize: number = 100,
    offset: number = 0
  ): Promise<{ processed: number; updated: number }> {
    const supabase = SupabaseService.getClient();

    // Fetch batch using range pagination to guarantee we cover all 10,244 movies
    const { data: movies, error } = await supabase
      .from('movies')
      .select(
        'id, title, tmdb_id, year, release_date, genres_json, keywords_json, studios_json, poster_path, backdrop_path, title_ar'
      )
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('[CATEGORIZER] Error querying movies from Supabase:', error.message);
      return { processed: 0, updated: 0 };
    }

    if (!movies || movies.length === 0) {
      return { processed: 0, updated: 0 };
    }

    // Filter to movies that actually need enrichment (missing studios, arabic, keywords, or cast)
    const needsEnrichment = movies.filter((m: any) => {
      const hasStudios = Array.isArray(m.studios_json) && m.studios_json.length > 0;
      const hasKeywords = Array.isArray(m.keywords_json) && m.keywords_json.length > 0;
      const hasArabic = !!m.title_ar && m.title_ar.trim().length > 0;
      return !hasStudios || !hasKeywords || !hasArabic || !m.tmdb_id;
    });

    if (needsEnrichment.length === 0) {
      return { processed: movies.length, updated: 0 };
    }

    console.log(
      `[CATEGORIZER] [Offset ${offset}] Found ${needsEnrichment.length}/${movies.length} movies needing enrichment. Processing with concurrency = 10...`
    );

    // Process in parallel batches of 10
    const results = await this.pMap(needsEnrichment, 10, (movie) =>
      this.enrichMovie(movie, supabase)
    );
    const updatedCount = results.filter(Boolean).length;

    console.log(
      `[CATEGORIZER] [Offset ${offset}] Enrichment finished: ${updatedCount}/${needsEnrichment.length} successfully updated.`
    );
    return { processed: movies.length, updated: updatedCount };
  }

  /// Continuously scans and enriches all movies across the entire database catalogue
  async startContinuousEnrichment(batchSize: number = 100): Promise<void> {
    console.log('[CATEGORIZER] 🚀 Starting catalogue-wide movie categorization pipeline...');
    let totalUpdated = 0;
    let offset = 0;

    while (true) {
      const res = await this.syncUncategorizedMovies(batchSize, offset);
      if (res.processed === 0) {
        console.log(`[CATEGORIZER] 🎉 Full catalogue scan complete! Total updated: ${totalUpdated}`);
        break;
      }
      totalUpdated += res.updated;
      offset += res.processed;
      console.log(`[CATEGORIZER] Pipeline progress: scanned ${offset}/10244 movies | ${totalUpdated} updated.`);

      // Short breather delay between batches
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}
