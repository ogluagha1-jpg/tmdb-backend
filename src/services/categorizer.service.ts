import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { TmdbService, TmdbMovieDetails } from './tmdb.service';
import { env } from '../config/env';

export interface ScanStatus {
  isRunning: boolean;
  currentOffset: number;
  totalMovies: number;
  updatedCount: number;
  startTime?: string;
  lastBatchTime?: string;
}

export class CategorizerService {
  private tmdb: TmdbService;
  public scanStatus: ScanStatus = {
    isRunning: false,
    currentOffset: 0,
    totalMovies: 10244,
    updatedCount: 0,
  };

  constructor() {
    this.tmdb = new TmdbService();
  }

  /// Cleans and extracts pure search title
  private cleanTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    return rawTitle
      .replace(/\s*\(\d{4}\).*$/, '')
      .replace(/\s*\((TR|NL|PL|DE|FR|ES|IT|UK|BR|US|RU|AR|sub|dub|L|4K|HD|HQ)\b.*?\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /// Concurrency helper (p-map style)
  private async pMap<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    let index = 0;

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (index < items.length) {
        const i = index++;
        results[i] = await mapper(items[i]);
      }
    });

    await Promise.all(workers);
    return results;
  }

  /// Enriches a single movie row with TMDB metadata & Arabic translations
  private async enrichMovie(movie: any, supabase: SupabaseClient): Promise<boolean> {
    try {
      let tmdbDetails: TmdbMovieDetails | null = null;
      if (movie.tmdb_id) {
        tmdbDetails = await this.tmdb.getMovieDetails(movie.tmdb_id);
      }

      // If tmdb_id was missing or invalid, search by clean title
      if (!tmdbDetails) {
        const cleaned = this.cleanTitle(movie.title);
        if (cleaned.length > 0) {
          tmdbDetails = await this.tmdb.searchMovie(cleaned, movie.year || movie.release_date);
        }
      }

      if (!tmdbDetails) {
        return false;
      }

      // Fetch Arabic metadata
      let arMeta: any = {};
      arMeta = await this.tmdb.getArabicMetadata(tmdbDetails.id);

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

      const prodIds = studiosJson.map((s) => s.id);
      const allReleases = ((tmdbDetails as any).release_dates?.results || []).flatMap(
        (r: any) => r.release_dates || []
      );

      const MAJOR_THEATRICAL_IDS = [
        174, 429, 9993, 12, // Warner Bros
        33, 67, 33413, 10338, // Universal
        5, 34, 84, 2251, 559, // Sony
        4, 24955, 2348, 8302, 333, // Paramount
        2, 6125, 5218, 420, 3, // Disney & Pixar & Marvel
        25, 127928, 787, 9383, // 20th Century
        21, 20580, 8411, // MGM
        1632, 35, 85885, // Lionsgate
      ];

      const isMajorTheatrical = prodIds.some((id) => MAJOR_THEATRICAL_IDS.includes(id));

      // 1. Strict Netflix Original Detection (Direct production ID OR digital release note by Netflix)
      const hasDirectNetflixProd = prodIds.some((id) =>
        [178464, 198834, 185004, 145174, 171251, 87858].includes(id)
      );
      const hasNetflixRelease = allReleases.some(
        (r: any) => r.type === 4 && r.note && r.note.toLowerCase().includes('netflix')
      );

      if (
        (hasDirectNetflixProd || (!isMajorTheatrical && hasNetflixRelease)) &&
        !studiosJson.some((s) => s.id === 178464 || s.name.toLowerCase().includes('netflix'))
      ) {
        studiosJson.push({
          id: 178464,
          name: 'Netflix',
          logo_path: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
          origin_country: 'US',
        });
      }

      // 2. Strict Apple Original Detection (Direct production ID OR digital release note by Apple)
      const hasDirectAppleProd = prodIds.some((id) => id === 194232);
      const hasAppleRelease = allReleases.some(
        (r: any) =>
          r.type === 4 &&
          r.note &&
          (r.note.toLowerCase().includes('apple tv') || r.note.toLowerCase().includes('apple original'))
      );

      if (
        (hasDirectAppleProd || (!isMajorTheatrical && hasAppleRelease)) &&
        !studiosJson.some((s) => s.id === 194232 || s.name.toLowerCase().includes('apple'))
      ) {
        studiosJson.push({
          id: 194232,
          name: 'Apple Studios',
          logo_path: '/suaEOtk1916ggMeMiohmqv9ad07.png',
          origin_country: 'US',
        });
      }

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

  /// Scans and enriches a batch of movies from given offset
  async syncUncategorizedMovies(
    batchSize: number = 100,
    offset: number = 0,
    forceEnrich: boolean = false
  ): Promise<{ processed: number; updated: number }> {
    const supabase = SupabaseService.getClient();

    // Fetch batch using range pagination
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

    // Determine candidates for enrichment
    const candidates = forceEnrich
      ? movies
      : movies.filter((m: any) => {
          const hasStudios = Array.isArray(m.studios_json) && m.studios_json.length > 0;
          const hasKeywords = Array.isArray(m.keywords_json) && m.keywords_json.length > 0;
          const hasArabic = !!m.title_ar && m.title_ar.trim().length > 0;
          return !hasStudios || !hasKeywords || !hasArabic || !m.tmdb_id;
        });

    if (candidates.length === 0) {
      return { processed: movies.length, updated: 0 };
    }

    console.log(
      `[CATEGORIZER] [Offset ${offset}] Enriching ${candidates.length}/${movies.length} movies (Concurrency: 15)...`
    );

    // Process in parallel batches with concurrency = 15
    const results = await this.pMap(candidates, 15, (movie) =>
      this.enrichMovie(movie, supabase)
    );
    const updatedCount = results.filter(Boolean).length;

    console.log(
      `[CATEGORIZER] [Offset ${offset}] Batch completed: ${updatedCount}/${candidates.length} updated.`
    );
    return { processed: movies.length, updated: updatedCount };
  }

  /// Full Catalogue Rescan from Offset 0 to 10,244
  async startContinuousEnrichment(batchSize: number = 100, forceEnrich: boolean = false): Promise<void> {
    if (this.scanStatus.isRunning) {
      console.log('[CATEGORIZER] ⚠️ A catalogue scan is already in progress.');
      return;
    }

    this.scanStatus.isRunning = true;
    this.scanStatus.currentOffset = 0;
    this.scanStatus.updatedCount = 0;
    this.scanStatus.startTime = new Date().toISOString();

    console.log(`[CATEGORIZER] 🚀 RE-INITIATING FULL CATALOGUE SCAN FROM BEGINNING (Offset 0 to 10,244)...`);

    try {
      let offset = 0;
      while (this.scanStatus.isRunning) {
        const res = await this.syncUncategorizedMovies(batchSize, offset, forceEnrich);
        if (res.processed === 0) {
          console.log(`[CATEGORIZER] 🎉 COMPLETE! Full catalogue scan finished. Total updated: ${this.scanStatus.updatedCount}`);
          break;
        }

        this.scanStatus.updatedCount += res.updated;
        offset += res.processed;
        this.scanStatus.currentOffset = offset;
        this.scanStatus.lastBatchTime = new Date().toISOString();

        console.log(`[CATEGORIZER] 📈 Progress: #${offset}/${this.scanStatus.totalMovies} (${((offset / this.scanStatus.totalMovies) * 100).toFixed(1)}%) | ${this.scanStatus.updatedCount} updated.`);

        // Short breather
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err: any) {
      console.error('[CATEGORIZER] Full scan error:', err.message);
    } finally {
      this.scanStatus.isRunning = false;
    }
  }
}
