import axios from 'axios';
import { SupabaseService } from './supabase.service';
import { TmdbService } from './tmdb.service';
import { env } from '../config/env';

export interface CategoryDefinition {
  id: string;
  title: string;
  title_ar: string;
  category_type: 'trending' | 'top10' | 'new_releases' | 'genre' | 'thematic' | 'era' | 'curated';
  genre_id?: number;
  order_by?: string;
  filter_query?: string;
  sort_order: number;
}

export class CategoryGeneratorService {
  private tmdb: TmdbService;

  constructor() {
    this.tmdb = new TmdbService();
  }

  /// All potential category candidates to test against database catalogue (No studio categories)
  private getCandidateCategories(): CategoryDefinition[] {
    return [
      // 1. Trending & Rankings
      {
        id: 'top10_today',
        title: 'TOP 10 MOVIES TODAY',
        title_ar: 'أفضل 10 أفلام اليوم',
        category_type: 'top10',
        genre_id: 0,
        order_by: 'popularity.desc',
        filter_query: 'order=popularity.desc&limit=10',
        sort_order: 1,
      },
      {
        id: 'trending_now',
        title: 'TRENDING NOW',
        title_ar: 'الأكثر رواجاً الآن',
        category_type: 'trending',
        genre_id: 0,
        order_by: 'popularity.desc',
        filter_query: 'order=popularity.desc',
        sort_order: 2,
      },
      {
        id: 'new_releases',
        title: 'NEW RELEASES (2025 - 2026)',
        title_ar: 'أحدث الإصدارات الحصرية',
        category_type: 'new_releases',
        genre_id: 0,
        order_by: 'release_date.desc.nullslast',
        filter_query: 'release_date=gte.2024-01-01',
        sort_order: 3,
      },

      // 2. Prestige & Curated
      {
        id: 'imdb_top_rated',
        title: 'CRITICALLY ACCLAIMED & TOP RATED',
        title_ar: 'أعلى الأفلام تقييماً عالمياً',
        category_type: 'curated',
        genre_id: 0,
        order_by: 'vote_average.desc',
        filter_query: 'vote_average=gte.8.0',
        sort_order: 4,
      },
      {
        id: 'arabic_hits',
        title: 'ARABIC CINEMA & REGIONAL HITS',
        title_ar: 'السينما العربية وروائع الشرق',
        category_type: 'curated',
        genre_id: 0,
        order_by: 'popularity.desc',
        filter_query: 'original_language=eq.ar',
        sort_order: 5,
      },

      // 3. Major Genres (Clean, Non-duplicated)
      {
        id: 'genre_action',
        title: 'ADRENALINE RUSH: ACTION & COMBAT',
        title_ar: 'أفلام الحركة والإثارة القصوى',
        category_type: 'genre',
        genre_id: 28,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":28}]',
        sort_order: 6,
      },
      {
        id: 'genre_scifi',
        title: 'MIND-BENDING SCI-FI & CYBERPUNK',
        title_ar: 'روائع الخيال العلمي والفضاء',
        category_type: 'genre',
        genre_id: 878,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":878}]',
        sort_order: 7,
      },
      {
        id: 'genre_comedy',
        title: 'NON-STOP COMEDY & LAUGHTER',
        title_ar: 'أفلام الكوميديا والضحك',
        category_type: 'genre',
        genre_id: 35,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":35}]',
        sort_order: 8,
      },
      {
        id: 'genre_horror',
        title: 'CHILLING HORROR & SUPERNATURAL',
        title_ar: 'أفلام الرعب والغموض المرعب',
        category_type: 'genre',
        genre_id: 27,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":27}]',
        sort_order: 9,
      },
      {
        id: 'genre_crime_thriller',
        title: 'CRIME, HEISTS & DETECTIVES',
        title_ar: 'عالم الجريمة والتحقيق والمطاردات',
        category_type: 'genre',
        genre_id: 80,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":80}]',
        sort_order: 10,
      },
      {
        id: 'genre_animation_family',
        title: 'FAMILY & ANIMATION ADVENTURES',
        title_ar: 'رسوم متحركة ومغامرات عائلية',
        category_type: 'genre',
        genre_id: 16,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":16}]',
        sort_order: 11,
      },
      {
        id: 'genre_adventure',
        title: 'EPIC EXPEDITIONS & ADVENTURE',
        title_ar: 'المغامرات الملحمية والاستكشاف',
        category_type: 'genre',
        genre_id: 12,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":12}]',
        sort_order: 12,
      },
      {
        id: 'genre_drama',
        title: 'POWERFUL DRAMAS & LIFE STORIES',
        title_ar: 'دراما مؤثرة وقصص واقعية',
        category_type: 'genre',
        genre_id: 18,
        order_by: 'vote_average.desc',
        filter_query: 'genres_json=cs.[{"id":18}]',
        sort_order: 13,
      },
      {
        id: 'genre_mystery',
        title: 'MYSTERY & SUSPENSE THRILLERS',
        title_ar: 'ألغاز مشوقة وإثارة نفسية',
        category_type: 'genre',
        genre_id: 9648,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":9648}]',
        sort_order: 14,
      },
      {
        id: 'genre_romance',
        title: 'ROMANTIC STORIES & PASSION',
        title_ar: 'قصص الحب والرومانسية',
        category_type: 'genre',
        genre_id: 10749,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":10749}]',
        sort_order: 15,
      },
      {
        id: 'genre_fantasy',
        title: 'MYTHICAL REALMS & FANTASY',
        title_ar: 'عوالم السحر والخيال الأسطوري',
        category_type: 'genre',
        genre_id: 14,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":14}]',
        sort_order: 16,
      },
      {
        id: 'genre_history_war',
        title: 'HISTORICAL EPICS & WAR HEROES',
        title_ar: 'حروب تاريخية وملاحم كبرى',
        category_type: 'genre',
        genre_id: 10752,
        order_by: 'vote_average.desc',
        filter_query: 'genres_json=cs.[{"id":10752}]',
        sort_order: 17,
      },
      {
        id: 'genre_documentary',
        title: 'FASCINATING DOCUMENTARIES',
        title_ar: 'وثائقيات تكشف أسرار العالم',
        category_type: 'genre',
        genre_id: 99,
        order_by: 'popularity.desc',
        filter_query: 'genres_json=cs.[{"id":99}]',
        sort_order: 18,
      },

      // 4. Era-Based Collections
      {
        id: 'era_2020s',
        title: 'MODERN BLOCKBUSTERS (2020 - 2026)',
        title_ar: 'أقوى إنتاجات العقد الحالي',
        category_type: 'era',
        genre_id: 0,
        order_by: 'popularity.desc',
        filter_query: 'release_date=gte.2020-01-01',
        sort_order: 19,
      },
      {
        id: 'era_2010s',
        title: 'PEAK 2010s CINEMA GEMS',
        title_ar: 'روائع عقد 2010 الذهبي',
        category_type: 'era',
        genre_id: 0,
        order_by: 'vote_average.desc',
        filter_query: 'release_date=gte.2010-01-01&release_date=lte.2019-12-31',
        sort_order: 20,
      },
      {
        id: 'era_2000s',
        title: '2000s NOSTALGIA HITS',
        title_ar: 'نوستالجيا روائع الألفينات',
        category_type: 'era',
        genre_id: 0,
        order_by: 'vote_average.desc',
        filter_query: 'release_date=gte.2000-01-01&release_date=lte.2009-12-31',
        sort_order: 21,
      },
      {
        id: 'era_90s',
        title: 'GOLDEN 90s LEGENDARY CLASSICS',
        title_ar: 'كلاسيكيات التسعينات الذهبية',
        category_type: 'era',
        genre_id: 0,
        order_by: 'vote_average.desc',
        filter_query: 'release_date=gte.1990-01-01&release_date=lte.1999-12-31',
        sort_order: 22,
      },
    ];
  }

