import { SupabaseService } from './supabase.service';
import { TmdbService } from './tmdb.service';
import { env } from '../config/env';

export interface CategoryDefinition {
  id: string;
  title: string;
  title_ar: string;
  category_type: 'trending' | 'top10' | 'new_releases' | 'genre' | 'thematic' | 'era' | 'curated';
  genre_id?: number;
  keyword_tag?: string;
  order_by?: string;
  filter_query?: string;
  sort_order: number;
}

export class CategoryGeneratorService {
  private tmdb: TmdbService;

  constructor() {
    this.tmdb = new TmdbService();
  }

  /// All potential category candidates to test against database catalogue
  private getCandidateCategories(): CategoryDefinition[] {
    return [
      // 1. Trending & Rankings
      {
        id: 'top10_today',
        title: 'TOP 10 MOVIES TODAY',
        title_ar: 'أفضل 10 أفلام اليوم',
        category_type: 'top10',
        order_by: 'popularity.desc',
        sort_order: 1,
      },
      {
        id: 'trending_now',
        title: 'TRENDING NOW',
        title_ar: 'الأكثر رواجاً الآن',
        category_type: 'trending',
        order_by: 'popularity.desc',
        sort_order: 2,
      },
      {
        id: 'new_releases',
        title: 'NEW RELEASES (2025 - 2026)',
        title_ar: 'أحدث الإصدارات الحصرية',
        category_type: 'new_releases',
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
        order_by: 'vote_average.desc',
        filter_query: 'vote_average=gte.8.0',
        sort_order: 4,
      },
      {
        id: 'arabic_hits',
        title: 'ARABIC CINEMA & REGIONAL HITS',
        title_ar: 'السينما العربية وروائع الشرق',
        category_type: 'curated',
        order_by: 'popularity.desc',
        filter_query: 'original_language=eq.ar',
        sort_order: 5,
      },

      // 3. Major Genres
      {
        id: 'genre_action',
        title: 'ADRENALINE RUSH: ACTION & COMBAT',
        title_ar: 'أفلام الحركة والإثارة القصوى',
        category_type: 'genre',
        genre_id: 28,
        order_by: 'popularity.desc',
        sort_order: 6,
      },
      {
        id: 'genre_scifi',
        title: 'MIND-BENDING SCI-FI & CYBERPUNK',
        title_ar: 'روائع الخيال العلمي والفضاء',
        category_type: 'genre',
        genre_id: 878,
        order_by: 'popularity.desc',
        sort_order: 7,
      },
      {
        id: 'genre_comedy',
        title: 'NON-STOP COMEDY & LAUGHTER',
        title_ar: 'أفلام الكوميديا والضحك',
        category_type: 'genre',
        genre_id: 35,
        order_by: 'popularity.desc',
        sort_order: 8,
      },
      {
        id: 'genre_horror',
        title: 'CHILLING HORROR & SUPERNATURAL',
        title_ar: 'أفلام الرعب والغموض المرعب',
        category_type: 'genre',
        genre_id: 27,
        order_by: 'popularity.desc',
        sort_order: 9,
      },
      {
        id: 'genre_crime_thriller',
        title: 'CRIME, HEISTS & DETECTIVES',
        title_ar: 'عالم الجريمة والتحقيق والمطاردات',
        category_type: 'genre',
        genre_id: 80,
        order_by: 'popularity.desc',
        sort_order: 10,
      },
      {
        id: 'genre_animation_family',
        title: 'FAMILY & ANIMATION ADVENTURES',
        title_ar: 'رسوم متحركة ومغامرات عائلية',
        category_type: 'genre',
        genre_id: 16,
        order_by: 'popularity.desc',
        sort_order: 11,
      },
      {
        id: 'genre_adventure',
        title: 'EPIC EXPEDITIONS & ADVENTURE',
        title_ar: 'المغامرات الملحمية والاستكشاف',
        category_type: 'genre',
        genre_id: 12,
        order_by: 'popularity.desc',
        sort_order: 12,
      },
      {
        id: 'genre_drama',
        title: 'POWERFUL DRAMAS & LIFE STORIES',
        title_ar: 'دراما مؤثرة وقصص واقعية',
        category_type: 'genre',
        genre_id: 18,
        order_by: 'vote_average.desc',
        sort_order: 13,
      },
      {
        id: 'genre_mystery',
        title: 'MYSTERY & SUSPENSE THRILLERS',
        title_ar: 'أسرار معقدة وتشويق غامض',
        category_type: 'genre',
        genre_id: 9648,
        order_by: 'popularity.desc',
        sort_order: 14,
      },
      {
        id: 'genre_romance',
        title: 'ROMANTIC STORIES & PASSION',
        title_ar: 'الرومانسية والقصص العاطفية',
        category_type: 'genre',
        genre_id: 10749,
        order_by: 'popularity.desc',
        sort_order: 15,
      },
      {
        id: 'genre_fantasy',
        title: 'MYTHICAL REALMS & FANTASY',
        title_ar: 'عوالم السحر والفانتازيا الملحمية',
        category_type: 'genre',
        genre_id: 14,
        order_by: 'popularity.desc',
        sort_order: 16,
      },
      {
        id: 'genre_war_history',
        title: 'HISTORICAL EPICS & WAR HEROES',
        title_ar: 'المعارك الحربية والملاحم التاريخية',
        category_type: 'genre',
        genre_id: 10752,
        order_by: 'vote_average.desc',
        sort_order: 17,
      },
      {
        id: 'genre_documentary',
        title: 'FASCINATING DOCUMENTARIES',
        title_ar: 'الوثائقيات الملهمة والحقائق',
        category_type: 'genre',
        genre_id: 99,
        order_by: 'popularity.desc',
        sort_order: 18,
      },

      // 4. Era & Decade Collections
      {
        id: 'era_2020s',
        title: 'MODERN BLOCKBUSTERS (2020 - 2026)',
        title_ar: 'سينما العقد الحالي الحديثة',
        category_type: 'era',
        order_by: 'popularity.desc',
        filter_query: 'release_date=gte.2020-01-01',
        sort_order: 19,
      },
      {
        id: 'era_2010s',
        title: 'PEAK 2010s CINEMA GEMS',
        title_ar: 'روائع عقد 2010 التي لا تُنسى',
        category_type: 'era',
        order_by: 'vote_average.desc',
        filter_query: 'release_date=gte.2010-01-01&release_date=lte.2019-12-31',
        sort_order: 20,
      },
      {
        id: 'era_2000s',
        title: '2000s NOSTALGIA HITS',
        title_ar: 'ذكريات أفلام الألفية المبكرة',
        category_type: 'era',
        order_by: 'vote_average.desc',
        filter_query: 'release_date=gte.2000-01-01&release_date=lte.2009-12-31',
        sort_order: 21,
      },
      {
        id: 'era_90s',
        title: 'GOLDEN 90s LEGENDARY CLASSICS',
        title_ar: 'كلاسيكيات التسعينات الذهبية',
        category_type: 'era',
        order_by: 'vote_average.desc',
        filter_query: 'release_date=gte.1990-01-01&release_date=lte.1999-12-31',
        sort_order: 22,
      },
    ];
  }

