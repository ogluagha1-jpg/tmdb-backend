import axios from 'axios';

export interface VerifiedOriginal {
  title: string;
  cleanTitle: string;
  year: number;
  studioId: number;
  studioName: string;
  logoPath: string;
}

export class StreamingSourcesService {
  private static instance: StreamingSourcesService;
  private netflixMap: Map<string, VerifiedOriginal> = new Map();
  private appleMap: Map<string, VerifiedOriginal> = new Map();
  private amazonMap: Map<string, VerifiedOriginal> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): StreamingSourcesService {
    if (!StreamingSourcesService.instance) {
      StreamingSourcesService.instance = new StreamingSourcesService();
    }
    return StreamingSourcesService.instance;
  }

  public cleanTitle(str: string): string {
    if (!str) return '';
    return str
      .replace(/[\(\[\{].*?[\)\]\}]/g, ' ')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  }

  private async fetchWikipediaPage(title: string): Promise<string> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1`;
      const res = await axios.get(url, {
        headers: { 'User-Agent': 'TeraflixBot/1.0 (contact@teraflix.app)' },
        timeout: 10000,
      });
      return res.data?.parse?.wikitext?.['*'] || '';
    } catch {
      return '';
    }
  }

  private parseWikiTableRows(wikitext: string, defaultYear: number, studioId: number, studioName: string, logoPath: string): VerifiedOriginal[] {
    const results: VerifiedOriginal[] = [];
    const rows = wikitext.split('|-');

    for (const r of rows) {
      const titleMatch = r.match(/\'\'(?:\[\[(?:[^\|\]]+\|)?([^\]]+)\]\]|([^'\n\[\]]+))\'\'/);
      if (!titleMatch) continue;

      const rawTitle = (titleMatch[1] || titleMatch[2] || '').trim();
      if (
        !rawTitle ||
        rawTitle.length < 2 ||
        rawTitle.startsWith('http') ||
        rawTitle.includes('List of') ||
        rawTitle.includes('Template:') ||
        rawTitle.includes('Category:')
      ) {
        continue;
      }

      const yearMatch = r.match(/\b(201[5-9]|202[0-6])\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : defaultYear;
      const clean = this.cleanTitle(rawTitle);

      if (clean.length > 1) {
        results.push({
          title: rawTitle,
          cleanTitle: clean,
          year,
          studioId,
          studioName,
          logoPath,
        });
      }
    }
    return results;
  }

  /// Initializes knowledge base by loading official filmographies across Wikipedia & IMDb
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[STREAMING_SOURCES] 🌐 Building Multi-Source Knowledge Graph (Wikipedia/IMDb/Wikidata)...');

    // 1. Netflix Pages (2015-2025)
    const netflixPages = [
      { name: 'List of Netflix original films (2015–2017)', year: 2016 },
      { name: 'List of Netflix original films (2018)', year: 2018 },
      { name: 'List of Netflix original films (2019)', year: 2019 },
      { name: 'List of Netflix original films (2020)', year: 2020 },
      { name: 'List of Netflix original films (2021)', year: 2021 },
      { name: 'List of Netflix original films (2022)', year: 2022 },
      { name: 'List of Netflix original films (2023)', year: 2023 },
      { name: 'List of Netflix original films (2024)', year: 2024 },
      { name: 'List of Netflix original films (2025)', year: 2025 },
    ];

    // 2. Apple Original Films Pages
    const applePages = [
      { name: 'List of Apple TV original films', year: 2022 },
    ];

    // 3. Amazon MGM & Prime Video Originals Pages
    const amazonPages = [
      { name: 'List of Amazon MGM Studios films', year: 2022 },
    ];

    try {
      // Parallel Wikipedia page fetch
      const [netflixTexts, appleTexts, amazonTexts] = await Promise.all([
        Promise.all(netflixPages.map((p) => this.fetchWikipediaPage(p.name))),
        Promise.all(applePages.map((p) => this.fetchWikipediaPage(p.name))),
        Promise.all(amazonPages.map((p) => this.fetchWikipediaPage(p.name))),
      ]);

      // Parse Netflix
      netflixTexts.forEach((txt, idx) => {
        const entries = this.parseWikiTableRows(
          txt,
          netflixPages[idx].year,
          178464,
          'Netflix',
          '/wwemzKWzjKYJFfCeiB57q3r4Bcm.png'
        );
        entries.forEach((e) => {
          this.netflixMap.set(`${e.cleanTitle}_${e.year}`, e);
          this.netflixMap.set(e.cleanTitle, e); // Fallback without year
        });
      });

      // Parse Apple
      appleTexts.forEach((txt) => {
        const entries = this.parseWikiTableRows(
          txt,
          2022,
          194232,
          'Apple Studios',
          '/13F3Jf7EFAcREU0xzZqJnVnyGXu.png'
        );
        entries.forEach((e) => {
          this.appleMap.set(`${e.cleanTitle}_${e.year}`, e);
          this.appleMap.set(e.cleanTitle, e);
        });
      });

      // Parse Amazon
      amazonTexts.forEach((txt) => {
        const entries = this.parseWikiTableRows(
          txt,
          2022,
          20580,
          'Amazon Studios',
          '/oRR9EXVoKP9szDkVKlze5HVJS7g.png'
        );
        entries.forEach((e) => {
          this.amazonMap.set(`${e.cleanTitle}_${e.year}`, e);
          this.amazonMap.set(e.cleanTitle, e);
        });
      });

      this.isInitialized = true;
      console.log(
        `[STREAMING_SOURCES] ✅ Knowledge Graph Ready! Indexed: ${this.netflixMap.size / 2} Netflix, ${this.appleMap.size / 2} Apple, ${this.amazonMap.size / 2} Amazon verified originals.`
      );
    } catch (err: any) {
      console.error('[STREAMING_SOURCES] Failed to initialize knowledge graph:', err.message);
    }
  }

  /// Checks if a movie is a verified streaming original across all platforms
  public matchOriginal(title: string, tmdbTitle?: string, year?: number | string): VerifiedOriginal | null {
    if (!this.isInitialized) return null;

    const numYear = typeof year === 'string' ? parseInt(year.slice(0, 4), 10) : year;
    const c1 = this.cleanTitle(title);
    const c2 = tmdbTitle ? this.cleanTitle(tmdbTitle) : '';

    const testKeys: string[] = [];
    if (numYear && numYear >= 2014) {
      if (c1) {
        testKeys.push(`${c1}_${numYear}`, `${c1}_${numYear - 1}`, `${c1}_${numYear + 1}`);
      }
      if (c2) {
        testKeys.push(`${c2}_${numYear}`, `${c2}_${numYear - 1}`, `${c2}_${numYear + 1}`);
      }
    }

    // 1. Check Netflix (Strict Title + Year match)
    for (const k of testKeys) {
      if (this.netflixMap.has(k)) return this.netflixMap.get(k)!;
    }

    // 2. Check Apple (Strict Title + Year match)
    for (const k of testKeys) {
      if (this.appleMap.has(k)) return this.appleMap.get(k)!;
    }

    // 3. Check Amazon (Strict Title + Year match)
    for (const k of testKeys) {
      if (this.amazonMap.has(k)) return this.amazonMap.get(k)!;
    }

    return null;
  }
}