  /// Counts the actual available movies in Supabase for a given category candidate via REST
  private async countMoviesForCategory(cat: CategoryDefinition): Promise<number> {
    try {
      const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
      const base = `${env.SUPABASE_URL}/rest/v1/movies?select=id`;
      let queryUrl = base;

      if (cat.genre_id && cat.genre_id > 0) {
        queryUrl += `&genres_json=cs.[{"id":${cat.genre_id}}]`;
      }

      if (cat.filter_query) {
        // Strip order= or limit= for counting
        const parts = cat.filter_query.split('&').filter((p) => !p.startsWith('order=') && !p.startsWith('limit='));
        if (parts.length > 0) {
          queryUrl += `&${parts.join('&')}`;
        }
      }

      const res = await axios.get(queryUrl, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: '0-0',
          Prefer: 'count=exact',
        },
        timeout: 5000,
      });

      const range = res.headers['content-range'];
      if (range) {
        const total = parseInt(range.split('/')[1], 10);
        return isNaN(total) ? 0 : total;
      }
      return 0;
    } catch (err: any) {
      console.error(`[CATEGORY_GEN] Error counting for "${cat.id}":`, err.message);
      return 0;
    }
  }

  /// Regenerates the home_categories table in Supabase with verified non-empty categories
  async generateAndSyncCategories(): Promise<{ totalCandidates: number; published: number }> {
    const supabase = SupabaseService.getClient();
    const minThreshold = env.MIN_MOVIES_PER_CATEGORY;
    console.log(`[CATEGORY_GEN] Evaluating categories with minimum threshold >= ${minThreshold} movies...`);

    const candidates = this.getCandidateCategories();
    const validCategoriesToPublish: any[] = [];

    let currentSortOrder = 1;

    for (const cat of candidates) {
      const movieCount = await this.countMoviesForCategory(cat);
      console.log(`[CATEGORY_GEN] Category "${cat.title}" -> ${movieCount} movies in database.`);

      // Strict Threshold Gate: Ignore categories with 0 or very few movies
      if (movieCount < minThreshold) {
        console.log(`[CATEGORY_GEN] ✗ Skipping "${cat.title}" (Below threshold: ${movieCount} < ${minThreshold})`);
        continue;
      }

      validCategoriesToPublish.push({
        id: cat.id,
        title: cat.title,
        title_ar: cat.title_ar,
        category_type: cat.category_type,
        genre_id: cat.genre_id || null,
        order_by: cat.order_by || 'popularity.desc',
        filter_query: cat.filter_query || null,
        movie_count: movieCount,
        sort_order: currentSortOrder++,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      console.log(`[CATEGORY_GEN] ✓ Approved "${cat.title}" (${movieCount} titles)`);
    }

    if (validCategoriesToPublish.length === 0) {
      console.warn('[CATEGORY_GEN] No valid categories met the threshold. Keeping existing table unchanged.');
      return { totalCandidates: candidates.length, published: 0 };
    }

    // Clean up any obsolete studio categories and duplicate rows from Supabase
    try {
      await supabase.from('home_categories').delete().eq('category_type', 'studio');
      await supabase.from('home_categories').delete().eq('id', 'genre_war_history');
    } catch (_) {}

    // Atomic Upsert: Replace or update existing clean categories
    const { error: upsertErr } = await supabase
      .from('home_categories')
      .upsert(validCategoriesToPublish, { onConflict: 'id' });

    if (upsertErr) {
      console.error('[CATEGORY_GEN] Failed to publish home categories:', upsertErr.message);
      throw upsertErr;
    }

    console.log(`[CATEGORY_GEN] 🎉 Successfully published ${validCategoriesToPublish.length} active home categories!`);
    return {
      totalCandidates: candidates.length,
      published: validCategoriesToPublish.length,
    };
  }
}
