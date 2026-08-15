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

  /// Fetches daily trending movies from TMDB
  async getDailyTrending(): Promise<number[]> {
    try {
      const res = await this.client.get('/trending/movie/day');
      return (res.data.results || []).map((m: any) => m.id);
    } catch (e: any) {
      console.error('[TMDB] getDailyTrending error:', e.message);
      return [];
    }
  }

  /// Fetches weekly trending movies from TMDB
  async getWeeklyTrending(): Promise<number[]> {
    try {
      const res = await this.client.get('/trending/movie/week');
      return (res.data.results || []).map((m: any) => m.id);
    } catch (e: any) {
      console.error('[TMDB] getWeeklyTrending error:', e.message);
      return [];
    }
  }

  /// Fetches top rated movies from TMDB
  async getTopRated(): Promise<number[]> {
    try {
      const res = await this.client.get('/movie/top_rated');
      return (res.data.results || []).map((m: any) => m.id);
    } catch (e: any) {
      console.error('[TMDB] getTopRated error:', e.message);
      return [];
    }
  }

  /// Fetches comprehensive movie details including keywords, cast, crew, videos, collection, and watch/providers
  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails | null> {
    try {
      await this.delay(100);
      const res = await this.client.get(`/movie/${tmdbId}`, {
        params: {
          append_to_response: 'keywords,credits,videos,watch/providers',
        },
      });
      return res.data;
    } catch (e: any) {
      if (e.response?.status !== 404) {
        console.error(`[TMDB] getMovieDetails (${tmdbId}) error:`, e.message);
      }
      return null;
    }
  }

  /// Fetches Arabic localized metadata (title, overview, tagline)
  async getArabicMetadata(tmdbId: number): Promise<{ titleAr?: string; overviewAr?: string; taglineAr?: string }> {
    try {
      await this.delay(100);
      const res = await this.client.get(`/movie/${tmdbId}`, {
        params: {
          language: 'ar-SA',
        },
      });
      const data = res.data;
      return {
        titleAr: data.title && data.title !== data.original_title ? data.title : undefined,
        overviewAr: data.overview && data.overview.trim().length > 0 ? data.overview : undefined,
        taglineAr: data.tagline && data.tagline.trim().length > 0 ? data.tagline : undefined,
      };
    } catch {
      return {};
    }
  }

  /// Search for a movie by clean title and optional year
  async searchMovie(title: string, year?: string): Promise<TmdbMovieDetails | null> {
    try {
      await this.delay(150);
      const params: any = { query: title };
      if (year && year.length >= 4) {
        params.primary_release_year = year.substring(0, 4);
      }
      const res = await this.client.get('/search/movie', { params });
      const results = res.data.results || [];
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
