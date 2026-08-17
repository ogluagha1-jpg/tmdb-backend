import axios from 'axios';

export interface GeminiKeyHealth {
  index: number;
  keyMasked: string;
  status: 'healthy' | 'cooldown' | 'exhausted' | 'invalid';
  rpmCount: number;
  totalSuccess: number;
  totalErrors: number;
  cooldownUntil: number | null;
  lastUsedAt: string | null;
}

export interface AiEnrichmentResult {
  title_ar?: string;
  overview_ar?: string;
  tagline_ar?: string;
  primary_studio?: string;
  studio_id?: number | null;
  is_original_production?: boolean;
  false_positive_studio_ids_to_remove?: number[];
  thematic_keywords?: string[];
  vibe_badges?: string[];
}

export interface DiscoveredCategory {
  id: string;
  title: string;
  title_ar: string;
  category_type: 'curated' | 'thematic' | 'genre' | 'era';
  filter_query: string;
  order_by: string;
  curation_reason: string;
}

export class GeminiPoolService {
  private static instance: GeminiPoolService;

  // AI execution is OFF by default during standard runtime scanning
  // Controlled explicitly via Dashboard admin toggle or Cooperative Gap-Scan
  private isAiEnrichmentEnabled = false;

  // Cooperative AI Gap-Scanner state
  private isCooperativeScanning = false;
  private isCooperativeScanPaused = false;
  private cooperativeScanStats = {
    totalGaps: 0,
    processed: 0,
    enriched: 0,
    failed: 0,
    currentTitle: '',
    startedAt: null as string | null,
    lastActiveAt: null as string | null,
  };

  // Verified Active Keys Pool
  private defaultKeyPool: string[] = [
    'AIzaSyB4dZhhGMDCbA-v71flTpIq0ooqCdothHE',
    'AIzaSyCkSOGdsmezbwTU46b4kUP3kj3hvjlj1k0',
    'AIzaSyCNDEoKgXhYXROBEjYZpo064XVAE_tC8Vs',
    'AIzaSyCFuD9GP70Z_tja18fbvi_O4QxMTnMDhB4',
    'AIzaSyAG3u7BQ1CiuKMXFv9LU7sKFjqTbeTGSzQ',
    'AIzaSyCVqJ4nihAFSdS-vo2LwjNZW8w16CPuYoQ',
    'AIzaSyC97H3IY4UnaNWqlUvgJ6w9ShMwAH72IjY',
    'AIzaSyCcjC5n-DCroHyTH9P6YDHzt-JXjiE-22Y',
    'AIzaSyBjc5BuffnZeXaRgKTLpGaw2PLdd11IzJQ',
    'AIzaSyDcOpg8BIcvua3VUQxpjETCSuhRk8X5_YE',
    'AIzaSyDHbIYWkPpQU7YOXs_CqCtpkRu9jlka9AI',
    'AIzaSyCHztHJNN11mmEJNPXedo6K-es7k5CbHdE',
  ];

  private keyPool: string[] = [];
  private keyStats: Map<string, {
    rpmTimestamps: number[];
    totalSuccess: number;
    totalErrors: number;
    cooldownUntil: number | null;
    status: 'healthy' | 'cooldown' | 'exhausted' | 'invalid';
    lastUsedAt: number | null;
  }> = new Map();

  private totalAiRequests = 0;
  private totalAiSuccess = 0;
  private totalAiErrors = 0;

  // Selected stable model
  private model = 'gemini-2.5-flash';

  private constructor() {
    this.initializePool();
  }

  public static getInstance(): GeminiPoolService {
    if (!GeminiPoolService.instance) {
      GeminiPoolService.instance = new GeminiPoolService();
    }
    return GeminiPoolService.instance;
  }

  public isAiEnabled(): boolean {
    return this.isAiEnrichmentEnabled;
  }

  public toggleAiEnrichment(enable?: boolean): boolean {
    if (enable !== undefined) {
      this.isAiEnrichmentEnabled = enable;
    } else {
      this.isAiEnrichmentEnabled = !this.isAiEnrichmentEnabled;
    }
    console.log(`[GEMINI_POOL] 🎛️ AI Enrichment in Runtime Scanner set to: ${this.isAiEnrichmentEnabled ? 'ENABLED' : 'DISABLED'}`);
    return this.isAiEnrichmentEnabled;
  }

