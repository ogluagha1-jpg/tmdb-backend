import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path?: string;
  origin_country?: string;
}

export interface TmdbMovieDetails {
  id: number;
  imdb_id?: string;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  tagline?: string;
  original_language?: string;
  genres?: TmdbGenre[];
  production_companies?: TmdbProductionCompany[];
  keywords?: {
    keywords?: TmdbKeyword[];
  };
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string;
    backdrop_path?: string;
  };
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string;
      profile_path?: string;
      order?: number;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job?: string;
      department?: string;
    }>;
  };
  videos?: {
    results?: Array<{
      id: string;
      key: string;
      site: string;
      type: string;
      official?: boolean;
    }>;
  };
}

export class TmdbService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.themoviedb.org/3',
      params: {
        api_key: env.TMDB_API_KEY,
      },
      timeout: 10000,
    });
  }

  /// Rate-limiting delay helper to respect TMDB guidelines
  private async delay(ms: number = 250): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /// Executes request with automatic exponential backoff retry for 429 / network errors
  private async requestWithRetry<T>(fn: () => Promise<T>, retries: number = 2, delayMs: number = 300): Promise<T | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        if (attempt === retries) return null;
        const isRateLimited = err.response?.status === 429;
        const waitTime = isRateLimited ? (attempt + 1) * 1000 : delayMs * Math.pow(2, attempt);
        await this.delay(waitTime);
      }
    }
    return null;
  }

  /// Fetches daily trending movies from TMDB
  async getDailyTrending(): Promise<number[]> {
    const res = await this.requestWithRetry(() => this.client.get('/trending/movie/day'));
    return (res?.data?.results || []).map((m: any) => m.id);
  }

  /// Fetches weekly trending movies from TMDB
  async getWeeklyTrending(): Promise<number[]> {
    const res = await this.requestWithRetry(() => this.client.get('/trending/movie/week'));
    return (res?.data?.results || []).map((m: any) => m.id);
  }

  /// Fetches top rated movies from TMDB
  async getTopRated(): Promise<number[]> {
    const res = await this.requestWithRetry(() => this.client.get('/movie/top_rated'));
    return (res?.data?.results || []).map((m: any) => m.id);
  }

  /// Fetches comprehensive movie details including keywords, cast, crew, videos, and collection
  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails | null> {
    try {
      await this.delay(100);
      const res = await this.requestWithRetry(() =>
        this.client.get(`/movie/${tmdbId}`, {
          params: {
            append_to_response: 'keywords,credits,videos',
          },
        })
      );
      return res?.data || null;
    } catch {
      return null;
    }
  }

  /// Wikipedia Arabic Interlanguage Fallback
  async getWikipediaArabicTitle(title: string): Promise<string | undefined> {
    try {
      if (!title || title.trim().length < 2) return undefined;
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=ar&titles=${encodeURIComponent(title)}&redirects=1&format=json`;
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'TeraflixBot/1.0 (contact@teraflix.app)' },
        timeout: 4000,
      });

      const pages = res.data?.query?.pages || {};
      for (const k in pages) {
        const ll = pages[k]?.langlinks;
        if (ll && ll[0]?.['*']) {
          const ar = ll[0]['*'].replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
          if (ar.length > 0) return ar;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /// Fetches Arabic localized metadata (title, overview, tagline, cast_ar)
  async getArabicMetadata(tmdbId: number, englishTitle?: string): Promise<{
    titleAr?: string;
    overviewAr?: string;
    taglineAr?: string;
    castJsonAr?: any[];
  }> {
    try {
      await this.delay(100);
      const [detailsRes, creditsRes] = await Promise.all([
        this.client.get(`/movie/${tmdbId}`, { params: { language: 'ar-SA' } }).catch(() => null),
        this.client.get(`/movie/${tmdbId}/credits`, { params: { language: 'ar-SA' } }).catch(() => null),
      ]);

      const data = detailsRes?.data || {};
      const castAr = (creditsRes?.data?.cast || [])
        .slice(0, 10)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path,
        }));

      let titleAr = data.title && data.title !== data.original_title ? data.title : undefined;

      // Cooperative Wikipedia Arabic Fallback if TMDB has no Arabic title
      if (!titleAr && englishTitle) {
        titleAr = await this.getWikipediaArabicTitle(englishTitle);
      }

      return {
        titleAr,
        overviewAr: data.overview && data.overview.trim().length > 0 ? data.overview : undefined,
        taglineAr: data.tagline && data.tagline.trim().length > 0 ? data.tagline : undefined,
        castJsonAr: castAr.length > 0 ? castAr : undefined,
      };
    } catch {
      return {};
    }
  }

  /// Fetches real-time worldwide trending movies from TMDB API
  async getTrendingMovies(timeWindow: 'day' | 'week' = 'day', pages: number = 3): Promise<number[]> {
    const tmdbIds: number[] = [];
    try {
      for (let page = 1; page <= pages; page++) {
        const res = await this.requestWithRetry(() =>
          this.client.get(`/trending/movie/${timeWindow}`, {
            params: { page },
          })
        );
        const results = res?.data?.results || [];
        results.forEach((m: any) => {
          if (m.id) tmdbIds.push(m.id);
        });
      }
    } catch (e: any) {
      console.error('[TMDB] getTrendingMovies error:', e.message);
    }
    return tmdbIds;
  }

  /// Search for a movie by clean title and optional year
  async searchMovie(title: string, year?: string): Promise<TmdbMovieDetails | null> {
    try {
      await this.delay(150);
      const params: any = { query: title };
      if (year && year.length >= 4) {
        params.primary_release_year = year.substring(0, 4);
      }
      const res = await this.requestWithRetry(() => this.client.get('/search/movie', { params }));
      const results = res?.data?.results || [];
      if (results.length > 0) {
        return await this.getMovieDetails(results[0].id);
      }
      return null;
    } catch (e: any) {
      console.error(`[TMDB] searchMovie (${title}) error:`, e.message);
      return null;
    }
  }
}
