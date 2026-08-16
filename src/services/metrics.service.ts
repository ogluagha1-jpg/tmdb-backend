import axios from 'axios';
import os from 'os';
import { env } from '../config/env';

export interface StudioMetric {
  id: string;
  name: string;
  nameAr: string;
  count: number;
  color: string;
}

export interface CategoryMetric {
  id: string;
  title: string;
  title_ar: string;
  category_type: string;
  movie_count: number;
  sort_order: number;
  is_active: boolean;
}

export interface DashboardMetrics {
  server: {
    status: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    memoryUsedMB: number;
    memoryTotalMB: number;
    cpuCount: number;
    nodeVersion: string;
    timestamp: string;
  };
  catalogue: {
    totalMovies: number;
    withStudios: number;
    withGenres: number;
    withKeywords: number;
    withArabicTitle: number;
    withArabicOverview: number;
    withArabicTagline: number;
    withAnyArabic: number;
    arabicCoveragePct: number;
  };
  recentReleases: {
    y2026: { translated: number; total: number; pct: number };
    y2025: { translated: number; total: number; pct: number };
    y2024: { translated: number; total: number; pct: number };
    modernEra: { translated: number; total: number; pct: number };
  };
  studios: StudioMetric[];
  categories: CategoryMetric[];
}

export class MetricsService {
  private async countQuery(filter: string): Promise<number> {
    try {
      const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
      let url = `${env.SUPABASE_URL}/rest/v1/movies?select=id`;
      if (filter) {
        url += `&${filter}`;
      }

      const res = await axios.get(url, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Range: '0-0',
          Prefer: 'count=exact',
        },
        timeout: 4000,
      });

