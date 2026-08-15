import axios from 'axios';
import { env } from '../config/env';

export interface ImdbEnrichment {
  imdbId?: string;
  imdbRating?: number;
  imdbVotes?: number;
  metascore?: number;
  awards?: string;
  isTop250?: boolean;
  top250Rank?: number;
}

export class ImdbService {
  /// Fetches IMDb metadata via OMDb or open APIs
  async getImdbData(imdbId: string): Promise<ImdbEnrichment | null> {
    if (!imdbId || !imdbId.startsWith('tt')) return null;

    try {
      // 1. Try OMDb API if key is provided
      if (env.OMDB_API_KEY) {
        const res = await axios.get('https://www.omdbapi.com/', {
          params: {
            apikey: env.OMDB_API_KEY,
            i: imdbId,
          },
          timeout: 6000,
        });

        if (res.data && res.data.Response === 'True') {
          const rating = parseFloat(res.data.imdbRating) || undefined;
          const votes = parseInt((res.data.imdbVotes || '').replace(/,/g, ''), 10) || undefined;
          const metascore = parseInt(res.data.Metascore, 10) || undefined;
          const awards = res.data.Awards !== 'N/A' ? res.data.Awards : undefined;

          return {
            imdbId,
            imdbRating: rating,
            imdbVotes: votes,
            metascore,
            awards,
            isTop250: rating !== undefined && rating >= 8.3 && (votes ?? 0) > 100000,
          };
        }
      }

      // 2. Fallback to Cinemeta metadata API (free, open, no key required)
      const fallbackRes = await axios.get(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`, {
        timeout: 6000,
      });

      if (fallbackRes.data?.meta) {
        const meta = fallbackRes.data.meta;
        const rating = parseFloat(meta.imdbRating) || undefined;
        return {
          imdbId,
          imdbRating: rating,
          awards: meta.awards,
          isTop250: rating !== undefined && rating >= 8.3,
        };
      }
    } catch (e: any) {
      // Silent fail on external rating enrichment
    }

    return null;
  }
}
