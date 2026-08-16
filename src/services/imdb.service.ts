import axios from 'axios';
import { env } from '../config/env';

export interface OmdbMovieData {
  imdbId: string;
  imdbRating?: number;
  imdbVotes?: number;
  rottenTomatoesScore?: number; // e.g. 93
  metascore?: number; // e.g. 90
  awards?: string; // e.g. "Won 7 Oscars. 370 wins..."
  rated?: string; // e.g. "PG-13", "R", "TV-MA"
  boxOffice?: string; // e.g. "$330,078,895"
  isTop250?: boolean;
}

export class ImdbService {
  private omdbKeys: string[] = [];
  private currentKeyIndex = 0;

  constructor() {
    this.omdbKeys = [
      env.OMDB_API_KEY || '',
      'b7da8d63',
      'trilogy',
    ].filter(Boolean);
  }

  /// Fetches comprehensive OMDb / Rotten Tomatoes / IMDb metadata
  async getImdbData(imdbId: string): Promise<OmdbMovieData | null> {
    if (!imdbId || !imdbId.startsWith('tt')) return null;

    // 1. Try OMDb API keys in rotation
    for (let i = 0; i < this.omdbKeys.length; i++) {
      const key = this.omdbKeys[(this.currentKeyIndex + i) % this.omdbKeys.length];
      try {
        const res = await axios.get('https://www.omdbapi.com/', {
          params: { apikey: key, i: imdbId },
          timeout: 5000,
        });

        if (res.data && res.data.Response === 'True') {
          const d = res.data;
          const imdbRating = parseFloat(d.imdbRating) || undefined;
          const imdbVotes = parseInt((d.imdbVotes || '').replace(/,/g, ''), 10) || undefined;
          const metascore = parseInt(d.Metascore, 10) || undefined;
          const awards = d.Awards !== 'N/A' ? d.Awards : undefined;
          const rated = d.Rated !== 'N/A' ? d.Rated : undefined;
          const boxOffice = d.BoxOffice !== 'N/A' ? d.BoxOffice : undefined;

          // Parse Rotten Tomatoes score (e.g. "93%")
          let rtScore: number | undefined;
          const rtRating = (d.Ratings || []).find((r: any) => r.Source === 'Rotten Tomatoes');
          if (rtRating && rtRating.Value) {
            rtScore = parseInt(rtRating.Value.replace('%', ''), 10) || undefined;
          }

          return {
            imdbId,
            imdbRating,
            imdbVotes,
            rottenTomatoesScore: rtScore,
            metascore,
            awards,
            rated,
            boxOffice,
            isTop250: imdbRating !== undefined && imdbRating >= 8.3 && (imdbVotes ?? 0) > 100000,
          };
        }
      } catch {
        // Rotate key on rate limit / network error
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.omdbKeys.length;
      }
    }

    // 2. Open Cinemeta Fallback (No key needed)
    try {
      const fallbackRes = await axios.get(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`, {
        timeout: 4000,
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
    } catch {
      // Silent fail
    }

    return null;
  }
}
