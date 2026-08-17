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
  studio_id?: number;
  thematic_keywords?: string[];
  vibe_badges?: string[];
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

  // 16-Key High-Capacity Pool
  private defaultKeyPool: string[] = [
    'AIzaSyB4dZhhGMDCbA-v71flTpIq0ooqCdothHE',
    'AIzaSyCkSOGdsmezbwTU46b4kUP3kj3hvjlj1k0',
    'AIzaSyC4SmQ8R5XvFf73dmUw-DtgdJq8LeKZiQg',
    'AIzaSyCNDEoKgXhYXROBEjYZpo064XVAE_tC8Vs',
    'AIzaSyCFuD9GP70Z_tja18fbvi_O4QxMTnMDhB4',
    'AIzaSyAG3u7BQ1CiuKMXFv9LU7sKFjqTbeTGSzQ',
    'AIzaSyBLxZEQUGDQTdDSe3GF7ULENx2O_6WWWr0',
    'AIzaSyCVqJ4nihAFSdS-vo2LwjNZW8w16CPuYoQ',
    'AIzaSyC97H3IY4UnaNWqlUvgJ6w9ShMwAH72IjY',
    'AIzaSyCcjC5n-DCroHyTH9P6YDHzt-JXjiE-22Y',
    'AIzaSyBjc5BuffnZeXaRgKTLpGaw2PLdd11IzJQ',
    'AIzaSyDcOpg8BIcvua3VUQxpjETCSuhRk8X5_YE',
    'AIzaSyCMRul1nlpqzNv6NkSM3jZjbfHNAt3eJ9c',
    'AIzaSyC_N7g_aqlVWjyxD30z4ir7i7rsylLR3CQ',
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
  public async generateJson<T>(prompt: string, retries = 3): Promise<T | null> {
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
            timeout: 10000,
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
        } else if (status === 400 || status === 403 || /api_key_invalid/i.test(msg)) {
          console.error(`[GEMINI_POOL] 🔴 Key #${index + 1} invalid/forbidden: ${msg}`);
          stat.status = 'invalid';
        } else {
          console.warn(`[GEMINI_POOL] ⚠️ Key #${index + 1} request error: ${msg}`);
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
  }): Promise<AiEnrichmentResult | null> {
    const prompt = `You are the lead cinema categorization and localization engine for a premium streaming platform (Teraflix).
Analyze the following movie and provide:
1. "title_ar": The official, most widely recognized cinematic Arabic title. (e.g. "Interstellar" -> "بين النجوم", "Inception" -> "استهلال / بداية", "The Dark Knight" -> "فارس الظلام", "The Godfather" -> "العراب").
2. "overview_ar": A compelling, fluent, cinematic Arabic synopsis (2-4 sentences) translated naturally without robotic literal phrasing.
3. "tagline_ar": A dramatic, catchy Arabic streaming tagline (e.g. "في الفضاء... لا أحد يستطيع سماع صراخك").
4. "primary_studio": The authentic studio/platform brand behind this movie. Specifically identify streaming originals (Netflix, Apple TV+, Amazon MGM Studios, Disney+, HBO Max) or major studios (Warner Bros, Universal Pictures, Paramount Pictures, Sony Pictures, Marvel Studios, A24, Studio Ghibli, 20th Century Studios, Lionsgate).
5. "studio_id": Numeric ID matching the studio:
   - Netflix: 178464
   - Disney / Marvel: 2
   - Warner Bros / DC: 174
   - Universal: 33
   - Paramount: 4
   - Sony / Columbia: 5
   - Apple Studios: 194232
   - Amazon MGM: 20580
   - A24: 420
   - Studio Ghibli: 10338
   - Lionsgate: 1632
   - 20th Century Studios: 127928
   - null if independent/other.
6. "thematic_keywords": Array of 4-6 rich thematic micro-genres (e.g. "Heist", "Time Travel", "Mind-Bending", "Survival Horror", "Martial Arts", "Cyberpunk", "Oscar Winner", "Based on True Story", "Serial Killer", "Psychological Thriller", "Dark Comedy").
7. "vibe_badges": Array of 3 concise emoji-prefixed mood badges (e.g. ["⚡ High-Tension", "🧠 Mind-Bending", "🌧️ Emotional"]).

Movie Information:
- English Title: "${params.title}"
- Year: ${params.year || 'Unknown'}
- Overview: "${params.overview || 'N/A'}"
- Current Genres: ${JSON.stringify(params.existingGenres || [])}

Respond ONLY in valid JSON conforming to this schema:
{
  "title_ar": "string",
  "overview_ar": "string",
  "tagline_ar": "string",
  "primary_studio": "string",
  "studio_id": number or null,
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
        const aiResult = await this.enrichMovieWithAi({
          title: movie.title,
          year: movie.year,
          overview: movie.overview,
          existingGenres: genres,
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

        // Fill studios if missing
        let studios = Array.isArray(movie.studios_json) ? [...movie.studios_json] : [];
        if (studios.length === 0 && aiResult.primary_studio && aiResult.studio_id) {
          studios.push({
            id: aiResult.studio_id,
            name: aiResult.primary_studio,
            logo_path: null,
            origin_country: 'US',
          });
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
}