      const range = res.headers['content-range'];
      if (range) {
        const total = parseInt(range.split('/')[1], 10);
        return isNaN(total) ? 0 : total;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const uptimeSec = process.uptime();
    const mem = process.memoryUsage();

    // 1. Parallel catalogue counts
    const [
      totalMovies,
      withStudios,
      withGenres,
      withKeywords,
      withArabicTitle,
      withArabicOverview,
      withArabicTagline,
      withAnyArabic,
    ] = await Promise.all([
      this.countQuery(''),
      this.countQuery('studios_json=neq.[]&studios_json=not.is.null'),
      this.countQuery('genres_json=neq.[]&genres_json=not.is.null'),
      this.countQuery('keywords_json=neq.[]&keywords_json=not.is.null'),
      this.countQuery('title_ar=not.is.null&title_ar=neq.'),
      this.countQuery('overview_ar=not.is.null&overview_ar=neq.'),
      this.countQuery('tagline_ar=not.is.null&tagline_ar=neq.'),
      this.countQuery('or=(title_ar.not.is.null,overview_ar.not.is.null,tagline_ar.not.is.null)'),
    ]);

    // 2. Recent year translations
    const [
      y2026Trans,
      y2026Tot,
      y2025Trans,
      y2025Tot,
      y2024Trans,
      y2024Tot,
      modernTrans,
      modernTot,
    ] = await Promise.all([
      this.countQuery('release_date=gte.2026-01-01&or=(title_ar.not.is.null,overview_ar.not.is.null)'),
      this.countQuery('release_date=gte.2026-01-01'),
      this.countQuery('release_date=gte.2025-01-01&release_date=lte.2025-12-31&or=(title_ar.not.is.null,overview_ar.not.is.null)'),
      this.countQuery('release_date=gte.2025-01-01&release_date=lte.2025-12-31'),
      this.countQuery('release_date=gte.2024-01-01&release_date=lte.2024-12-31&or=(title_ar.not.is.null,overview_ar.not.is.null)'),
      this.countQuery('release_date=gte.2024-01-01&release_date=lte.2024-12-31'),
      this.countQuery('release_date=gte.2020-01-01&or=(title_ar.not.is.null,overview_ar.not.is.null)'),
      this.countQuery('release_date=gte.2020-01-01'),
    ]);

    // 3. Studio Live Counters (Exact official IDs only)
    const studioDefinitions = [
      { id: 'netflix', name: 'Netflix Originals', nameAr: 'نتفليكس', query: 'or=(studios_json.cs.[{"id":178464}],studios_json.cs.[{"id":198834}],studios_json.cs.[{"id":185004}],studios_json.cs.[{"id":145174}],studios_json.cs.[{"id":171251}],studios_json.cs.[{"id":87858}],studios_json.cs.[{"id":192478}],studios_json.cs.[{"id":266997}],studios_json.cs.[{"id":98114}],studios_json.cs.[{"id":151528}])', color: '#E50914' },
      { id: 'warner', name: 'Warner Bros. Pictures', nameAr: 'وارنر برذرز', query: 'or=(studios_json.cs.[{"id":174}],studios_json.cs.[{"id":429}],studios_json.cs.[{"id":9993}],studios_json.cs.[{"id":12}],studios_json.cs.[{"id":128064}])', color: '#005BBB' },
      { id: 'universal', name: 'Universal Pictures', nameAr: 'يونيفرسال', query: 'or=(studios_json.cs.[{"id":33}],studios_json.cs.[{"id":67}],studios_json.cs.[{"id":33413}],studios_json.cs.[{"id":10338}])', color: '#3B82F6' },
      { id: 'sony', name: 'Sony & Columbia', nameAr: 'سوني بيكتشرز', query: 'or=(studios_json.cs.[{"id":5}],studios_json.cs.[{"id":34}],studios_json.cs.[{"id":84}],studios_json.cs.[{"id":2251}],studios_json.cs.[{"id":559}])', color: '#002B66' },
      { id: 'paramount', name: 'Paramount Pictures', nameAr: 'باراماونت', query: 'or=(studios_json.cs.[{"id":4}],studios_json.cs.[{"id":24955}],studios_json.cs.[{"id":2348}],studios_json.cs.[{"id":8302}],studios_json.cs.[{"id":333}])', color: '#0064B0' },
      { id: 'marvel', name: 'Marvel Studios', nameAr: 'مارفل ستوديوز', query: 'or=(studios_json.cs.[{"id":420}],studios_json.cs.[{"id":32353}],studios_json.cs.[{"id":11106}],studios_json.cs.[{"id":13252}])', color: '#ED1D24' },
      { id: 'disney', name: 'Walt Disney Pictures', nameAr: 'ديزني', query: 'or=(studios_json.cs.[{"id":2}],studios_json.cs.[{"id":6125}],studios_json.cs.[{"id":5218}])', color: '#1B60C4' },
      { id: '20th_century', name: '20th Century Studios', nameAr: 'توينتيث سينشري', query: 'or=(studios_json.cs.[{"id":127928}],studios_json.cs.[{"id":25}],studios_json.cs.[{"id":787}],studios_json.cs.[{"id":9383}])', color: '#DCA227' },
      { id: 'lionsgate', name: 'Lionsgate Films', nameAr: 'لايونزغيت', query: 'or=(studios_json.cs.[{"id":1632}],studios_json.cs.[{"id":35}],studios_json.cs.[{"id":85885}],studios_json.cs.[{"id":1634}])', color: '#9B51E0' },
      { id: 'amazon', name: 'Amazon MGM Studios', nameAr: 'أمازون إم جي إم', query: 'or=(studios_json.cs.[{"id":20580}],studios_json.cs.[{"id":21}],studios_json.cs.[{"id":8411}],studios_json.cs.[{"id":155700}])', color: '#FF9900' },
      { id: 'apple', name: 'Apple Original Films', nameAr: 'أفلام آبل الأصلية', query: 'studios_json=cs.[{"id":194232}]', color: '#A2AAAD' },
      { id: 'blumhouse', name: 'Blumhouse Horror', nameAr: 'بلمهوس', query: 'studios_json=cs.[{"id":3172}]', color: '#4A4A4A' },
      { id: 'legendary', name: 'Legendary Pictures', nameAr: 'ليجندري', query: 'studios_json=cs.[{"id":923}]', color: '#A08040' },
      { id: 'a24', name: 'A24 Masterpieces', nameAr: 'استوديو A24', query: 'studios_json=cs.[{"id":41077}]', color: '#111111' },
      { id: 'pixar', name: 'Pixar Animation', nameAr: 'بيكسار', query: 'studios_json=cs.[{"id":3}]', color: '#4A90E2' },
      { id: 'ghibli', name: 'Studio Ghibli', nameAr: 'استوديو غيبلي', query: 'studios_json=cs.[{"id":10342}]', color: '#27AE60' },
    ];

    const studioCounts = await Promise.all(
      studioDefinitions.map(async (s) => {
        const c = await this.countQuery(s.query);
        return {
          id: s.id,
          name: s.name,
          nameAr: s.nameAr,
          count: c,
          color: s.color,
        };
      })
    );

    // 4. Active Categories in home_categories table
    let publishedCategories: CategoryMetric[] = [];
    try {
      const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
      const catRes = await axios.get(
        `${env.SUPABASE_URL}/rest/v1/home_categories?select=*&order=sort_order.asc`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
          timeout: 4000,
        }
      );
      publishedCategories = (catRes.data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        title_ar: c.title_ar,
        category_type: c.category_type,
        movie_count: c.movie_count || 0,
        sort_order: c.sort_order || 0,
        is_active: c.is_active ?? true,
      }));
    } catch (_) {}

    return {
      server: {
        status: 'Healthy & Operational',
        uptimeSeconds: Math.floor(uptimeSec),
        uptimeFormatted: this.formatUptime(uptimeSec),
        memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        memoryTotalMB: Math.round(os.totalmem() / 1024 / 1024),
        cpuCount: os.cpus().length,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      },
      catalogue: {
        totalMovies,
        withStudios,
        withGenres,
        withKeywords,
        withArabicTitle,
        withArabicOverview,
        withArabicTagline,
        withAnyArabic,
        arabicCoveragePct: totalMovies > 0 ? parseFloat(((withAnyArabic / totalMovies) * 100).toFixed(2)) : 0,
      },
      recentReleases: {
        y2026: { translated: y2026Trans, total: y2026Tot, pct: y2026Tot > 0 ? parseFloat(((y2026Trans / y2026Tot) * 100).toFixed(1)) : 0 },
        y2025: { translated: y2025Trans, total: y2025Tot, pct: y2025Tot > 0 ? parseFloat(((y2025Trans / y2025Tot) * 100).toFixed(1)) : 0 },
        y2024: { translated: y2024Trans, total: y2024Tot, pct: y2024Tot > 0 ? parseFloat(((y2024Trans / y2024Tot) * 100).toFixed(1)) : 0 },
        modernEra: { translated: modernTrans, total: modernTot, pct: modernTot > 0 ? parseFloat(((modernTrans / modernTot) * 100).toFixed(1)) : 0 },
      },
      studios: studioCounts,
      categories: publishedCategories,
    };
  }
}
