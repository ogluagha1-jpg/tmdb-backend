export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Teraflix Engine | Server Health & Live Metrics Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0B0E14;
      --bg-card: rgba(22, 27, 34, 0.85);
      --bg-card-hover: rgba(30, 37, 48, 0.95);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(229, 9, 20, 0.35);
      --crimson: #E50914;
      --crimson-glow: rgba(229, 9, 20, 0.45);
      --emerald: #10B981;
      --amber: #F59E0B;
      --indigo: #6366F1;
      --cyan: #06B6D4;
      --text-primary: #FFFFFF;
      --text-secondary: #94A3B8;
      --text-muted: #64748B;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background-color: var(--bg-base);
      background-image: 
        radial-gradient(at 0% 0%, rgba(229, 9, 20, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
        radial-gradient(at 50% 100%, rgba(6, 182, 212, 0.06) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text-primary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      padding-bottom: 40px;
    }

    h1, h2, h3, .font-heading {
      font-family: 'Outfit', sans-serif;
    }

    .container {
      max-width: 1380px;
      margin: 0 auto;
      padding: 20px 16px;
    }

    /* Top Navigation Bar */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 20px;
      gap: 16px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      background: linear-gradient(135deg, #E50914, #B80710);
      color: white;
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 18px;
      padding: 6px 12px;
      border-radius: 8px;
      letter-spacing: 1px;
      box-shadow: 0 4px 16px var(--crimson-glow);
    }

    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }

    .brand-subtitle {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
      margin-top: 2px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 20px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: var(--emerald);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      user-select: none;
      touch-action: manipulation;
    }

    .btn-primary {
      background: linear-gradient(135deg, #E50914, #B80710);
      color: white;
      box-shadow: 0 3px 12px var(--crimson-glow);
    }

    .btn-primary:active {
      transform: scale(0.97);
    }

    .btn-emerald {
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      box-shadow: 0 3px 12px rgba(16, 185, 129, 0.35);
    }

    .btn-emerald:active {
      transform: scale(0.97);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-subtle);
      color: var(--text-primary);
    }

    .btn-secondary:active {
      background: rgba(255, 255, 255, 0.12);
      transform: scale(0.97);
    }

    /* Grid Layouts */
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    /* Cards */
    .card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 16px;
      transition: border-color 0.2s ease;
    }

    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .card-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .card-value {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 2px;
      line-height: 1.1;
    }

    .card-desc {
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.3;
    }

    .card-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      flex-shrink: 0;
    }

    /* Progress Bar */
    .progress-track {
      width: 100%;
      height: 7px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0 5px 0;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Studio Badges Grid */
    .studios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }

    .studio-pill {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.15s ease;
    }

    .studio-pill:active {
      background: rgba(255, 255, 255, 0.08);
    }

    .studio-name {
      font-weight: 700;
      font-size: 12px;
      color: var(--text-primary);
    }

    .studio-name-ar {
      font-size: 10px;
      color: var(--text-muted);
    }

    .studio-count-badge {
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 12px;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* Category Table */
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      max-height: 480px;
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
      min-width: 620px;
    }

    th {
      background: rgba(22, 27, 34, 0.95);
      color: var(--text-muted);
      font-weight: 600;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
    }

    .pill-published {
      background: rgba(16, 185, 129, 0.12);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }

    .btn-delete {
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.25);
      color: white;
    }

    /* Modal Dialog */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      padding: 16px;
    }

    .modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    .modal-card {
      background: #161B22;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }

    .modal-overlay.active .modal-card {
      transform: scale(1);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .form-group {
      margin-bottom: 14px;
    }

    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
    }

    .form-input, .form-select {
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 10px 12px;
      color: white;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .form-input:focus, .form-select:focus {
      border-color: var(--crimson);
    }

    /* Mobile Responsive Optimizations */
    @media (max-width: 900px) {
      .grid-4 {
        grid-template-columns: 1fr 1fr;
      }
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .container {
        padding: 14px 10px;
      }

      header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .brand-group {
        justify-content: space-between;
      }

      .header-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .header-actions .status-badge {
        grid-column: span 2;
        justify-content: center;
      }

      .btn {
        width: 100%;
        padding: 10px 12px;
        font-size: 12px;
      }

      .grid-4 {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .card {
        padding: 12px;
        border-radius: 12px;
      }

      .card-value {
        font-size: 22px;
      }

      .studios-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .studio-pill {
        padding: 8px 10px;
      }

      .studio-name {
        font-size: 11px;
      }

      .studio-name-ar {
        font-size: 9px;
      }

      .studio-count-badge {
        font-size: 11px;
        padding: 2px 6px;
      }
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 16px;
      left: 16px;
      right: 16px;
      margin: 0 auto;
      max-width: 400px;
      padding: 12px 18px;
      background: #1E293B;
      color: white;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      font-size: 12px;
      font-weight: 600;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.25s ease;
      pointer-events: none;
      z-index: 300;
      text-align: center;
    }

    #toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand-group">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="brand-logo">TERAFLIX</div>
          <div>
            <h1 class="brand-title">Metrics Engine</h1>
            <p class="brand-subtitle">TMDB Backend Health & Discovery</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <div class="status-badge">
          <div class="status-dot"></div>
          <span id="server-status-text">Server Active</span>
        </div>
        <button class="btn btn-emerald" onclick="openCreateModal()">➕ Create Shelf</button>
        <button class="btn btn-secondary" onclick="fetchMetrics()">🔄 Refresh</button>
        <button class="btn btn-secondary" onclick="triggerRegenerateCategories()">📁 Auto-Scan</button>
      </div>
    </header>

    <!-- ⚡ 24/7 AUTO-SCANNER & BATCH CONTROLS ⚡ -->
    <div class="card" style="margin-bottom: 20px; border-color: rgba(229, 9, 20, 0.4); background: linear-gradient(135deg, rgba(22, 27, 34, 0.95), rgba(229, 9, 20, 0.08));">
      <div class="card-title-row" style="flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="card-icon" style="background: rgba(229, 9, 20, 0.2); color: #E50914; font-size: 20px;">⚡</div>
          <div>
            <h2 style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
              Multi-Source 24/7 Auto-Scanner & Batch Engine
              <span id="scanner-badge" class="status-badge" style="font-size: 11px; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); color: #10B981; border-color: rgba(16, 185, 129, 0.3);">
                🟢 Active (24/7)
              </span>
            </h2>
            <p class="card-desc" id="scanner-subtitle">Continuous background enrichment across TMDB, OMDb, Cinemeta & Wikipedia</p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-toggle-scan" class="btn btn-secondary" onclick="toggleAutoScanner()" style="font-weight: 700;">⏸️ Pause Auto-Scan</button>
          <button class="btn btn-primary" onclick="triggerBatchScan(500)" style="font-weight: 700;">⚡ Scan Next 500 Batch</button>
          <button class="btn btn-secondary" onclick="triggerResetAndRescan()" style="border-color: rgba(229, 9, 20, 0.6); color: #FF9999; font-weight: 700; background: rgba(229, 9, 20, 0.1);">🔄 Rescan All From Scratch</button>
          <button class="btn btn-secondary" onclick="triggerMultiSourceSync()">🌐 Knowledge Graph Sync</button>
          <button class="btn btn-secondary" onclick="triggerRegenerateCategories()">📁 Regenerate Shelves</button>
        </div>
      </div>

      <!-- Live Auto-Scanner Progress Bar -->
      <div style="margin-top: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span><strong>Overall Catalogue Enrichment Progress:</strong></span>
          <strong id="scanner-progress-label">-- / -- (0%)</strong>
        </div>
        <div class="progress-track" style="height: 10px; border-radius: 6px; background: rgba(255,255,255,0.06);">
          <div id="scanner-progress-fill" class="progress-fill" style="width: 0%; height: 100%; border-radius: 6px; background: linear-gradient(90deg, #E50914, #F59E0B, #10B981); transition: width 0.4s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 6px;">
          <span>🎯 Currently Processing: <strong id="scanner-current-movie" style="color: white;">--</strong></span>
          <span>Processed This Session: <strong id="scanner-session-count" style="color: #10B981;">--</strong> titles</span>
        </div>
      </div>
    </div>

    <!-- Top 4 Summary Metrics (2x2 on phones, 4x1 on desktop) -->
    <div class="grid-4">
      <div class="card">
        <div class="card-title-row">
          <span class="card-label">Catalogue</span>
          <div class="card-icon" style="background: rgba(229, 9, 20, 0.15); color: #E50914;">🎬</div>
        </div>
        <div class="card-value" id="val-total-movies">--</div>
        <div class="card-desc">Total active movies</div>
      </div>

      <div class="card">
        <div class="card-title-row">
          <span class="card-label">Arabic</span>
          <div class="card-icon" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">🌐</div>
        </div>
        <div class="card-value" id="val-arabic-total">--</div>
        <div class="progress-track">
          <div id="prog-arabic" class="progress-fill" style="width: 0%; background: linear-gradient(90deg, #10B981, #059669);"></div>
        </div>
        <div class="card-desc" id="val-arabic-pct">--% Translated</div>
      </div>

      <div class="card">
        <div class="card-title-row">
          <span class="card-label">Studios</span>
          <div class="card-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366F1;">🏢</div>
        </div>
        <div class="card-value" id="val-studios-enriched">--</div>
        <div class="card-desc">With company tags</div>
      </div>

      <div class="card">
        <div class="card-title-row">
          <span class="card-label">Uptime</span>
          <div class="card-icon" style="background: rgba(6, 182, 212, 0.15); color: #06B6D4;">⏱️</div>
        </div>
        <div class="card-value" id="val-uptime" style="font-size: 20px;">--</div>
        <div class="card-desc" id="val-memory">Memory: -- MB</div>
      </div>
    </div>

    <!-- Translation Breakdown & Recent Releases -->
    <div class="grid-2">
      <!-- Arabic Detailed Breakdown -->
      <div class="card">
        <div class="card-title-row">
          <h2 style="font-size: 14px; font-weight: 700;">Arabic Translation Coverage</h2>
          <span class="card-label" id="val-arabic-unique-label">--</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>Official Titles (<code>title_ar</code>)</span>
              <strong id="val-title-ar">--</strong>
            </div>
            <div class="progress-track">
              <div id="prog-title-ar" class="progress-fill" style="width: 0%; background: #6366F1;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>Overviews (<code>overview_ar</code>)</span>
              <strong id="val-overview-ar">--</strong>
            </div>
            <div class="progress-track">
              <div id="prog-overview-ar" class="progress-fill" style="width: 0%; background: #10B981;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>Taglines (<code>tagline_ar</code>)</span>
              <strong id="val-tagline-ar">--</strong>
            </div>
            <div class="progress-track">
              <div id="prog-tagline-ar" class="progress-fill" style="width: 0%; background: #F59E0B;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Years Breakdown -->
      <div class="card">
        <div class="card-title-row">
          <h2 style="font-size: 14px; font-weight: 700;">Recent Releases Translated</h2>
          <span class="card-label">By Year</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>🔥 <strong>2026 Releases</strong> (Brand New)</span>
              <strong id="val-y2026">--</strong>
            </div>
            <div class="progress-track">
              <div id="prog-y2026" class="progress-fill" style="width: 0%; background: #E50914;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>⭐ <strong>2025 Releases</strong></span>
              <strong id="val-y2025">--</strong>
            </div>
            <div class="progress-track">
              <div id="prog-y2025" class="progress-fill" style="width: 0%; background: #3B82F6;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>✨ <strong>Modern Era</strong> (2020 – 2026)</span>
              <strong id="val-modern">--</strong>
            </div>
            <div class="progress-track">
              <div id="prog-modern" class="progress-fill" style="width: 0%; background: #8B5CF6;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 🤖 GEMINI COOPERATIVE AI & GAP-SCANNER CONTROL HUB 🤖 -->
    <div class="card" style="margin-bottom: 20px; border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(135deg, rgba(22, 27, 34, 0.95), rgba(99, 102, 241, 0.08));">
      <div class="card-title-row" style="flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="card-icon" style="background: rgba(99, 102, 241, 0.2); color: #818CF8; font-size: 20px;">🤖</div>
          <div>
            <h2 style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
              Gemini AI Cooperative Intelligence Hub
              <span id="ai-runtime-badge" class="status-badge" style="font-size: 11px; padding: 2px 8px; background: rgba(245, 158, 11, 0.15); color: #F59E0B; border-color: rgba(245, 158, 11, 0.3);">
                ⏸️ Runtime AI: Controlled
              </span>
              <span id="ai-pool-badge" class="status-badge" style="font-size: 11px; padding: 2px 8px; background: rgba(99, 102, 241, 0.15); color: #818CF8; border-color: rgba(99, 102, 241, 0.3);">
                16 Keys Active
              </span>
            </h2>
            <p class="card-desc">Cooperatively queries the entire database to find titles missing Arabic localization or Studio tags and fills gaps via 16-key AI pool</p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-toggle-ai" class="btn" onclick="window.toggleAiRuntime()" style="background: rgba(255, 255, 255, 0.08); font-size: 12px; font-weight: 600;">
            🎛️ Toggle Runtime AI
          </button>
          <button id="btn-gap-scan" class="btn btn-primary" onclick="window.triggerCooperativeGapScan()" style="background: linear-gradient(135deg, #6366F1, #4F46E5); font-weight: 700;">
            🚀 Launch Cooperative AI Gap-Scan
          </button>
          <button class="btn" onclick="window.triggerAiTest()" style="background: rgba(99, 102, 241, 0.15); color: #818CF8; border: 1px solid rgba(99, 102, 241, 0.3); font-weight: 600;">
            ⚡ Test Key
          </button>
        </div>
      </div>

      <!-- Live Cooperative AI Gap-Scan Progress Box -->
      <div id="ai-gap-progress-box" style="margin-top: 14px; padding: 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(99, 102, 241, 0.25);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px;">
          <span style="font-weight: 700; color: #818CF8;">🎯 Cooperative AI Gap-Scanner Progress:</span>
          <span id="ai-gap-progress-label" style="font-weight: 700; color: white;">0 / 0 (0%)</span>
        </div>
        <div class="progress-track" style="height: 8px; border-radius: 4px; background: rgba(255,255,255,0.06);">
          <div id="ai-gap-progress-fill" class="progress-fill" style="width: 0%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #6366F1, #818CF8, #10B981); transition: width 0.3s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 6px;">
          <span>Processing: <strong id="ai-gap-current-title" style="color: white;">Idle (Ready on demand)</strong></span>
          <span>Enriched: <strong id="ai-gap-enriched-count" style="color: #10B981;">0</strong> | Failed: <strong id="ai-gap-failed-count" style="color: #EF4444;">0</strong></span>
        </div>
      </div>

      <!-- 16 Key Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-top: 14px;" id="ai-keys-container">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- Major Studios Breakdown Grid -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-title-row">
        <div>
          <h2 style="font-size: 15px; font-weight: 800;">Studio Hub Live Counters</h2>
          <p class="card-desc">Titles accessible via Studio Hub watermark cards</p>
        </div>
      </div>
      <div class="studios-grid" id="studios-container">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- Active Home Categories Table -->
    <div class="card">
      <div class="card-title-row" style="flex-wrap: wrap; gap: 8px;">
        <div>
          <h2 style="font-size: 15px; font-weight: 800;">Active Published Home Categories</h2>
          <p class="card-desc">Dynamic shelves active on mobile app</p>
        </div>
        <div id="categories-count-badge" class="status-badge" style="background: rgba(99, 102, 241, 0.12); color: #818CF8; border-color: rgba(99, 102, 241, 0.3);">
          -- Published Shelves
        </div>
      </div>
      <div style="font-size:10px; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:4px;">
        <span>👈 Scroll horizontally to see Arabic & details 👉</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>English Title</th>
              <th>Arabic Title</th>
              <th>Type</th>
              <th>Live Titles</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="categories-tbody">
            <!-- Injected via JavaScript -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Real-Time Category Creation Modal -->
  <div id="create-modal" class="modal-overlay">
    <div class="modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 class="modal-title">➕ Create New Live Shelf</h2>
        <button style="background:none; border:none; color:var(--text-muted); font-size:20px; cursor:pointer;" onclick="closeCreateModal()">&times;</button>
      </div>

      <div class="form-group">
        <label class="form-label">Choose Preset Theme (Optional)</label>
        <select class="form-select" id="input-preset" onchange="applyPreset()">
          <option value="">-- Custom Shelf --</option>
          <option value="heist" data-title="HIGH-STAKES HEISTS & ROBBERIES" data-title-ar="عمليات السرقة الكبرى والمطاردات" data-query='or=(keywords_json.cs.[{"name":"heist"}],keywords_json.cs.[{"name":"robbery"}])'>Heists & Bank Robberies (194 titles)</option>
          <option value="timetravel" data-title="TIME TRAVEL & ALTERNATE REALITIES" data-title-ar="عوالم السفر عبر الزمن" data-query='or=(keywords_json.cs.[{"name":"time travel"}],keywords_json.cs.[{"name":"time loop"}])'>Time Travel & Multiverse (146 titles)</option>
          <option value="survival" data-title="SURVIVAL & POST-APOCALYPTIC" data-title-ar="صراع البقاء ونهاية العالم" data-query='or=(keywords_json.cs.[{"name":"survival"}],keywords_json.cs.[{"name":"post-apocalyptic"}])'>Survival & Dystopia (362 titles)</option>
          <option value="martialarts" data-title="MARTIAL ARTS & COMBAT MASTERS" data-title-ar="فنون القتال والمواجهات الملحمية" data-query='or=(keywords_json.cs.[{"name":"martial arts"}],keywords_json.cs.[{"name":"kung fu"}])'>Martial Arts & Kung Fu (315 titles)</option>
          <option value="truestory" data-title="INSPIRED BY TRUE EVENTS" data-title-ar="مقتبس من أحداث وقصص حقيقية" data-query='or=(keywords_json.cs.[{"name":"based on true story"}],keywords_json.cs.[{"name":"biography"}])'>Based on True Events (763 titles)</option>
          <option value="spy" data-title="ESPIONAGE & SECRET AGENTS" data-title-ar="عالم الجواسيس والاستخبارات" data-query='or=(keywords_json.cs.[{"name":"spy"}],keywords_json.cs.[{"name":"secret agent"}])'>Spy & Espionage (236 titles)</option>
          <option value="masterpieces" data-title="CINEMA MASTERPIECES (8.5+)" data-title-ar="أعظم روائع السينما العالمية" data-query="vote_average=gte.8.5">Highest Rated Masterpieces (8.5+)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">English Title</label>
        <input type="text" class="form-input" id="input-title" placeholder="e.g. CYBERPUNK DYSTOPIA">
      </div>

      <div class="form-group">
        <label class="form-label">Arabic Localized Title</label>
        <input type="text" class="form-input" id="input-title-ar" placeholder="e.g. روائع الخيال المستقبلي" style="direction:rtl;">
      </div>

      <div class="form-group">
        <label class="form-label">Filter Query (PostgREST)</label>
        <input type="text" class="form-input" id="input-query" placeholder='e.g. keywords_json.cs.[{"name":"time travel"}]'>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn btn-secondary" style="flex: 1;" onclick="window.closeCreateModal()">Cancel</button>
        <button class="btn btn-primary" style="flex: 2;" onclick="window.submitCreateCategory()">⚡ Test & Publish Shelf</button>
      </div>
    </div>
  </div>

  <div id="toast">Notification</div>

  <script>
    window.showToast = function(msg) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    };

    window.openCreateModal = function() {
      const m = document.getElementById('create-modal');
      if (m) m.classList.add('active');
    };

    window.closeCreateModal = function() {
      const m = document.getElementById('create-modal');
      if (m) m.classList.remove('active');
    };

    window.applyPreset = function() {
      const select = document.getElementById('input-preset');
      const opt = select ? select.options[select.selectedIndex] : null;
      if (opt && opt.dataset.title) {
        document.getElementById('input-title').value = opt.dataset.title;
        document.getElementById('input-title-ar').value = opt.dataset.titleAr || '';
        document.getElementById('input-query').value = opt.dataset.query || '';
      }
    };

    window.submitCreateCategory = async function() {
      const title = document.getElementById('input-title').value.trim();
      const title_ar = document.getElementById('input-title-ar').value.trim();
      const filter_query = document.getElementById('input-query').value.trim();

      if (!title || !filter_query) {
        window.showToast('⚠️ Please provide Title and Filter Query.');
        return;
      }

      window.showToast('Testing & creating category...');
      try {
        const res = await fetch('/api/categories/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            title_ar,
            filter_query,
            category_type: 'thematic',
            order_by: 'popularity.desc'
          })
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);

        window.showToast('🎉 Published "' + title + '" with ' + result.count + ' titles!');
        window.closeCreateModal();
        window.fetchMetrics();
      } catch (err) {
        window.showToast('❌ Failed: ' + err.message);
      }
    };

    window.onDeleteClick = function(btn) {
      const id = btn.getAttribute('data-id');
      const name = decodeURIComponent(btn.getAttribute('data-name') || '');
      if (!confirm('Are you sure you want to delete shelf: ' + name + '?')) return;
      window.deleteCategory(id, name);
    };

    window.deleteCategory = async function(id, name) {
      try {
        const res = await fetch('/api/categories/' + id, { method: 'DELETE' });
        const result = await res.json();
        window.showToast('🗑️ Deleted ' + name);
        window.fetchMetrics();
      } catch (err) {
        window.showToast('❌ Delete failed: ' + err.message);
      }
    };

    function safeSetText(id, text) {
      const el = document.getElementById(id);
      if (el) el.innerText = text !== undefined && text !== null ? text : '--';
    }

    function safeSetWidth(id, pct) {
      const el = document.getElementById(id);
      if (el) el.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
    }

    window.fetchMetrics = async function() {
      try {
        const res = await fetch('/api/metrics');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data) renderData(data);
      } catch (err) {
        console.error('Fetch metrics error:', err);
      }
    };

    function renderData(d) {
      if (!d) return;
      try {
        const cat = d.catalogue || {};
        const srv = d.server || {};
        const rec = d.recentReleases || {};

        safeSetText('val-total-movies', (cat.totalMovies || 0).toLocaleString());
        safeSetText('val-arabic-total', (cat.withAnyArabic || 0).toLocaleString());
        safeSetWidth('prog-arabic', cat.arabicCoveragePct || 0);
        safeSetText('val-arabic-pct', (cat.arabicCoveragePct || 0) + '% Translated');
        safeSetText('val-studios-enriched', (cat.withStudios || 0).toLocaleString());
        safeSetText('val-uptime', srv.uptimeFormatted || 'Live');
        safeSetText('val-memory', 'RAM: ' + (srv.memoryUsedMB || 0) + 'MB / ' + (srv.memoryTotalMB || 0) + 'MB');

        const tot = cat.totalMovies || 10244;
        safeSetText('val-arabic-unique-label', (cat.withAnyArabic || 0).toLocaleString() + ' Titles');
        
        const tAr = cat.withArabicTitle || 0;
        safeSetText('val-title-ar', tAr.toLocaleString() + ' (' + ((tAr / tot) * 100).toFixed(1) + '%)');
        safeSetWidth('prog-title-ar', (tAr / tot) * 100);

        const oAr = cat.withArabicOverview || 0;
        safeSetText('val-overview-ar', oAr.toLocaleString() + ' (' + ((oAr / tot) * 100).toFixed(1) + '%)');
        safeSetWidth('prog-overview-ar', (oAr / tot) * 100);

        const tagAr = cat.withArabicTagline || 0;
        safeSetText('val-tagline-ar', tagAr.toLocaleString() + ' (' + ((tagAr / tot) * 100).toFixed(1) + '%)');
        safeSetWidth('prog-tagline-ar', (tagAr / tot) * 100);

        const y26 = rec.y2026 || { translated: 0, total: 0, pct: 0 };
        safeSetText('val-y2026', y26.translated + ' / ' + y26.total + ' (' + y26.pct + '%)');
        safeSetWidth('prog-y2026', y26.pct);

        const y25 = rec.y2025 || { translated: 0, total: 0, pct: 0 };
        safeSetText('val-y2025', y25.translated + ' / ' + y25.total + ' (' + y25.pct + '%)');
        safeSetWidth('prog-y2025', y25.pct);

        const mod = rec.modernEra || { translated: 0, total: 0, pct: 0 };
        safeSetText('val-modern', mod.translated + ' / ' + mod.total + ' (' + mod.pct + '%)');
        safeSetWidth('prog-modern', mod.pct);

        const studiosContainer = document.getElementById('studios-container');
        if (studiosContainer && Array.isArray(d.studios)) {
          studiosContainer.innerHTML = '';
          d.studios.forEach(s => {
            const div = document.createElement('div');
            div.className = 'studio-pill';
            div.innerHTML = 
              '<div>' +
                '<div class="studio-name" style="display:flex; align-items:center; gap:5px;">' +
                  '<span style="width:6px; height:6px; border-radius:50%; background:' + (s.color || '#E50914') + '; display:inline-block;"></span>' +
                  s.name +
                '</div>' +
                '<div class="studio-name-ar">' + (s.nameAr || '') + '</div>' +
              '</div>' +
              '<div class="studio-count-badge" style="color: ' + (s.count >= 6 ? '#10B981' : '#F59E0B') + '">' + (s.count || 0) + '</div>';
            studiosContainer.appendChild(div);
          });
        }

        // 6. Gemini Cooperative AI & Gap-Scanner
        const aiContainer = document.getElementById('ai-keys-container');
        const aiPool = d.aiPool;
        if (aiPool) {
          const isAiOn = !!aiPool.isAiEnabled;
          const runtimeBadge = document.getElementById('ai-runtime-badge');
          const toggleAiBtn = document.getElementById('btn-toggle-ai');
          if (runtimeBadge) {
            if (isAiOn) {
              runtimeBadge.innerText = '🟢 Runtime AI: Enabled';
              runtimeBadge.style.background = 'rgba(16, 185, 129, 0.15)';
              runtimeBadge.style.color = '#10B981';
              runtimeBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            } else {
              runtimeBadge.innerText = '⏸️ Runtime AI: Controlled';
              runtimeBadge.style.background = 'rgba(245, 158, 11, 0.15)';
              runtimeBadge.style.color = '#F59E0B';
              runtimeBadge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            }
          }
          if (toggleAiBtn) {
            toggleAiBtn.innerText = isAiOn ? '🛑 Disable Runtime AI' : '🎛️ Enable Runtime AI';
          }

          safeSetText('ai-pool-badge', aiPool.healthyKeys + ' / ' + aiPool.totalKeys + ' Healthy (' + aiPool.model + ')');

          // Gap Scan Status
          const gap = aiPool.cooperativeScan || {};
          const gapBtn = document.getElementById('btn-gap-scan');
          if (gapBtn) {
            if (gap.isRunning && !gap.isPaused) {
              gapBtn.innerText = '⏸️ Pause AI Gap-Scan';
              gapBtn.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
            } else if (gap.isRunning && gap.isPaused) {
              gapBtn.innerText = '▶️ Resume AI Gap-Scan';
              gapBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            } else {
              gapBtn.innerText = '🚀 Launch Cooperative AI Gap-Scan';
              gapBtn.style.background = 'linear-gradient(135deg, #6366F1, #4F46E5)';
            }
          }

          safeSetText('ai-gap-progress-label', (gap.processed || 0).toLocaleString() + ' / ' + (gap.totalGaps || 0).toLocaleString() + ' (' + (gap.completionPct || 0) + '%)');
          safeSetWidth('ai-gap-progress-fill', gap.completionPct || 0);
          safeSetText('ai-gap-current-title', gap.currentTitle || 'Idle (Ready on demand)');
          safeSetText('ai-gap-enriched-count', (gap.enriched || 0).toLocaleString());
          safeSetText('ai-gap-failed-count', (gap.failed || 0).toLocaleString());

          if (aiContainer && Array.isArray(aiPool.keys)) {
            aiContainer.innerHTML = '';
            aiPool.keys.forEach(k => {
              const div = document.createElement('div');
              div.className = 'studio-pill';
              div.style.padding = '8px 12px';
              const isHealthy = k.status === 'healthy';
              const statusColor = isHealthy ? '#10B981' : (k.status === 'cooldown' ? '#F59E0B' : '#EF4444');
              div.innerHTML =
                '<div>' +
                  '<div style="font-size: 12px; font-weight: 700; color: white; display: flex; align-items: center; gap: 6px;">' +
                    '<span style="width: 7px; height: 7px; border-radius: 50%; background: ' + statusColor + '; display: inline-block;"></span>' +
                    'Key #' + k.index + ' <span style="font-size: 10px; color: var(--text-muted); font-family: monospace;">(' + k.keyMasked + ')</span>' +
                  '</div>' +
                  '<div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">' +
                    'RPM: ' + k.rpmCount + '/15 • Total: ' + k.totalSuccess +
                  '</div>' +
                '</div>' +
                '<div class="studio-count-badge" style="color: ' + statusColor + '; font-size: 10px; text-transform: uppercase;">' + k.status + '</div>';
              aiContainer.appendChild(div);
            });
          }
        }

        const tbody = document.getElementById('categories-tbody');
        const cats = d.categories || [];
        safeSetText('categories-count-badge', cats.length + ' Published Shelves');

        if (tbody) {
          tbody.innerHTML = '';
          cats.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = 
              '<td><strong>#' + c.sort_order + '</strong></td>' +
              '<td style="font-weight:600; color:white;">' + c.title + '</td>' +
              '<td style="direction:rtl; text-align:right;">' + (c.title_ar || '-') + '</td>' +
              '<td><span style="text-transform:uppercase; font-size:10px; opacity:0.8;">' + c.category_type + '</span></td>' +
              '<td><strong style="color:#10B981;">' + (c.movie_count || 0).toLocaleString() + ' titles</strong></td>' +
              '<td><span class="pill-published">Live</span></td>' +
              '<td>' +
                '<button class="btn-delete" data-id="' + c.id + '" data-name="' + encodeURIComponent(c.title || '') + '" onclick="window.onDeleteClick(this)">🗑️</button>' +
              '</td>';
            tbody.appendChild(tr);
          });
        }
      } catch (err) {
        console.error('Render error:', err);
      }
    }

    let autoScannerRunning = true;

    window.fetchScannerStatus = async function() {
      try {
        const res = await fetch('/api/scan/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.status) {
          const s = data.status;
          autoScannerRunning = s.isRunning && !s.isPaused;

          const badge = document.getElementById('scanner-badge');
          const toggleBtn = document.getElementById('btn-toggle-scan');
          if (badge && toggleBtn) {
            if (autoScannerRunning) {
              badge.innerText = '🟢 Active (Scanning 24/7)';
              badge.style.background = 'rgba(16, 185, 129, 0.15)';
              badge.style.color = '#10B981';
              badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
              toggleBtn.innerText = '⏸️ Pause Auto-Scan';
            } else {
              badge.innerText = '⏸️ Paused';
              badge.style.background = 'rgba(245, 158, 11, 0.15)';
              badge.style.color = '#F59E0B';
              badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
              toggleBtn.innerText = '▶️ Resume Auto-Scan';
            }
          }

          safeSetText('scanner-progress-label', (s.enrichedMovies || 0).toLocaleString() + ' / ' + (s.totalMovies || 10244).toLocaleString() + ' (' + s.completionPct + '%)');
          safeSetWidth('scanner-progress-fill', s.completionPct || 0);
          safeSetText('scanner-current-movie', s.lastScannedTitle || 'Idle / Saturated');
          safeSetText('scanner-session-count', (s.totalProcessedThisSession || 0).toLocaleString());
        }
      } catch (err) {
        console.error('Scanner status error:', err);
      }
    };

    window.toggleAutoScanner = async function() {
      try {
        if (autoScannerRunning) {
          await fetch('/api/scan/stop', { method: 'POST' });
          window.showToast('⏸️ Continuous Auto-Scanner Paused.');
        } else {
          await fetch('/api/scan/start', { method: 'POST' });
          window.showToast('🟢 Continuous 24/7 Auto-Scanner Resumed!');
        }
        setTimeout(window.fetchScannerStatus, 500);
      } catch (err) {
        window.showToast('❌ Error: ' + err.message);
      }
    };

    window.triggerBatchScan = async function(limit = 500) {
      window.showToast('⚡ Triggering batch scan of next ' + limit + ' movies...');
      try {
        const res = await fetch('/api/scan/batch?limit=' + limit, { method: 'POST' });
        const result = await res.json();
        window.showToast('✓ ' + (result.message || 'Batch scan complete!'));
        setTimeout(window.fetchMetrics, 1000);
        setTimeout(window.fetchScannerStatus, 1000);
      } catch (err) {
        window.showToast('❌ Batch scan failed: ' + err.message);
      }
    };

    window.triggerMultiSourceSync = async function() {
      window.showToast('🌐 Triggering Knowledge Graph sync (Netflix / Apple / Amazon)...');
      try {
        const res = await fetch('/api/sync/multi-source', { method: 'POST' });
        const result = await res.json();
        window.showToast('✓ ' + (result.message || 'Multi-source sync started!'));
        setTimeout(window.fetchMetrics, 2000);
      } catch (err) {
        window.showToast('❌ Knowledge Graph sync failed: ' + err.message);
      }
    };

    window.triggerMovieSync = async function() {
      window.showToast('⚡ Triggering background enrichment batch...');
      try {
        const res = await fetch('/api/sync/movies?batch=100', { method: 'POST' });
        const result = await res.json();
        window.showToast('✓ ' + (result.result?.message || 'Batch executed successfully!'));
        setTimeout(window.fetchMetrics, 1200);
      } catch (err) {
        window.showToast('❌ Sync failed: ' + err.message);
      }
    };

    window.triggerResetAndRescan = async function() {
      const ok = confirm('Reset and Rescan Database from Scratch?\\\\n\\\\nThis will reset all movie enrichment timestamps in Supabase and restart the 24/7 background auto-scanner from movie #1 across all 10,244 titles.\\\\n\\\\nAre you sure you want to proceed?');
      if (!ok) return;

      window.showToast('🔄 Resetting timestamps and starting fresh scan from scratch...');
      try {
        const res = await fetch('/api/scan/reset', { method: 'POST' });
        const result = await res.json();
        window.showToast('✓ ' + (result.message || 'Database rescan initiated!'));
        setTimeout(window.fetchMetrics, 1000);
        setTimeout(window.fetchScannerStatus, 1000);
      } catch (err) {
        window.showToast('❌ Reset failed: ' + err.message);
      }
    };

    window.triggerRegenerateCategories = async function() {
      window.showToast('🔄 Regenerating home categories...');
      try {
        const res = await fetch('/api/sync/categories', { method: 'POST' });
        const result = await res.json();
        window.showToast('✓ Published ' + (result.result?.published || 0) + ' home categories!');
        setTimeout(window.fetchMetrics, 1200);
      } catch (err) {
        window.showToast('❌ Failed: ' + err.message);
      }
    };

    window.triggerAiTest = async function() {
      window.showToast('🤖 Testing Gemini AI Pool (Model: gemini-2.5-flash)...');
      try {
        const res = await fetch('/api/ai/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Inception', year: 2010 })
        });
        const data = await res.json();
        if (data.success) {
          window.showToast('✨ AI Success: ' + (data.result?.title_ar || 'Enriched') + ' • Studio: ' + (data.result?.primary_studio || 'Recognized'));
        } else {
          window.showToast('⚠️ AI response: ' + (data.message || 'Error'));
        }
        setTimeout(window.fetchMetrics, 500);
      } catch (err) {
        window.showToast('❌ AI Test failed: ' + err.message);
      }
    };

    window.toggleAiRuntime = async function() {
      try {
        const res = await fetch('/api/ai/toggle', { method: 'POST' });
        const result = await res.json();
        window.showToast(result.message || 'Runtime AI status updated');
        setTimeout(window.fetchMetrics, 300);
      } catch (err) {
        window.showToast('❌ Toggle error: ' + err.message);
      }
    };

    window.triggerCooperativeGapScan = async function() {
      try {
        const res = await fetch('/api/ai/gap-scan/status');
        const data = await res.json();
        if (data.status && data.status.isRunning && !data.status.isPaused) {
          await fetch('/api/ai/gap-scan/pause', { method: 'POST' });
          window.showToast('⏸️ Cooperative AI Gap-Scan Paused.');
        } else if (data.status && data.status.isRunning && data.status.isPaused) {
          await fetch('/api/ai/gap-scan/start', { method: 'POST' });
          window.showToast('▶️ Cooperative AI Gap-Scan Resumed!');
        } else {
          window.showToast('🚀 Launching Cooperative AI Gap-Scan across database...');
          await fetch('/api/ai/gap-scan/start', { method: 'POST' });
          window.showToast('✨ Cooperative AI Gap-Scan actively filling missed fields!');
        }
        setTimeout(window.fetchMetrics, 500);
      } catch (err) {
        window.showToast('❌ Gap Scan error: ' + err.message);
      }
    };

    // Global aliases
    window.fetchMetrics = window.fetchMetrics;
    window.fetchScannerStatus = window.fetchScannerStatus;
    window.toggleAutoScanner = window.toggleAutoScanner;
    window.triggerBatchScan = window.triggerBatchScan;
    window.triggerMultiSourceSync = window.triggerMultiSourceSync;
    window.triggerMovieSync = window.triggerMovieSync;
    window.triggerResetAndRescan = window.triggerResetAndRescan;
    window.triggerRegenerateCategories = window.triggerRegenerateCategories;
    window.triggerAiTest = window.triggerAiTest;
    window.toggleAiRuntime = window.toggleAiRuntime;
    window.triggerCooperativeGapScan = window.triggerCooperativeGapScan;
    window.openCreateModal = window.openCreateModal;
    window.closeCreateModal = window.closeCreateModal;

    // Direct non-prefixed aliases for inline HTML onclick calls
    var fetchMetrics = window.fetchMetrics;
    var fetchScannerStatus = window.fetchScannerStatus;
    var toggleAutoScanner = window.toggleAutoScanner;
    var triggerBatchScan = window.triggerBatchScan;
    var triggerMultiSourceSync = window.triggerMultiSourceSync;
    var triggerMovieSync = window.triggerMovieSync;
    var triggerResetAndRescan = window.triggerResetAndRescan;
    var triggerRegenerateCategories = window.triggerRegenerateCategories;
    var triggerAiTest = window.triggerAiTest;
    var toggleAiRuntime = window.toggleAiRuntime;
    var triggerCooperativeGapScan = window.triggerCooperativeGapScan;
    var openCreateModal = window.openCreateModal;
    var closeCreateModal = window.closeCreateModal;
    var applyPreset = window.applyPreset;
    var submitCreateCategory = window.submitCreateCategory;

    // Initial load + auto-refresh
    window.fetchMetrics();
    window.fetchScannerStatus();
    setInterval(window.fetchMetrics, 10000);
    setInterval(window.fetchScannerStatus, 4000);
  </script>
</body>
</html>`;
}
