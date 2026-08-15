# Teraflix Movie Categorization & Dynamic Layout Backend

Production-ready backend service designed to deploy seamlessly to **Railway** (or any Docker-compatible cloud).

---

## 🌟 What This Service Does

1. **Automated TMDB & IMDb Enrichment**:
   - Scans your Supabase `movies` table for new or uncategorized movies.
   - Enriches records with standardized TMDB genres, keywords, release dates, directors, cast, and Arabic localized metadata (`title_ar`, `overview_ar`).
   - Integrates IMDb IDs to unlock prestige ratings and awards.

2. **Dynamic Home Screen Category Generator**:
   - Evaluates a wide variety of categories (Trending, Rankings, IMDb Top 250, Major Genres, Thematic Keyword Clusters, Eras & Decades, Regional Arabic Hits).
   - **Zero Empty Rows Gate**: Checks the actual count of available movies in your database for every category. If a category has `< 6` movies, it is **excluded**.
   - Publishes verified, populated categories into the `home_categories` table in Supabase.

3. **Background Cron Automation**:
   - Automatically refreshes home categories (every 6 hours) and categorizes new movies (every 2 hours).

---

## 🚀 1-Click Deployment to Railway

1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Select **Deploy from GitHub repo**.
3. Choose the repository and set the **Root Directory** to:
   ```
   server/categorization_service
   ```
4. In Railway **Variables**, add the following environment variables:

| Variable | Description | Required? | Your Project Value |
| :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | Your Supabase project URL | **Required** | `https://tldojispxcgjzezxwabp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role (or Anon) Key | **Required** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZG9qaXNweGNnanplenh3YWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODYwNzksImV4cCI6MjA4NzM2MjA3OX0.C5R3idvWtdneOaZ29j5aSIhrP588O8W9BMUnHUIGZpQ` |
| `TMDB_API_KEY` | TMDB API Key (v3) | **Required** | `e27d0d97991b06582fc48c3f26c06dce` |
| `OMDB_API_KEY` | OMDb API Key for IMDb Ratings & Awards | *Optional* | Leave empty for auto open IMDb fallback |
| `MIN_MOVIES_PER_CATEGORY` | Minimum movies threshold | *Optional* | `6` |

5. Railway will automatically build the `Dockerfile`, start the healthcheck `/health`, and deploy!

---

## 📡 REST API Endpoints

- `GET /health`: Healthcheck endpoint for zero-downtime monitoring.
- `GET /api/categories`: Returns current active home categories.
- `POST /api/sync/movies`: Manually trigger movie enrichment sync.
- `POST /api/sync/categories`: Manually trigger dynamic category evaluation and publishing.
