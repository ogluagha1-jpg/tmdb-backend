import axios from 'axios';

export interface CinemetaMovieMeta {
  id: string;
  name: string;
  year?: string;
  runtime?: string;
  genres?: string[];
  director?: string[];
  cast?: string[];
  poster?: string;
  background?: string;
  description?: string;
  imdbRating?: number;
  trailers?: Array<{ source: string; type: string }>;
}

export class CinemetaService {
  private static instance: CinemetaService;
  private readonly baseUrl = 'https://v3-cinemeta.strem.io';

  public static getInstance(): CinemetaService {
    if (!CinemetaService.instance) {
      CinemetaService.instance = new CinemetaService();
    }
    return CinemetaService.instance;
  }

  /// Fetches metadata by IMDb ID from Cinemeta CDN
  async getMeta(imdbId: string): Promise<CinemetaMovieMeta | null> {
    if (!imdbId || !imdbId.startsWith('tt')) return null;

    try {
      const res = await axios.get(`${this.baseUrl}/meta/movie/${imdbId}.json`, {
        headers: { 'User-Agent': 'Teraflix/1.0' },
        timeout: 5000,
      });

      const meta = res.data?.meta;
      if (!meta) return null;

      return {
        id: meta.id || imdbId,
        name: meta.name || '',
        year: meta.year ? String(meta.year) : undefined,
        runtime: meta.runtime ? String(meta.runtime) : undefined,
        genres: Array.isArray(meta.genres) ? meta.genres : (typeof meta.genres === 'string' ? meta.genres.split(',').map((g: string) => g.trim()) : []),
        director: Array.isArray(meta.director) ? meta.director : (meta.director ? [meta.director] : []),
        cast: Array.isArray(meta.cast) ? meta.cast : (typeof meta.cast === 'string' ? meta.cast.split(',').map((c: string) => c.trim()) : []),
        poster: meta.poster || undefined,
        background: meta.background || undefined,
        description: meta.description || undefined,
        imdbRating: parseFloat(meta.imdbRating) || undefined,
        trailers: Array.isArray(meta.trailers) ? meta.trailers : [],
      };
    } catch {
      return null;
    }
  }

  /// Searches Cinemeta catalog by title
  async searchCatalog(title: string): Promise<CinemetaMovieMeta[]> {
    if (!title || title.trim().length < 2) return [];

    try {
      const query = encodeURIComponent(title.trim());
      const res = await axios.get(`${this.baseUrl}/catalog/movie/top/search=${query}.json`, {
        headers: { 'User-Agent': 'Teraflix/1.0' },
        timeout: 5000,
      });

      const metas = res.data?.metas || [];
      return metas.map((m: any) => ({
        id: m.id || m.imdb_id || '',
        name: m.name || '',
        year: m.year ? String(m.year) : undefined,
        poster: m.poster || undefined,
        background: m.background || undefined,
        genres: Array.isArray(m.genres) ? m.genres : [],
        imdbRating: parseFloat(m.imdbRating) || undefined,
      }));
    } catch {
      return [];
    }
  }
}
