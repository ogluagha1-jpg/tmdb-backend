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

  /// Advanced 50+ tag title cleaner for international releases and scene tags
  private cleanTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    return rawTitle
      // 1. Remove bracketed/parenthesized info: (2021), [1080p], {4k}, (DE), (TR), [YTS.MX], etc.
      .replace(/[\(\[\{].*?[\)\]\}]/g, ' ')
      // 2. Remove years (1900 - 2099)
      .replace(/\b(19\d\d|20\d\d)\b/g, ' ')
      // 3. Remove resolution & source tags
      .replace(/\b(4k|2160p|1080p|1080i|720p|576p|480p|360p|uhd|fhd|hd|sd|bluray|blu-ray|bdrip|brrip|web-dl|webdl|webrip|web|hdrip|dvdrip|dvd|remux|vhs|cam|telesync|ts|hdcam|hdtc|hdtv|pdtv|dsr|screener|scr|r5)\b/gi, ' ')
      // 4. Remove audio formats, codecs & container tags (e.g. aac5.1, ddp5.1, ac3, truehd, etc.)
      .replace(/\b(x264|x265|h264|h265|hevc|avc|av1|vp9|xvid|divx|10bit|8bit|hdr|hdr10|hdr10plus|dv|dovi|dolby\s*vision|atmos|ddp\d*(\.\d+)?|dd\d*(\.\d+)?|dts-hd|dts|ac3|aac\d*(\.\d+)?|mp3|flac|truehd|mp4|mkv|avi)\b/gi, ' ')
      // 5. Remove edition, cut & language keywords
      .replace(/\b(extended|directors\s*cut|unrated|theatrical|remastered|special\s*edition|reloaded|repack|proper|internal|dubbed|subbed|multi|vostfr|sub|gespr)\b/gi, ' ')
      // 6. Remove trailing release group hashes/tags e.g. -TERAFLIX, -YTS, -RARBG
      .replace(/-\s*[a-zA-Z0-9_\-]+$/gi, ' ')
      // 7. Clean punctuation & excessive spaces
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
  public async enrichMovie(movie: any, supabase: any): Promise<boolean> {
    try {
      let tmdbDetails: any = null;
      let cinemetaMeta: any = null;
      let omdbData: any = null;

      // ── TIER 1: PRIMARY TMDB RESOLUTION ──
      if (movie.tmdb_id && movie.tmdb_id > 0) {
        tmdbDetails = await this.tmdb.getMovieDetails(movie.tmdb_id);
      }

      if (!tmdbDetails) {
        const cleaned = this.cleanTitle(movie.title);
        if (cleaned.length > 0) {
          tmdbDetails = await this.tmdb.searchMovie(cleaned, movie.year || movie.release_date);
        }
      }

      // ── TIER 2 & 3: CINEMETA & OMDB SECONDARY FETCH ──
      const targetImdbId = tmdbDetails?.imdb_id || movie.imdb_id;
      if (targetImdbId && targetImdbId.startsWith('tt')) {
        const [cinemetaRes, omdbRes] = await Promise.all([
          (await import('./cinemeta.service')).CinemetaService.getInstance().getMeta(targetImdbId).catch(() => null),
          this.imdb.getImdbData(targetImdbId).catch(() => null),
        ]);
        cinemetaMeta = cinemetaRes;
        omdbData = omdbRes;
      }

      // If TMDB completely failed, fallback to Cinemeta search
      if (!tmdbDetails && cinemetaMeta) {
        tmdbDetails = {
          id: null,
          title: cinemetaMeta.name || movie.title,
          overview: cinemetaMeta.description || '',
          runtime: cinemetaMeta.runtime ? parseInt(cinemetaMeta.runtime, 10) : undefined,
          vote_average: cinemetaMeta.imdbRating,
          popularity: 10.0,
          release_date: cinemetaMeta.year ? `${cinemetaMeta.year}-01-01` : undefined,
          original_language: 'en',
          imdb_id: targetImdbId,
        };
      }

      if (!tmdbDetails && !cinemetaMeta && !omdbData) {
        // Stamp enriched_at on unmatchable orphan titles to prevent infinite scanner retry loops
        await supabase
          .from('movies')
          .update({
            enriched_at: new Date().toISOString(),
          })
          .eq('id', movie.id);
        return false;
      }

      // ── ARABIC LOCALIZATION TIER (TMDB + WIKIPEDIA ARABIC FALLBACK) ──
      let arMeta: any = {};
      if (!movie.title_ar && tmdbDetails?.id) {
        arMeta = await this.tmdb.getArabicMetadata(tmdbDetails.id, tmdbDetails.title || movie.title);
      }

      // ── DIRECTOR COOPERATIVE RESOLUTION ──
      let director: string | undefined;
      if (tmdbDetails?.credits?.crew) {
        const dir = tmdbDetails.credits.crew.find((c: any) => c.job === 'Director');
        if (dir) director = dir.name;
      }
      if (!director && cinemetaMeta?.director && cinemetaMeta.director.length > 0) {
        director = cinemetaMeta.director[0];
      }

      // ── TRAILER COOPERATIVE RESOLUTION ──
      let trailerUrl: string | undefined;
      let trailerKey: string | undefined;
      let trailerSite: string | undefined;
      if (tmdbDetails?.videos?.results) {
        const trailer = tmdbDetails.videos.results.find(
          (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
        );
        if (trailer) {
          trailerKey = trailer.key;
          trailerSite = 'YouTube';
          trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
        }
      }
      if (!trailerKey && cinemetaMeta?.trailers && cinemetaMeta.trailers.length > 0) {
        trailerKey = cinemetaMeta.trailers[0].source;
        trailerSite = 'YouTube';
        trailerUrl = `https://www.youtube.com/watch?v=${trailerKey}`;
      }

      // ── CAST COOPERATIVE RESOLUTION ──
      let castJson: any[] = (tmdbDetails?.credits?.cast || [])
        .slice(0, 10)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path,
        }));

      if (castJson.length === 0 && cinemetaMeta?.cast && cinemetaMeta.cast.length > 0) {
        castJson = cinemetaMeta.cast.slice(0, 10).map((name: string, idx: number) => ({
          id: 888000 + idx,
          name,
          character: '',
          profile_path: null,
        }));
      }

      // ── GENRES & KEYWORDS COOPERATIVE RESOLUTION ──
      const genresJson: any[] = (tmdbDetails?.genres || []).map((g: any) => ({
        id: g.id,
        name: g.name,
      }));
      if (genresJson.length === 0 && cinemetaMeta?.genres && cinemetaMeta.genres.length > 0) {
        cinemetaMeta.genres.forEach((g: string, idx: number) => {
          genresJson.push({ id: 777000 + idx, name: g });
        });
      }

      const keywordsJson: any[] = (tmdbDetails?.keywords?.keywords || []).map((k: any) => ({
        id: k.id,
        name: k.name,
      }));

      // ── OMDB / ROTTEN TOMATOES / AWARDS ENRICHMENT ──
      if (omdbData) {
        if (omdbData.rottenTomatoesScore) {
          keywordsJson.push({ id: 999901, name: `Rotten Tomatoes ${omdbData.rottenTomatoesScore}%` });
          if (omdbData.rottenTomatoesScore >= 85) {
            keywordsJson.push({ id: 999902, name: 'Certified Fresh' });
          }
        }
        if (omdbData.awards && /oscar|academy award/i.test(omdbData.awards)) {
          keywordsJson.push({ id: 999903, name: 'Oscar Winner' });
        }
        if (omdbData.isTop250) {
          keywordsJson.push({ id: 999904, name: 'IMDb Top 250' });
        }
      }

      // ── PRODUCTION STUDIOS & KNOWLEDGE GRAPH ──
      const studiosJson: any[] = (tmdbDetails?.production_companies || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        logo_path: s.logo_path || null,
        origin_country: s.origin_country || null,
      }));

      // Extract release year
      const releaseDate = tmdbDetails?.release_date || movie.release_date || (cinemetaMeta?.year ? `${cinemetaMeta.year}-01-01` : '');
      const year = releaseDate && releaseDate.length >= 4 ? releaseDate.substring(0, 4) : (movie.year || cinemetaMeta?.year);

      // Multi-Source Streaming Originals Knowledge Graph (Wikipedia / Wikidata)
      const hasMajorTheatricalStudio = studiosJson.some((s: any) =>
        [127928, 25, 43, 174, 429, 9993, 12, 128064, 33, 67, 33413, 10338, 5, 34, 84, 2251, 559, 4, 24955, 2348, 8302, 333, 2, 6125, 5218, 420, 32353, 11106, 13252].includes(s.id)
      );

      if (!hasMajorTheatricalStudio) {
        const streamingSources = (await import('./streaming_sources.service')).StreamingSourcesService.getInstance();
        const matchedOriginal = streamingSources.matchOriginal(movie.title, tmdbDetails?.title, year);
        if (matchedOriginal) {
          const alreadyPresent = studiosJson.some((s: any) => s.id === matchedOriginal.studioId);
          if (!alreadyPresent) {
            studiosJson.push({
              id: matchedOriginal.studioId,
              name: matchedOriginal.studioName,
              logo_path: matchedOriginal.logoPath,
              origin_country: 'US',
            });
          }
        }
      }

      // ── BUILD CORE SERVER PAYLOAD (ARABIC LOCALIZATION, STUDIOS, & CATEGORIES METADATA) ──
      const updatePayload: any = {
        tmdb_id: tmdbDetails?.id || movie.tmdb_id,
        tmdb_title: tmdbDetails?.title || cinemetaMeta?.name || movie.title,
        genres_json: genresJson,
        keywords_json: keywordsJson,
        studios_json: studiosJson,
        overview: tmdbDetails?.overview || cinemetaMeta?.description || movie.overview || '',
        runtime: tmdbDetails?.runtime || (cinemetaMeta?.runtime ? parseInt(cinemetaMeta.runtime, 10) : undefined) || movie.runtime,
        vote_average: tmdbDetails?.vote_average || omdbData?.imdbRating || cinemetaMeta?.imdbRating || movie.vote_average,
        popularity: tmdbDetails?.popularity || movie.popularity || 10.0,
        tagline: tmdbDetails?.tagline || movie.tagline,
        original_language: tmdbDetails?.original_language || movie.original_language || 'en',
        director: director || movie.director,
        trailer_url: trailerUrl || movie.trailer_url,
        trailer_key: trailerKey || movie.trailer_key,
        trailer_site: trailerSite || movie.trailer_site,
        cast_json: castJson,
        release_date: releaseDate,
        year: year,
        imdb_id: targetImdbId,
        enriched_at: new Date().toISOString(),
      };

      // Arabic localization: Title, Overview, Tagline, Cast
      if (arMeta.titleAr) updatePayload.title_ar = arMeta.titleAr;
      if (arMeta.overviewAr) updatePayload.overview_ar = arMeta.overviewAr;
      if (arMeta.taglineAr) updatePayload.tagline_ar = arMeta.taglineAr;
      if (arMeta.castJsonAr) updatePayload.cast_json_ar = arMeta.castJsonAr;

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
    } catch (e: any) {
      console.error(`[CATEGORIZER] Movie #${movie.id} (${movie.title}) enrichment error:`, e.message);
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

  /// Fast multi-source knowledge graph sync across all 10,244 titles in Supabase
  async syncMultiSourceStreamingOriginals(batchSize: number = 200): Promise<{ processed: number; tagged: number }> {
    const streamingSources = (await import('./streaming_sources.service')).StreamingSourcesService.getInstance();
    await streamingSources.initialize();

    const supabase = SupabaseService.getClient();
    let offset = 0;
    let totalTagged = 0;
    let totalProcessed = 0;

    console.log('[CATEGORIZER] 🌐 Starting Multi-Source Streaming Originals Sync across database...');

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
              console.log(`[CATEGORIZER] 🏷️ Tagged [${movie.id}] "${movie.title}" as ${match.studioName}`);
            }
          }
        }
      }

      totalProcessed += movies.length;
      offset += movies.length;
      console.log(`[CATEGORIZER] Multi-source sync progress: ${offset}/10244 movies checked, ${totalTagged} originals tagged.`);
    }

    console.log(`[CATEGORIZER] 🎉 Multi-Source sync finished! Tagged ${totalTagged} originals.`);
    return { processed: totalProcessed, tagged: totalTagged };
  }
}