  /// Counts the actual available movies in Supabase for a given category candidate
  private async countMoviesForCategory(cat: CategoryDefinition): Promise<number> {
    const supabase = SupabaseService.getClient();
    let query = supabase.from('movies').select('id', { count: 'exact', head: true });

    // Enforce valid streamable content
    query = query.not('title', 'is', null).neq('title', '').neq('title', 'Untitled');

    if (cat.genre_id) {
      query = query.filter('genres_json', 'cs', `[{"id":${cat.genre_id}}]`);
    }

    if (cat.filter_query) {
      // Parse basic filter queries
      const pairs = cat.filter_query.split('&');
      for (const pair of pairs) {
        if (pair.startsWith('vote_average=gte.')) {
          const val = parseFloat(pair.replace('vote_average=gte.', ''));
          query = query.gte('vote_average', val);
        } else if (pair.startsWith('original_language=eq.')) {
          const val = pair.replace('original_language=eq.', '');
          query = query.eq('original_language', val);
        } else if (pair.startsWith('release_date=gte.')) {
          const val = pair.replace('release_date=gte.', '');
          query = query.gte('release_date', val);
        } else if (pair.startsWith('release_date=lte.')) {
          const val = pair.replace('release_date=lte.', '');
          query = query.lte('release_date', val);
        }
      }
    }

    const { count, error } = await query;
    if (error) {
      console.error(`[CATEGORY_GEN] Error counting for "${cat.id}":`, error.message || error);
      return 0;
    }
    return count ?? 0;
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
        genre_id: cat.genre_id ?? null,
        order_by: cat.order_by ?? 'popularity.desc',
        filter_query: cat.filter_query ?? null,
        movie_count: movieCount,
        sort_order: currentSortOrder++,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      console.log(`[CATEGORY_GEN] ✓ Approved "${cat.title}" (${movieCount} titles)`);
    }

    if (validCategoriesToPublish.length === 0) {
      console.warn('[CATEGORY_GEN] No categories met the minimum threshold criteria.');
      return { totalCandidates: candidates.length, published: 0 };
    }

    // Upsert published categories into home_categories table
    const { error: upsertErr } = await supabase
      .from('home_categories')
      .upsert(validCategoriesToPublish, { onConflict: 'id' });

    if (upsertErr) {
      console.error('[CATEGORY_GEN] Failed to upsert home_categories:', upsertErr.message);
    } else {
      // Deactivate any categories in DB that are no longer in our published list
      const publishedIds = validCategoriesToPublish.map((c) => c.id);
      const { error: deactivateErr } = await supabase
        .from('home_categories')
        .update({ is_active: false })
        .not('id', 'in', `(${publishedIds.join(',')})`);

      if (deactivateErr) {
        console.warn('[CATEGORY_GEN] Error deactivating stale categories:', deactivateErr.message);
      }

      console.log(`[CATEGORY_GEN] 🎉 Successfully published ${validCategoriesToPublish.length} active home categories!`);
    }

    return { totalCandidates: candidates.length, published: validCategoriesToPublish.length };
  }
}