  private initializePool(): void {
    const envKeys = process.env.GEMINI_API_KEYS
      ? process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter((k) => k.length > 10)
      : [];

    const customSingle = process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY.trim()] : [];

    const merged = Array.from(new Set([...envKeys, ...customSingle, ...this.defaultKeyPool])).filter((k) => k.length > 10);
    this.keyPool = merged;

    for (const k of this.keyPool) {
      this.keyStats.set(k, {
        rpmTimestamps: [],
        totalSuccess: 0,
        totalErrors: 0,
        cooldownUntil: null,
        status: 'healthy',
        lastUsedAt: null,
      });
    }

    console.log(`[GEMINI_POOL] 🤖 Initialized Gemini AI Pool with ${this.keyPool.length} keys (Model: ${this.model})`);
  }

  /// Selects the best healthy key with lowest RPM usage
  private getBestKey(): { key: string; index: number } | null {
    const now = Date.now();
    let bestKey: string | null = null;
    let lowestRpm = Infinity;
    let bestIndex = -1;

    for (let i = 0; i < this.keyPool.length; i++) {
      const k = this.keyPool[i];
      const stat = this.keyStats.get(k)!;

      // Clean old timestamps (>60s)
      stat.rpmTimestamps = stat.rpmTimestamps.filter((t) => now - t < 60000);

      // Check if cooldown expired
      if (stat.cooldownUntil && now >= stat.cooldownUntil) {
        stat.cooldownUntil = null;
        stat.status = 'healthy';
      }

      if (stat.status === 'invalid' || stat.status === 'exhausted') continue;
      if (stat.cooldownUntil && now < stat.cooldownUntil) continue;

      if (stat.rpmTimestamps.length < lowestRpm) {
        lowestRpm = stat.rpmTimestamps.length;
        bestKey = k;
        bestIndex = i;
      }
    }

    return bestKey ? { key: bestKey, index: bestIndex } : null;
  }

  /// Generates a structured JSON completion with multi-key rotation and auto-retry
  public async generateJson<T>(prompt: string, retries = 5): Promise<T | null> {
    if (this.keyPool.length === 0) return null;

    let attempt = 0;
    while (attempt < retries) {
      attempt++;
      const selected = this.getBestKey();
      if (!selected) {
        console.warn('[GEMINI_POOL] ⚠️ All Gemini keys are temporarily cooling down. Waiting 2s...');
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const { key, index } = selected;
      const stat = this.keyStats.get(key)!;
      const now = Date.now();

      stat.rpmTimestamps.push(now);
      stat.lastUsedAt = now;
      this.totalAiRequests++;

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`;
        const response = await axios.post(
          url,
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          },
          {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Empty Gemini response content');
        }

        const parsed = JSON.parse(text) as T;
        stat.totalSuccess++;
        this.totalAiSuccess++;
        return parsed;
      } catch (err: any) {
        stat.totalErrors++;
        this.totalAiErrors++;

        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;

        if (status === 429 || /quota|resource_exhausted/i.test(msg)) {
          console.warn(`[GEMINI_POOL] 🟡 Key #${index + 1} hit 429 quota. Cooldown 60s. Auto-rotating...`);
          stat.status = 'cooldown';
          stat.cooldownUntil = Date.now() + 60000;
        } else if (status === 400 || status === 403 || /api_key_invalid|no longer available/i.test(msg)) {
          console.error(`[GEMINI_POOL] 🔴 Key #${index + 1} invalid: ${msg}`);
          stat.status = 'invalid';
        } else {
          console.warn(`[GEMINI_POOL] ⚠️ Key #${index + 1} request error: ${msg}. Auto-rotating...`);
          // Temporarily cooldown for 15s so next retry picks a fresh key
          stat.cooldownUntil = Date.now() + 15000;
        }
      }
    }

    return null;
  }

  /// Specialized method: Enrich movie with Arabic metadata, authentic studio identification & micro-genres
  public async enrichMovieWithAi(params: {
    title: string;
    cleanTitle?: string;
    year?: string | number;
    overview?: string;
    existingGenres?: string[];
    currentStudio?: string;
    currentStudioIds?: number[];
  }): Promise<AiEnrichmentResult | null> {
    const prompt = `You are the lead cinema categorization and localization engine for a premium streaming platform (Teraflix).
Analyze the following movie and provide:
1. "title_ar": The official, most widely recognized cinematic Arabic title. (e.g. "Interstellar" -> "بين النجوم", "Inception" -> "استهلال / بداية", "The Dark Knight" -> "فارس الظلام", "The Godfather" -> "العراب").
2. "overview_ar": A compelling, fluent, cinematic Arabic synopsis (2-4 sentences) translated naturally without robotic literal phrasing.
3. "tagline_ar": A dramatic, catchy Arabic streaming tagline (e.g. "في الفضاء... لا أحد يستطيع سماع صراخك").
4. "primary_studio": The authentic production company or original streaming brand behind this movie (e.g. "Netflix", "Walt Disney Pictures", "Warner Bros. Pictures", "Universal Pictures", "Paramount Pictures", "Sony Pictures", "Apple Studios", "Amazon MGM Studios", "A24", "Neon", "Studio Ghibli", "20th Century Studios", "Lionsgate", "Marvel Studios", "Pixar", "Blumhouse Productions", "Focus Features", "Searchlight Pictures", "StudioCanal").
5. "studio_id": Numeric TMDB ID matching the studio:
   - Netflix: 178464
   - Walt Disney Pictures / Disney+: 2
   - Marvel Studios: 420
   - Pixar: 3
   - Lucasfilm: 1
   - Warner Bros / DC: 174
   - Universal Pictures: 33
   - Blumhouse Productions: 3172
   - Paramount Pictures: 4
   - Sony Pictures / Columbia: 5
   - Apple Studios / Apple TV+: 194232
   - Amazon MGM Studios: 20580
   - A24: 420
   - Neon: 90060
   - Studio Ghibli: 10338
   - Lionsgate: 1632
   - 20th Century Studios: 127928
   - Searchlight Pictures: 43
   - Focus Features: 10146
   - Legendary Pictures: 923
   - StudioCanal: 694
   - null if independent/unlisted.
6. "is_original_production": Boolean (true if this movie was commissioned / produced as an authentic platform original, false if it was a theatrical film or third-party licensed movie).
7. "false_positive_studio_ids_to_remove": Array of numbers. Studio IDs that should be REMOVED if this movie was mistakenly associated with them (for example, if a 20th Century Studios or Warner Bros theatrical film like "Prey" or "Dune" was falsely given Netflix Studio ID 178464, return [178464]).
8. "thematic_keywords": Array of 4-6 rich thematic micro-genres (e.g. "Heist", "Time Travel", "Mind-Bending", "Survival Horror", "Martial Arts", "Cyberpunk", "Oscar Winner", "Based on True Story", "Serial Killer", "Psychological Thriller", "Dark Comedy").
9. "vibe_badges": Array of 3 concise emoji-prefixed mood badges (e.g. ["⚡ High-Tension", "🧠 Mind-Bending", "🌧️ Emotional"]).

Movie Information:
- English Title: "${params.title}"
- Year: ${params.year || 'Unknown'}
- Overview: "${params.overview || 'N/A'}"
- Current Genres: ${JSON.stringify(params.existingGenres || [])}
- Currently Tagged Studio IDs: ${JSON.stringify(params.currentStudioIds || [])}

Respond ONLY in valid JSON conforming to this schema:
{
  "title_ar": "string",
  "overview_ar": "string",
  "tagline_ar": "string",
  "primary_studio": "string",
  "studio_id": number or null,
  "is_original_production": boolean,
  "false_positive_studio_ids_to_remove": [number],
  "thematic_keywords": ["string"],
  "vibe_badges": ["string"]
}`;

    return await this.generateJson<AiEnrichmentResult>(prompt);
  }

  /// Returns full health metrics of the Gemini pool
  public getPoolMetrics(): {
    totalKeys: number;
    healthyKeys: number;
    cooldownKeys: number;
    invalidKeys: number;
    totalRequests: number;
    totalSuccess: number;
    totalErrors: number;
    model: string;
    isAiEnabled: boolean;
    cooperativeScan: {
      isRunning: boolean;
      isPaused: boolean;
      totalGaps: number;
      processed: number;
      enriched: number;
      failed: number;
      currentTitle: string;
      completionPct: number;
    };
    keys: GeminiKeyHealth[];
  } {
    const now = Date.now();
    let healthy = 0;
    let cooldown = 0;
    let invalid = 0;

    const keys: GeminiKeyHealth[] = [];

    this.keyPool.forEach((k, idx) => {
      const stat = this.keyStats.get(k)!;
      stat.rpmTimestamps = stat.rpmTimestamps.filter((t) => now - t < 60000);

      if (stat.cooldownUntil && now >= stat.cooldownUntil) {
        stat.cooldownUntil = null;
        stat.status = 'healthy';
      }

      if (stat.status === 'healthy') healthy++;
      else if (stat.status === 'cooldown') cooldown++;
      else invalid++;

      const masked = `${k.slice(0, 8)}...${k.slice(-4)}`;

      keys.push({
        index: idx + 1,
        keyMasked: masked,
        status: stat.status,
        rpmCount: stat.rpmTimestamps.length,
        totalSuccess: stat.totalSuccess,
        totalErrors: stat.totalErrors,
        cooldownUntil: stat.cooldownUntil,
        lastUsedAt: stat.lastUsedAt ? new Date(stat.lastUsedAt).toISOString() : null,
      });
    });

    const completionPct = this.cooperativeScanStats.totalGaps > 0
      ? parseFloat(((this.cooperativeScanStats.processed / this.cooperativeScanStats.totalGaps) * 100).toFixed(1))
      : 0;

    return {
      totalKeys: this.keyPool.length,
      healthyKeys: healthy,
      cooldownKeys: cooldown,
      invalidKeys: invalid,
      totalRequests: this.totalAiRequests,
      totalSuccess: this.totalAiSuccess,
      totalErrors: this.totalAiErrors,
      model: this.model,
      isAiEnabled: this.isAiEnrichmentEnabled,
      cooperativeScan: {
        isRunning: this.isCooperativeScanning,
        isPaused: this.isCooperativeScanPaused,
        totalGaps: this.cooperativeScanStats.totalGaps,
        processed: this.cooperativeScanStats.processed,
        enriched: this.cooperativeScanStats.enriched,
        failed: this.cooperativeScanStats.failed,
        currentTitle: this.cooperativeScanStats.currentTitle,
        completionPct,
      },
      keys,
    };
  }

  /// ── COOPERATIVE AI GAP-SCANNER ──
  /// Finds movies that missed enrichment during traditional scanning and fills the missing fields via AI
  public async startCooperativeGapScan(options?: { maxTitles?: number }): Promise<{
    started: boolean;
    message: string;
    totalGaps?: number;
  }> {
    if (this.isCooperativeScanning && !this.isCooperativeScanPaused) {
      return { started: false, message: 'Cooperative AI Gap-Scan is already running.' };
    }

    if (this.isCooperativeScanning && this.isCooperativeScanPaused) {
      this.isCooperativeScanPaused = false;
      return { started: true, message: 'Cooperative AI Gap-Scan resumed.' };
    }

    this.isCooperativeScanning = true;
    this.isCooperativeScanPaused = false;
    this.cooperativeScanStats = {
      totalGaps: 0,
      processed: 0,
      enriched: 0,
      failed: 0,
      currentTitle: 'Querying database for missing fields...',
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    // Run asynchronously in background
    this.runCooperativeGapScanLoop(options?.maxTitles || 5000).catch((err) => {
      console.error('[GEMINI_GAP_SCAN] Critical error in gap scan loop:', err);
      this.isCooperativeScanning = false;
    });

    return {
      started: true,
      message: 'Cooperative AI Gap-Scan launched across database missing records.',
    };
  }

  public pauseCooperativeGapScan(): { message: string } {
    if (!this.isCooperativeScanning) {
      return { message: 'Cooperative AI Gap-Scan is not running.' };
    }
    this.isCooperativeScanPaused = true;
    console.log('[GEMINI_GAP_SCAN] ⏸️ Cooperative AI Gap-Scan paused.');
    return { message: 'Cooperative AI Gap-Scan paused.' };
  }

  public stopCooperativeGapScan(): { message: string } {
    this.isCooperativeScanning = false;
    this.isCooperativeScanPaused = false;
    this.cooperativeScanStats.currentTitle = 'Stopped';
    console.log('[GEMINI_GAP_SCAN] ⏹️ Cooperative AI Gap-Scan stopped.');
    return { message: 'Cooperative AI Gap-Scan stopped.' };
  }

  private async runCooperativeGapScanLoop(maxTitles: number): Promise<void> {
    const { SupabaseService } = await import('./supabase.service');
    const supabase = SupabaseService.getClient();

    console.log('[GEMINI_GAP_SCAN] 🔍 Fetching movies with missing Arabic or Studio fields...');

    // Fetch movies missing title_ar, overview_ar, or studios_json
    const { data: gapMovies, error } = await supabase
      .from('movies')
      .select('id, title, tmdb_id, year, release_date, overview, genres_json, keywords_json, studios_json, title_ar, overview_ar, tagline_ar')
      .or('title_ar.is.null,overview_ar.is.null,studios_json.is.null,studios_json.eq.[]')
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(maxTitles);

    if (error || !gapMovies) {
      console.error('[GEMINI_GAP_SCAN] Failed to query gap movies:', error?.message);
      this.isCooperativeScanning = false;
      return;
    }

    this.cooperativeScanStats.totalGaps = gapMovies.length;
    console.log(`[GEMINI_GAP_SCAN] 🎯 Identified ${gapMovies.length} movies requiring cooperative AI gap filling.`);

    for (let i = 0; i < gapMovies.length; i++) {
      if (!this.isCooperativeScanning) {
        console.log('[GEMINI_GAP_SCAN] Stop signal received.');
        break;
      }

      while (this.isCooperativeScanPaused && this.isCooperativeScanning) {
        await new Promise((r) => setTimeout(r, 1000));
      }

      const movie = gapMovies[i];
      this.cooperativeScanStats.currentTitle = `${movie.title} (#${movie.id})`;
      this.cooperativeScanStats.lastActiveAt = new Date().toISOString();

      try {
        const genres = Array.isArray(movie.genres_json) ? movie.genres_json.map((g: any) => g.name || g) : [];
        const existingStudios = Array.isArray(movie.studios_json) ? movie.studios_json : [];
        const aiResult = await this.enrichMovieWithAi({
          title: movie.title,
          year: movie.year,
          overview: movie.overview,
          existingGenres: genres,
          currentStudioIds: existingStudios.map((s: any) => s.id),
        });

        if (!aiResult) {
          this.cooperativeScanStats.failed++;
          this.cooperativeScanStats.processed++;
          continue;
        }

        const updatePayload: any = {};

        // Fill Arabic title if missing
        if (!movie.title_ar && aiResult.title_ar) {
          updatePayload.title_ar = aiResult.title_ar;
        }

        // Fill Arabic overview if missing
        if (!movie.overview_ar && aiResult.overview_ar) {
          updatePayload.overview_ar = aiResult.overview_ar;
        }

        // Fill Arabic tagline if missing
        if (!movie.tagline_ar && aiResult.tagline_ar) {
          updatePayload.tagline_ar = aiResult.tagline_ar;
        }

        // Studios & Brand Tagging + False-Positive Removal
        let studios = Array.isArray(movie.studios_json) ? [...movie.studios_json] : [];
        let studiosModified = false;

        // Remove false positives identified by AI
        if (Array.isArray(aiResult.false_positive_studio_ids_to_remove) && aiResult.false_positive_studio_ids_to_remove.length > 0) {
          const beforeLen = studios.length;
          studios = studios.filter((s: any) => !aiResult.false_positive_studio_ids_to_remove!.includes(s.id));
          if (studios.length !== beforeLen) studiosModified = true;
        }

        // Inject authentic studio / new brand if missing
        if (aiResult.primary_studio && aiResult.studio_id) {
          const alreadyHas = studios.some((s: any) => s.id === aiResult.studio_id);
          if (!alreadyHas) {
            studios.push({
              id: aiResult.studio_id,
              name: aiResult.primary_studio,
              logo_path: null,
              origin_country: 'US',
            });
            studiosModified = true;
          }
        }

        if (studiosModified) {
          updatePayload.studios_json = studios;
        }

        // Fill micro-genre keywords
        let keywords = Array.isArray(movie.keywords_json) ? [...movie.keywords_json] : [];
        if (Array.isArray(aiResult.thematic_keywords)) {
          let added = false;
          aiResult.thematic_keywords.forEach((kw: string, idx: number) => {
            if (!keywords.some((k: any) => k.name && k.name.toLowerCase() === kw.toLowerCase())) {
              keywords.push({ id: 899000 + idx, name: kw });
              added = true;
            }
          });
          if (added) updatePayload.keywords_json = keywords;
        }

        if (Object.keys(updatePayload).length > 0) {
          updatePayload.enriched_at = new Date().toISOString();
          const { error: updErr } = await supabase
            .from('movies')
            .update(updatePayload)
            .eq('id', movie.id);

          if (!updErr) {
            this.cooperativeScanStats.enriched++;
          } else {
            this.cooperativeScanStats.failed++;
          }
        }

        this.cooperativeScanStats.processed++;

        // Controlled pacing: ~300ms between requests (spread across 16 keys = high throughput without exhausting any single key)
        await new Promise((r) => setTimeout(r, 300));
      } catch (err: any) {
        console.warn(`[GEMINI_GAP_SCAN] Error enriching #${movie.id} (${movie.title}):`, err.message);
        this.cooperativeScanStats.failed++;
        this.cooperativeScanStats.processed++;
      }
    }

    console.log(`[GEMINI_GAP_SCAN] 🏁 Cooperative Gap Scan Complete! Processed: ${this.cooperativeScanStats.processed}, Enriched: ${this.cooperativeScanStats.enriched}`);
    this.isCooperativeScanning = false;
  }

  /// ── DYNAMIC HOME CATEGORY DISCOVERY & REALTIME PUBLISHING ──
  /// Uses Gemini AI to discover trending, binge-worthy categories from the active catalogue and dynamically updates home_categories in realtime
  public async discoverAndPublishDynamicCategories(): Promise<{
    success: boolean;
    discoveredCount: number;
    publishedCategories: any[];
    message: string;
  }> {
    const { SupabaseService } = await import('./supabase.service');
    const supabase = SupabaseService.getClient();

    console.log('[GEMINI_CATEGORY_DISCOVERY] 🧠 Initiating AI Dynamic Category Discovery...');

    const prompt = `You are the lead content curation and discovery architect for Teraflix (a premium streaming platform).
Discover 6 to 10 brand-new, ultra-engaging, high-converting home page dynamic categories / shelves based on modern cinema trends, popular genres, and streaming tastes.

Requirements for each discovered category:
1. "id": Unique snake_case identifier starting with "ai_" (e.g. "ai_cyberpunk_futures", "ai_a24_masterpieces", "ai_adrenaline_heists", "ai_mind_benders", "ai_space_odysseys", "ai_true_crime_thrills", "ai_dark_comedy_satires", "ai_epic_fantasy_realms").
2. "title": Catchy, uppercase English title (e.g. "CYBERPUNK & DYSTOPIAN FUTURES", "A24 INDIE MASTERPIECES", "ADRENALINE HEISTS & HIGH-STAKES").
3. "title_ar": Fluent, prestigious cinematic Arabic translation (e.g. "عوالم السايبربانك والمستقبل المظلم", "تحف سينما A24 المستقلة", "إثارة وسرقة وسرعة فائقة").
4. "category_type": "curated"
5. "filter_query": PostgREST filter string compatible with Supabase movies table (e.g. "or=(keywords_json.cs.[{\\"name\\":\\"Cyberpunk\\"}],keywords_json.cs.[{\\"name\\":\\"Dystopia\\"}])", "studios_json.cs.[{\\"id\\":420}]", "or=(keywords_json.cs.[{\\"name\\":\\"Heist\\"}],genres_json.cs.[{\\"id\\":28}])", "vote_average=gte.8.0&release_date=gte.2024-01-01").
6. "order_by": Ordering field (e.g. "popularity.desc", "vote_average.desc", "release_date.desc.nullslast").
7. "curation_reason": 1 sentence explaining why this shelf drives viewer engagement.

Respond ONLY in valid JSON matching this schema:
{
  "categories": [
    {
      "id": "string",
      "title": "string",
      "title_ar": "string",
      "category_type": "curated",
      "filter_query": "string",
      "order_by": "string",
      "curation_reason": "string"
    }
  ]
}`;

    const aiRes = await this.generateJson<{ categories: DiscoveredCategory[] }>(prompt);
    if (!aiRes || !Array.isArray(aiRes.categories) || aiRes.categories.length === 0) {
      return {
        success: false,
        discoveredCount: 0,
        publishedCategories: [],
        message: 'AI category discovery returned no candidates.',
      };
    }

    // 1. Cleanly delete previous AI-generated dynamic categories so shelves never pile up/overload
    const { error: delErr } = await supabase
      .from('home_categories')
      .delete()
      .like('id', 'ai_%');

    if (delErr) {
      console.warn('[GEMINI_CATEGORY_DISCOVERY] Warning deleting old AI categories:', delErr.message);
    } else {
      console.log('[GEMINI_CATEGORY_DISCOVERY] 🧹 Purged previous AI shelves to make room for fresh discoveries.');
    }

    const { env } = await import('../config/env');
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    const published: any[] = [];

    // Base sort order for AI dynamic shelves
    let nextSortOrder = 100;

    // Limit to top 5 highest-converting categories to prevent overload
    const candidates = aiRes.categories.slice(0, 5);

    for (const cat of candidates) {
      try {
        let countUrl = `${env.SUPABASE_URL}/rest/v1/movies?select=id`;
        if (cat.filter_query) {
          countUrl += `&${cat.filter_query}`;
        }

        const countRes = await axios.get(countUrl, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Range: '0-0',
            Prefer: 'count=exact',
          },
          timeout: 4000,
        });

        const contentRange = countRes.headers['content-range'];
        const total = contentRange ? parseInt(contentRange.split('/')[1], 10) : 0;

        // Require at least 5 matching movies
        if (total >= 5) {
          const payload = {
            id: cat.id,
            title: cat.title,
            title_ar: cat.title_ar,
            category_type: cat.category_type,
            genre_id: 0,
            filter_query: cat.filter_query,
            order_by: cat.order_by || 'popularity.desc',
            sort_order: nextSortOrder++,
            movie_count: total,
            is_active: true,
            updated_at: new Date().toISOString(),
          };

          const { error: insertErr } = await supabase
            .from('home_categories')
            .upsert(payload, { onConflict: 'id' });

          if (!insertErr) {
            published.push({ ...payload, curation_reason: cat.curation_reason });
            console.log(`[GEMINI_CATEGORY_DISCOVERY] 🌟 Published Fresh AI Shelf: "${cat.title}" (${total} titles)`);
          }
        }
      } catch (err: any) {
        console.warn(`[GEMINI_CATEGORY_DISCOVERY] Skip category "${cat.title}":`, err.message);
      }
    }

    // 2. Re-index and normalize all sort_order sequences strictly 1..N
    try {
      const { data: allCats } = await supabase
        .from('home_categories')
        .select('id, sort_order')
        .order('sort_order', { ascending: true });

      if (allCats && allCats.length > 0) {
        for (let i = 0; i < allCats.length; i++) {
          await supabase
            .from('home_categories')
            .update({ sort_order: i + 1 })
            .eq('id', allCats[i].id);
        }
        console.log(`[GEMINI_CATEGORY_DISCOVERY] 🔢 Normalized sort_order across all ${allCats.length} active categories.`);
      }
    } catch (normErr: any) {
      console.warn('[GEMINI_CATEGORY_DISCOVERY] Error normalizing sort order:', normErr.message);
    }

    return {
      success: true,
      discoveredCount: published.length,
      publishedCategories: published,
      message: `Refreshed Home Screen: Replaced old AI shelves with ${published.length} fresh trending categories!`,
    };
  }
}
