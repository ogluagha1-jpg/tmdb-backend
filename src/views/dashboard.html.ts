export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Teraflix Engine | Server Operations & Catalogue Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0B0E14;
      --bg-card: rgba(22, 27, 34, 0.88);
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
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px 16px;
    }

    /* Top Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 18px;
      gap: 16px;
      flex-wrap: wrap;
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

    /* ── 2-Tab Navigation Bar ── */
    .tabs-nav-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 22px;
      background: rgba(15, 19, 26, 0.85);
      padding: 6px;
      border-radius: 16px;
      border: 1px solid var(--border-subtle);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
      text-align: left;
      user-select: none;
    }

    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
    }

    .tab-btn.active {
      background: linear-gradient(135deg, rgba(229, 9, 20, 0.16), rgba(99, 102, 241, 0.14));
      border-color: rgba(229, 9, 20, 0.35);
      color: var(--text-primary);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .tab-icon {
      font-size: 22px;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
    }

    .tab-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: -0.2px;
      line-height: 1.2;
    }

    .tab-btn.active .tab-title {
      color: #FFFFFF;
    }

    .tab-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
      font-weight: 500;
    }

    .tab-btn.active .tab-sub {
      color: rgba(255, 255, 255, 0.75);
    }

    .tab-content {
      animation: tabFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes tabFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Buttons */
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
      background: rgba(255, 255, 255, 0.06);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    /* Table Styles */
    .table-container {
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      margin-top: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }

    th {
      background: rgba(255, 255, 255, 0.04);
      padding: 10px 12px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-subtle);
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-primary);
    }

    .pill-published {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .btn-delete {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #EF4444;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }

    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Modal Overlay */
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
      padding: 16px;
      z-index: 200;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    .modal-card {
      background: #121720;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 20px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }

    .modal-overlay.active .modal-card {
      transform: scale(1);
    }

    .modal-title {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: white;
      font-size: 12px;
      font-family: inherit;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: var(--indigo);
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 16px;
      left: 16px;
      right: 16px;
      margin: 0 auto;
      max-width: 420px;
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

    /* ── Mobile & Responsive Breakpoints ── */
    @media (max-width: 992px) {
      .grid-4 {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 768px) {
      .container {
        padding: 12px 10px;
      }

      header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .tabs-nav-bar {
        grid-template-columns: 1fr;
        gap: 6px;
        padding: 4px;
      }

      .tab-btn {
        padding: 10px 14px;
        gap: 10px;
      }

      .tab-icon {
        font-size: 20px;
      }

      .tab-title {
        font-size: 13px;
      }

      .tab-sub {
        font-size: 10px;
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
        font-size: 20px;
      }

      .grid-2 {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .studios-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 6px;
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

      #enriched-movies-container {
        grid-template-columns: 1fr !important;
      }

      #enriched-search-input {
        width: 100% !important;
      }

      .modal-card {
        padding: 16px;
        max-width: 95vw;
        max-height: 88vh;
        overflow-y: auto;
      }
    }

    @media (max-width: 480px) {
      .brand-title {
        font-size: 15px;
      }

      .brand-logo {
        font-size: 14px;
        padding: 4px 8px;
      }

      .btn {
        padding: 7px 10px;
        font-size: 11px;
      }

      .card-value {
        font-size: 18px;
      }

      .card-label {
        font-size: 10px;
      }

      .card-desc {
        font-size: 10px;
      }

      .table-container {
        -webkit-overflow-scrolling: touch;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Header -->
    <header>
      <div class="brand-group">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="brand-logo">TERAFLIX</div>
          <div>
            <h1 class="brand-title">Control Hub & Metadata Engine</h1>
            <p class="brand-subtitle">High-Performance Backend & Live Discovery</p>
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
      </div>
    </header>

    <!-- ── 2-Tab Navigation Bar ── -->
    <div class="tabs-nav-bar">
      <button id="tab-btn-operations" class="tab-btn active" onclick="switchTab('operations')">
        <span class="tab-icon">⚙️</span>
        <div>
          <div class="tab-title">Server Operations & Live Engine</div>
          <div class="tab-sub">24/7 Scanner, Dual-AI Gap-Scan & Key Pools</div>
        </div>
      </button>
      <button id="tab-btn-catalogue" class="tab-btn" onclick="switchTab('catalogue')">
        <span class="tab-icon">🎬</span>
        <div>
          <div class="tab-title">Metadata & Catalogue Explorer</div>
          <div class="tab-sub">Enriched Titles, Arabic Coverage & Home Shelves</div>
        </div>
      </button>
    </div>

    <!-- ========================================================= -->
    <!-- TAB 1: ⚙️ SERVER OPERATIONS & LIVE PROCESSES             -->
    <!-- ========================================================= -->
    <div id="tab-content-operations" class="tab-content">
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

      <!-- 🤖 GEMINI & GROQ AI COOPERATIVE HUB 🤖 -->
      <div class="card" style="margin-bottom: 20px; border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(135deg, rgba(22, 27, 34, 0.95), rgba(99, 102, 241, 0.08));">
        <div class="card-title-row" style="flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="card-icon" style="background: rgba(99, 102, 241, 0.2); color: #818CF8; font-size: 20px;">🤖</div>
            <div>
              <h2 style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                Gemini & Groq AI Cooperative Hub
                <span id="ai-runtime-badge" class="status-badge" style="font-size: 11px; padding: 2px 8px; background: rgba(245, 158, 11, 0.15); color: #F59E0B; border-color: rgba(245, 158, 11, 0.3);">
                  ⏸️ Runtime AI: Controlled
                </span>
                <span id="ai-pool-badge" class="status-badge" style="font-size: 11px; padding: 2px 8px; background: rgba(99, 102, 241, 0.15); color: #818CF8; border-color: rgba(99, 102, 241, 0.3);">
                  Keys Active
                </span>
                <span id="groq-badge" class="status-badge" style="font-size: 11px; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); color: #10B981; border-color: rgba(16, 185, 129, 0.3);">
                  🦙 Groq Fallback: Ready
                </span>
              </h2>
              <p class="card-desc">Cooperatively enriches movie metadata with Arabic localization, studio tags, and micro-genres with automatic Groq open-source failover</p>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-toggle-ai" class="btn" onclick="window.toggleAiRuntime()" style="background: rgba(255, 255, 255, 0.08); font-size: 12px; font-weight: 600;">
              🎛️ Toggle Runtime AI
            </button>
            <button id="btn-gap-scan" class="btn btn-primary" onclick="window.triggerCooperativeGapScan()" style="background: linear-gradient(135deg, #6366F1, #4F46E5); font-weight: 700;">
              🚀 Launch Cooperative AI Gap-Scan
            </button>
            <button id="btn-discover-cats" class="btn" onclick="window.triggerAiCategoryDiscovery()" style="background: linear-gradient(135deg, #10B981, #059669); font-weight: 700; color: white;">
              ✨ AI Discover & Dynamic Shelves
            </button>
            <button class="btn" onclick="window.triggerAiTest()" style="background: rgba(99, 102, 241, 0.15); color: #818CF8; border: 1px solid rgba(99, 102, 241, 0.3); font-weight: 600;">
              ⚡ Test Key
            </button>
          </div>
        </div>

        <!-- Gemini Model Selection & Admin Control Bar -->
        <div style="margin-top: 14px; padding: 10px 14px; border-radius: 10px; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(99, 102, 241, 0.3); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="font-size: 12px; font-weight: 800; color: #818CF8; display: flex; align-items: center; gap: 6px;">
              🤖 Active Gemini Engine:
            </span>
            <select id="select-gemini-model" onchange="window.changeGeminiModel(this.value)" style="padding: 6px 12px; font-size: 12px; font-weight: 700; background: #0B0F17; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 8px; color: #F8FAFC; cursor: pointer; outline: none;">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Stable) - Default</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Fast & Budget)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Stable)</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Latest)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (High Reasoning)</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="gemini-model-desc-badge" style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Default: Gemini 2.5 Flash</span>
            <span class="status-badge" style="font-size: 10px; padding: 2px 7px; background: rgba(16, 185, 129, 0.15); color: #10B981;">Live Admin Control</span>
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

        <!-- Key Pool Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-top: 14px;" id="ai-keys-container">
          <!-- Injected via JavaScript -->
        </div>
      </div>

      <!-- Live Server Health & Diagnostics -->
      <div class="card">
        <div class="card-title-row">
          <div>
            <h2 style="font-size: 15px; font-weight: 800;">Server System Diagnostics</h2>
            <p class="card-desc">Process runtime and environment stats</p>
          </div>
          <div class="status-badge" style="background: rgba(6, 182, 212, 0.12); color: #06B6D4; border-color: rgba(6, 182, 212, 0.3);">
            ⏱️ <span id="val-uptime">Live</span>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 10px;">
          <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">RAM MEMORY USAGE</div>
            <div style="font-size: 16px; font-weight: 800; color: white; margin-top: 4px;" id="val-memory">-- MB</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">DEPLOYMENT ENVIRONMENT</div>
            <div style="font-size: 16px; font-weight: 800; color: #10B981; margin-top: 4px;">Railway Zero-Downtime</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">DATABASE ENGINE</div>
            <div style="font-size: 16px; font-weight: 800; color: #60A5FA; margin-top: 4px;">Supabase PostgreSQL</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- TAB 2: 🎬 CATALOGUE & METADATA EXPLORER                  -->
    <!-- ========================================================= -->
    <div id="tab-content-catalogue" class="tab-content" style="display: none;">
      <!-- Quick Expand / Collapse Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">📚 Catalogue Explorer Modules</span>
          <span class="status-badge" style="font-size: 10px; padding: 2px 7px;">Collapsed by Default</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" style="font-size: 11px; padding: 5px 10px;" onclick="expandAllSections()">📂 Expand All</button>
          <button class="btn btn-secondary" style="font-size: 11px; padding: 5px 10px;" onclick="collapseAllSections()">📁 Collapse All</button>
        </div>
      </div>

      <!-- Top 4 Summary Metrics -->
      <div class="grid-4" style="margin-bottom: 16px;">
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
            <span class="card-label">Home Shelves</span>
            <div class="card-icon" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B;">📁</div>
          </div>
          <div class="card-value" id="val-categories-count">--</div>
          <div class="card-desc">Active dynamic shelves</div>
        </div>
      </div>

      <!-- MODULE 1: 🇸🇦 Arabic Translation Coverage Breakdown (Collapsible) -->
      <div class="card" style="margin-bottom: 14px; padding: 0; overflow: hidden; border-color: rgba(16, 185, 129, 0.3);">
        <div onclick="toggleSection('sec-arabic')" style="padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(16, 185, 129, 0.05); user-select: none;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="card-icon" style="background: rgba(16, 185, 129, 0.15); color: #10B981; font-size: 18px;">🇸🇦</div>
            <div>
              <h2 style="font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                Arabic Translation Coverage Breakdown
                <span class="status-badge" style="font-size: 10px; padding: 1px 6px; background: rgba(16, 185, 129, 0.15); color: #10B981;" id="val-arabic-unique-label">-- Titles</span>
              </h2>
              <p class="card-desc">Field metrics (titles, overviews, taglines) & release year coverage (2026, 2025, Modern Era)</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="sec-arabic-toggle-text" style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Click to Expand</span>
            <span id="sec-arabic-icon" style="font-size: 13px; color: #10B981; transition: transform 0.25s ease;">▼</span>
          </div>
        </div>
        <div id="sec-arabic-body" style="display: none; padding: 16px; border-top: 1px solid var(--border-subtle);">
          <div class="grid-2" style="margin-bottom: 0;">
            <!-- Arabic Fields -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <h3 style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">By Metadata Field</h3>
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
            <!-- Release Years -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <h3 style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">By Release Year</h3>
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
      </div>

      <!-- MODULE 2: 🏢 Studio Hub Live Counters (Collapsible) -->
      <div class="card" style="margin-bottom: 14px; padding: 0; overflow: hidden; border-color: rgba(99, 102, 241, 0.3);">
        <div onclick="toggleSection('sec-studios')" style="padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(99, 102, 241, 0.05); user-select: none;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="card-icon" style="background: rgba(99, 102, 241, 0.15); color: #818CF8; font-size: 18px;">🏢</div>
            <div>
              <h2 style="font-size: 15px; font-weight: 800;">Studio Hub Live Counters</h2>
              <p class="card-desc">Titles accessible via Studio Hub watermark cards (Netflix, Disney, Warner Bros, A24, Apple, etc.)</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="sec-studios-toggle-text" style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Click to Expand</span>
            <span id="sec-studios-icon" style="font-size: 13px; color: #818CF8; transition: transform 0.25s ease;">▼</span>
          </div>
        </div>
        <div id="sec-studios-body" style="display: none; padding: 16px; border-top: 1px solid var(--border-subtle);">
          <div class="studios-grid" id="studios-container">
            <!-- Injected via JavaScript -->
          </div>
        </div>
      </div>

      <!-- MODULE 3: 📁 Active Published Home Categories (Collapsible) -->
      <div class="card" style="margin-bottom: 14px; padding: 0; overflow: hidden; border-color: rgba(245, 158, 11, 0.3);">
        <div onclick="toggleSection('sec-categories')" style="padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(245, 158, 11, 0.05); user-select: none;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="card-icon" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-size: 18px;">📁</div>
            <div>
              <h2 style="font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                Active Published Home Categories
                <span id="categories-count-badge" class="status-badge" style="font-size: 10px; padding: 1px 6px; background: rgba(245, 158, 11, 0.15); color: #F59E0B;">-- Shelves</span>
              </h2>
              <p class="card-desc">Dynamic shelves active on mobile app home screen</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn" onclick="event.stopPropagation(); window.triggerAiCategoryDiscovery();" style="background: linear-gradient(135deg, #10B981, #059669); font-size: 11px; padding: 4px 8px; font-weight: 700; color: white;">
              ✨ AI Discover
            </button>
            <span id="sec-categories-toggle-text" style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Click to Expand</span>
            <span id="sec-categories-icon" style="font-size: 13px; color: #F59E0B; transition: transform 0.25s ease;">▼</span>
          </div>
        </div>
        <div id="sec-categories-body" style="display: none; padding: 16px; border-top: 1px solid var(--border-subtle);">
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

      <!-- MODULE 4: 🎬 AI Enriched Movies & Quality Inspection Hub (Collapsible) -->
      <div class="card" style="margin-bottom: 14px; padding: 0; overflow: hidden; border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(135deg, rgba(22, 27, 34, 0.95), rgba(99, 102, 241, 0.05));">
        <div onclick="toggleSection('sec-enriched')" style="padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(99, 102, 241, 0.08); user-select: none;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="card-icon" style="background: rgba(99, 102, 241, 0.2); color: #818CF8; font-size: 18px;">🎬</div>
            <div>
              <h2 style="font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                AI Enriched Movies & Quality Inspection Hub
                <span id="enriched-total-badge" class="status-badge" style="font-size: 10px; padding: 1px 6px; background: rgba(99, 102, 241, 0.15); color: #818CF8;">
                  Loading...
                </span>
              </h2>
              <p class="card-desc">Inspect all titles enriched by Groq & Gemini with populated Arabic translations, studios, and micro-genres</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="sec-enriched-toggle-text" style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Click to Expand</span>
            <span id="sec-enriched-icon" style="font-size: 13px; color: #818CF8; transition: transform 0.25s ease;">▼</span>
          </div>
        </div>
        <div id="sec-enriched-body" style="display: none; padding: 16px; border-top: 1px solid var(--border-subtle);">
          <!-- Filters & Search Toolbar -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
            <!-- Filter Engine Pills -->
            <div style="display: flex; background: rgba(0,0,0,0.3); padding: 3px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <button id="filter-engine-all" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px; border: none; background: rgba(255,255,255,0.15); font-weight: 700;" onclick="filterEnrichedEngine('all')">🌟 All</button>
              <button id="filter-engine-groq" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px; border: none; color: #10B981;" onclick="filterEnrichedEngine('groq')">🦙 Groq</button>
              <button id="filter-engine-google" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px; border: none; color: #60A5FA;" onclick="filterEnrichedEngine('google')">🤖 Gemini</button>
            </div>

            <!-- Live Search Box -->
            <div style="display: flex; gap: 8px; flex: 1; max-width: 400px; justify-content: flex-end;">
              <input type="text" id="enriched-search-input" placeholder="🔍 Search title or arabic..." style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); color: white; padding: 6px 12px; border-radius: 8px; font-size: 12px; width: 100%;" oninput="debounceEnrichedSearch(this.value)">
              <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px; white-space: nowrap;" onclick="loadEnrichedMovies()">🔄 Refresh</button>
            </div>
          </div>

          <!-- Enriched Movies Grid Container -->
          <div id="enriched-movies-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px;">
            <!-- Injected via JavaScript -->
          </div>

          <!-- Pagination Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 10px;">
            <span id="enriched-pagination-info" style="font-size: 12px; color: var(--text-muted);">Showing 0-0 of 0 movies</span>
            <div style="display: flex; gap: 8px;">
              <button id="btn-enriched-prev" class="btn btn-secondary" style="padding: 4px 12px; font-size: 11px;" onclick="changeEnrichedPage(-1)" disabled>◀️ Previous</button>
              <button id="btn-enriched-next" class="btn btn-secondary" style="padding: 4px 12px; font-size: 11px;" onclick="changeEnrichedPage(1)">Next ▶️</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Raw JSON Metadata Inspector Modal -->
  <div id="json-modal" class="modal-overlay">
    <div class="modal-card" style="max-width: 650px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h2 class="modal-title" id="json-modal-title">🔍 Metadata Inspector</h2>
        <button style="background:none; border:none; color:var(--text-muted); font-size:20px; cursor:pointer;" onclick="closeJsonModal()">&times;</button>
      </div>
      <pre id="json-modal-content" style="background: rgba(0,0,0,0.6); padding: 14px; border-radius: 10px; font-family: monospace; font-size: 12px; color: #38BDF8; max-height: 420px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; border: 1px solid var(--border-subtle);"></pre>
      <div style="margin-top: 14px; text-align: right;">
        <button class="btn btn-secondary" onclick="closeJsonModal()">Close</button>
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
    // ── Tab Switching Controller ──
    window.switchTab = function(tabId) {
      const btnOps = document.getElementById('tab-btn-operations');
      const btnCat = document.getElementById('tab-btn-catalogue');
      const tabOps = document.getElementById('tab-content-operations');
      const tabCat = document.getElementById('tab-content-catalogue');

      if (tabId === 'operations') {
        if (btnOps) btnOps.classList.add('active');
        if (btnCat) btnCat.classList.remove('active');
        if (tabOps) tabOps.style.display = 'block';
        if (tabCat) tabCat.style.display = 'none';
        localStorage.setItem('teraflix_active_tab', 'operations');
      } else {
        if (btnCat) btnCat.classList.add('active');
        if (btnOps) btnOps.classList.remove('active');
        if (tabCat) tabCat.style.display = 'block';
        if (tabOps) tabOps.style.display = 'none';
        localStorage.setItem('teraflix_active_tab', 'catalogue');
        if (typeof window.loadEnrichedMovies === 'function') {
          window.loadEnrichedMovies();
        }
      }
    };

    // ── Module Collapse / Expand Controller (Default Collapsed) ──
    window.toggleSection = function(secId) {
      const body = document.getElementById(secId + '-body');
      const icon = document.getElementById(secId + '-icon');
      const text = document.getElementById(secId + '-toggle-text');
      if (!body) return;

      const isHidden = body.style.display === 'none' || !body.style.display;
      body.style.display = isHidden ? 'block' : 'none';

      if (icon) {
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      if (text) {
        text.innerText = isHidden ? 'Click to Collapse' : 'Click to Expand';
      }

      if (secId === 'sec-enriched' && isHidden && typeof window.loadEnrichedMovies === 'function') {
        window.loadEnrichedMovies();
      }
    };

    window.expandAllSections = function() {
      const list = ['sec-arabic', 'sec-studios', 'sec-categories', 'sec-enriched'];
      list.forEach(function(secId) {
        const body = document.getElementById(secId + '-body');
        const icon = document.getElementById(secId + '-icon');
        const text = document.getElementById(secId + '-toggle-text');
        if (body) body.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        if (text) text.innerText = 'Click to Collapse';
      });
      if (typeof window.loadEnrichedMovies === 'function') {
        window.loadEnrichedMovies();
      }
    };

    window.collapseAllSections = function() {
      const list = ['sec-arabic', 'sec-studios', 'sec-categories', 'sec-enriched'];
      list.forEach(function(secId) {
        const body = document.getElementById(secId + '-body');
        const icon = document.getElementById(secId + '-icon');
        const text = document.getElementById(secId + '-toggle-text');
        if (body) body.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        if (text) text.innerText = 'Click to Expand';
      });
    };

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
        safeSetText('val-categories-count', (Array.isArray(d.categories) ? d.categories.length : 0));
        safeSetText('val-uptime', srv.uptimeFormatted || 'Live');
        safeSetText('val-memory', (srv.memoryUsedMB || 0) + ' MB / ' + (srv.memoryTotalMB || 0) + ' MB');

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
          d.studios.forEach(function(s) {
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

          safeSetText('ai-pool-badge', aiPool.healthyKeys + ' / ' + aiPool.totalKeys + ' Gemini Keys (' + aiPool.model + ')');

          // Sync Active Gemini Model in dropdown
          const selectModel = document.getElementById('select-gemini-model');
          if (selectModel && aiPool.model && selectModel.value !== aiPool.model) {
            selectModel.value = aiPool.model;
          }
          const descBadge = document.getElementById('gemini-model-desc-badge');
          if (descBadge && aiPool.supportedModels && aiPool.supportedModels[aiPool.model]) {
            descBadge.innerText = aiPool.supportedModels[aiPool.model].description;
          }

          const groq = aiPool.groq;
          const groqBadge = document.getElementById('groq-badge');
          if (groqBadge) {
            if (groq && groq.isConfigured) {
              groqBadge.innerText = '🦙 Groq Fallback: Active (' + groq.totalKeys + ' keys)';
              groqBadge.style.background = 'rgba(16, 185, 129, 0.15)';
              groqBadge.style.color = '#10B981';
              groqBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            } else {
              groqBadge.innerText = '🦙 Groq Fallback: Ready (GROQ_API_KEY)';
              groqBadge.style.background = 'rgba(255, 255, 255, 0.06)';
              groqBadge.style.color = 'var(--text-muted)';
              groqBadge.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
          }

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

          if (aiContainer) {
            aiContainer.innerHTML = '';
            const allKeys = [...(Array.isArray(aiPool.keys) ? aiPool.keys : [])];
            if (groq && Array.isArray(groq.keys)) {
              groq.keys.forEach(function(gk) {
                allKeys.push({
                  index: 'Groq-' + gk.index,
                  keyMasked: gk.keyMasked,
                  status: gk.status,
                  rpmCount: gk.rpmCount,
                  totalSuccess: gk.totalSuccess,
                  isGroq: true,
                });
              });
            }

            if (allKeys.length > 0) {
              allKeys.forEach(function(k) {
                const div = document.createElement('div');
                div.className = 'studio-pill';
                div.style.padding = '8px 12px';
                const isHealthy = k.status === 'healthy';
                const statusColor = isHealthy ? '#10B981' : (k.status === 'cooldown' ? '#F59E0B' : '#EF4444');
                const tag = k.isGroq ? '🦙 Groq #' + k.index.replace('Groq-', '') : 'Key #' + k.index;
                const maxRpm = k.isGroq ? '30' : '15';
                div.innerHTML =
                  '<div>' +
                    '<div style="font-size: 12px; font-weight: 700; color: white; display: flex; align-items: center; gap: 6px;">' +
                      '<span style="width: 7px; height: 7px; border-radius: 50%; background: ' + statusColor + '; display: inline-block;"></span>' +
                      tag + ' <span style="font-size: 10px; color: var(--text-muted); font-family: monospace;">(' + k.keyMasked + ')</span>' +
                    '</div>' +
                    '<div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">' +
                      'RPM: ' + k.rpmCount + '/' + maxRpm + ' • Total: ' + k.totalSuccess +
                    '</div>' +
                  '</div>' +
                  '<div class="studio-count-badge" style="color: ' + statusColor + '; font-size: 10px; text-transform: uppercase;">' + k.status + '</div>';
                aiContainer.appendChild(div);
              });
            } else {
              aiContainer.innerHTML = '<div style="grid-column: 1 / -1; padding: 14px; background: rgba(245, 158, 11, 0.08); border: 1px dashed rgba(245, 158, 11, 0.35); border-radius: 8px; text-align: center; color: #F59E0B; font-size: 12px; font-weight: 600;">' +
                '⚠️ No AI Keys Configured in Railway Variables.<br><span style="font-size:11px; opacity:0.8; font-weight:400;">Add <code>GEMINI_API_KEYS</code> or <code>GROQ_API_KEY</code> in Railway Dashboard &rarr; Variables.</span>' +
                '</div>';
            }
          }
        }

        const tbody = document.getElementById('categories-tbody');
        const cats = d.categories || [];
        safeSetText('categories-count-badge', cats.length + ' Published Shelves');

        if (tbody) {
          tbody.innerHTML = '';
          cats.forEach(function(c) {
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

          const fullyEnriched = s.fullyEnrichedMovies !== undefined ? s.fullyEnrichedMovies : Math.max(0, (s.totalMovies || 0) - (s.gapMoviesCount || 0));
          const gapInfo = s.gapMoviesCount > 0 ? ' • ' + s.gapMoviesCount.toLocaleString() + ' gaps pending' : ' • 100% Saturated';
          safeSetText('scanner-progress-label', (fullyEnriched || 0).toLocaleString() + ' / ' + (s.totalMovies || 0).toLocaleString() + ' (' + s.completionPct + '%)' + gapInfo);
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
        const endpoint = autoScannerRunning ? '/api/scan/pause' : '/api/scan/start';
        const res = await fetch(endpoint, { method: 'POST' });
        const result = await res.json();
        window.showToast(result.message || 'Auto-scanner state updated');
        setTimeout(window.fetchScannerStatus, 300);
      } catch (err) {
        window.showToast('❌ Failed: ' + err.message);
      }
    };

    window.triggerBatchScan = async function(limit) {
      window.showToast('⚡ Triggering instant batch scan of ' + limit + ' movies...');
      try {
        const res = await fetch('/api/scan/batch?limit=' + limit, { method: 'POST' });
        const result = await res.json();
        window.showToast(result.message || 'Batch scan completed!');
        setTimeout(window.fetchMetrics, 500);
        setTimeout(window.fetchScannerStatus, 500);
      } catch (err) {
        window.showToast('❌ Batch scan failed: ' + err.message);
      }
    };

    window.triggerMultiSourceSync = async function() {
      window.showToast('🌐 Initializing Multi-Source Knowledge Graph Sync...');
      try {
        const res = await fetch('/api/sync/streaming-sources', { method: 'POST' });
        const result = await res.json();
        window.showToast('✅ ' + (result.message || 'Sync successful!'));
        setTimeout(window.fetchMetrics, 500);
      } catch (err) {
        window.showToast('❌ Sync failed: ' + err.message);
      }
    };

    window.triggerMovieSync = async function(batch) {
      window.showToast('🎬 Categorizing next ' + batch + ' movies...');
      try {
        const res = await fetch('/api/sync/movies?batch=' + batch, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          window.showToast('✅ ' + (data.result?.message || 'Updated titles'));
          setTimeout(window.fetchMetrics, 500);
        } else {
          window.showToast('❌ Sync failed: ' + data.error);
        }
      } catch (err) {
        window.showToast('❌ Sync error: ' + err.message);
      }
    };

    window.triggerResetAndRescan = async function() {
      if (!confirm('⚠️ WARNING: This will reset all enrichment timestamps across your ENTIRE catalogue (10,244 titles) and restart 24/7 multi-source enrichment from scratch.\\n\\nDo you wish to proceed?')) {
        return;
      }

      window.showToast('🔄 Resetting catalogue timestamps and starting fresh scan...');
      try {
        const res = await fetch('/api/scan/reset', { method: 'POST' });
        const result = await res.json();
        window.showToast('🚀 ' + (result.message || 'Rescan started!'));
        setTimeout(window.fetchMetrics, 500);
        setTimeout(window.fetchScannerStatus, 500);
      } catch (err) {
        window.showToast('❌ Reset failed: ' + err.message);
      }
    };

    window.triggerRegenerateCategories = async function() {
      window.showToast('📁 Evaluating 40+ dynamic categories against database...');
      try {
        const res = await fetch('/api/sync/categories', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          window.showToast('✅ Regenerated ' + data.result.approved + ' categories (' + data.result.skipped + ' skipped)');
          setTimeout(window.fetchMetrics, 500);
        } else {
          window.showToast('❌ Category sync failed: ' + data.error);
        }
      } catch (err) {
        window.showToast('❌ Category error: ' + err.message);
      }
    };

    window.triggerAiTest = async function() {
      window.showToast('🤖 Testing Gemini AI Pool (Model: gemini-3.1-flash-lite)...');
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

    window.triggerAiCategoryDiscovery = async function() {
      window.showToast('🧠 AI analyzing catalogue trends & discovering dynamic home shelves...');
      try {
        const res = await fetch('/api/ai/categories/discover', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          window.showToast('✨ Published ' + data.discoveredCount + ' dynamic AI home shelves in realtime!');
          setTimeout(window.fetchMetrics, 1000);
        } else {
          window.showToast('⚠️ AI Discovery: ' + (data.message || 'No shelves published'));
        }
      } catch (err) {
        window.showToast('❌ AI Discovery failed: ' + err.message);
      }
    };

    // ── Dynamic Gemini Model Selector Controller ──
    window.changeGeminiModel = async function(modelName) {
      if (!modelName) return;
      try {
        window.showToast('⏳ Switching active Gemini model to: ' + modelName + '...');
        const res = await fetch('/api/ai/model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName }),
        });
        const data = await res.json();
        if (data.success) {
          window.showToast('✅ ' + (data.message || 'Gemini model switched!'));
          const descBadge = document.getElementById('gemini-model-desc-badge');
          if (descBadge && data.description) {
            descBadge.innerText = data.description;
          }
          setTimeout(window.fetchMetrics, 300);
        } else {
          window.showToast('❌ Model switch error: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        window.showToast('❌ Network error switching Gemini model');
      }
    };

    // ── AI Enriched Movies Inspector State & Functions ──
    let enrichedCurrentEngine = 'all';
    let enrichedCurrentSearch = '';
    let enrichedCurrentOffset = 0;
    const enrichedLimit = 24;
    let enrichedLoadedData = [];

    window.filterEnrichedEngine = function(engine) {
      enrichedCurrentEngine = engine;
      enrichedCurrentOffset = 0;
      
      const bAll = document.getElementById('filter-engine-all');
      const bGroq = document.getElementById('filter-engine-groq');
      const bGoogle = document.getElementById('filter-engine-google');
      if (bAll) bAll.style.background = engine === 'all' ? 'rgba(255,255,255,0.15)' : 'transparent';
      if (bGroq) bGroq.style.background = engine === 'groq' ? 'rgba(16,185,129,0.2)' : 'transparent';
      if (bGoogle) bGoogle.style.background = engine === 'google' ? 'rgba(96,165,250,0.2)' : 'transparent';
      
      window.loadEnrichedMovies();
    };

    let searchTimer = null;
    window.debounceEnrichedSearch = function(val) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        enrichedCurrentSearch = val.trim();
        enrichedCurrentOffset = 0;
        window.loadEnrichedMovies();
      }, 350);
    };

    window.changeEnrichedPage = function(delta) {
      enrichedCurrentOffset = Math.max(0, enrichedCurrentOffset + (delta * enrichedLimit));
      window.loadEnrichedMovies();
    };

    window.loadEnrichedMovies = async function() {
      const container = document.getElementById('enriched-movies-container');
      const badge = document.getElementById('enriched-total-badge');
      const info = document.getElementById('enriched-pagination-info');
      const btnPrev = document.getElementById('btn-enriched-prev');
      const btnNext = document.getElementById('btn-enriched-next');

      if (!container) return;

      try {
        const url = '/api/ai/enriched-movies?engine=' + encodeURIComponent(enrichedCurrentEngine) + '&search=' + encodeURIComponent(enrichedCurrentSearch) + '&limit=' + enrichedLimit + '&offset=' + enrichedCurrentOffset;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) {
          container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-muted);">Failed to load movies: ' + data.error + '</div>';
          return;
        }

        enrichedLoadedData = data.movies || [];
        const total = data.total || 0;
        if (badge) badge.innerText = total.toLocaleString() + ' Enriched Titles';

        if (info) {
          const from = total === 0 ? 0 : enrichedCurrentOffset + 1;
          const to = Math.min(enrichedCurrentOffset + enrichedLoadedData.length, total);
          info.innerText = 'Showing ' + from + '-' + to + ' of ' + total.toLocaleString() + ' enriched movies';
        }

        if (btnPrev) btnPrev.disabled = enrichedCurrentOffset === 0;
        if (btnNext) btnNext.disabled = enrichedCurrentOffset + enrichedLoadedData.length >= total;

        if (enrichedLoadedData.length === 0) {
          container.innerHTML = 
            '<div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px dashed var(--border-subtle);">' +
              '<div style="font-size: 32px; margin-bottom: 8px;">🎬</div>' +
              '<h3 style="font-size: 14px; font-weight: 700; color: var(--text-primary);">No enriched movies found matching criteria</h3>' +
              '<p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Launch the AI Gap-Scan or click "Test AI Enrichment" to populate movie metadata.</p>' +
            '</div>';
          return;
        }

        container.innerHTML = enrichedLoadedData.map(function(m, idx) {
          const isGroq = (m.ai_model || '').toLowerCase().indexOf('groq') !== -1;
          const isGoogle = (m.ai_model || '').toLowerCase().indexOf('google') !== -1 || (m.ai_model || '').toLowerCase().indexOf('gemini') !== -1;
          
          const modelBadge = isGroq
            ? '<span style="background: rgba(16,185,129,0.18); color: #10B981; border: 1px solid rgba(16,185,129,0.35); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">🦙 ' + m.ai_model + '</span>'
            : isGoogle
            ? '<span style="background: rgba(59,130,246,0.18); color: #60A5FA; border: 1px solid rgba(59,130,246,0.35); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">🤖 ' + m.ai_model + '</span>'
            : '<span style="background: rgba(255,255,255,0.08); color: var(--text-secondary); font-size: 10px; padding: 2px 6px; border-radius: 6px;">✨ AI Enriched</span>';

          const posterSrc = m.poster_path ? 'https://image.tmdb.org/t/p/w185' + m.poster_path : 'https://placehold.co/185x278/161b22/94a3b8?text=No+Poster';

          const studios = Array.isArray(m.studios_json) ? m.studios_json.slice(0, 3) : [];
          const studioBadges = studios.map(function(s) {
            return '<span style="background: rgba(99,102,241,0.15); color: #A5B4FC; border: 1px solid rgba(99,102,241,0.25); font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block;">🏢 ' + (s.name || s) + '</span>';
          }).join(' ');

          const keywords = Array.isArray(m.keywords_json) ? m.keywords_json.slice(0, 4) : [];
          const keywordBadges = keywords.map(function(k) {
            return '<span style="background: rgba(255,255,255,0.05); color: #CBD5E1; border: 1px solid rgba(255,255,255,0.08); font-size: 10px; padding: 2px 6px; border-radius: 4px; display: inline-block;">🏷️ ' + (k.name || k) + '</span>';
          }).join(' ');

          const taglineHtml = m.tagline_ar ? '<div style="font-size: 11px; color: #F59E0B; font-style: italic; direction: rtl; margin-bottom: 4px; padding: 3px 6px; background: rgba(245,158,11,0.08); border-radius: 4px;">&quot;' + m.tagline_ar + '&quot;</div>' : '';

          return '<div style="background: rgba(22,27,34,0.9); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; position: relative;">' +
              '<div>' +
                '<div style="display: flex; gap: 12px; margin-bottom: 12px;">' +
                  '<img src="' + posterSrc + '" alt="' + (m.title || '') + '" style="width: 54px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #0B0E14; border: 1px solid rgba(255,255,255,0.06);">' +
                  '<div style="flex: 1; min-width: 0;">' +
                    '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 4px;">' +
                      '<h4 style="font-size: 13px; font-weight: 800; color: white; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (m.title || 'Untitled') + '</h4>' +
                      '<span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">' + (m.year || '') + '</span>' +
                    '</div>' +
                    '<div style="margin-bottom: 6px;">' + modelBadge + '</div>' +
                    '<div style="font-size: 10px; color: var(--text-muted);">ID: #' + m.id + ' • Pop: ' + Math.round(m.popularity || 0) + '</div>' +
                  '</div>' +
                '</div>' +

                '<div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; margin-bottom: 10px;">' +
                  '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">' +
                    '<span style="font-size: 10px; font-weight: 700; color: #10B981; text-transform: uppercase;">🇸🇦 Arabic Localization</span>' +
                    '<strong style="font-size: 12px; color: white; direction: rtl;">' + (m.title_ar || 'غير مترجم') + '</strong>' +
                  '</div>' +
                  taglineHtml +
                  '<p style="font-size: 11px; color: var(--text-secondary); direction: rtl; line-height: 1.4; max-height: 60px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">' +
                    (m.overview_ar || 'لا يوجد وصف عربي متاح.') +
                  '</p>' +
                '</div>' +

                '<div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">' +
                  (studios.length > 0 ? '<div style="display: flex; flex-wrap: wrap; gap: 4px;">' + studioBadges + '</div>' : '') +
                  (keywords.length > 0 ? '<div style="display: flex; flex-wrap: wrap; gap: 4px;">' + keywordBadges + '</div>' : '') +
                '</div>' +
              '</div>' +

              '<div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">' +
                '<span style="font-size: 10px; color: var(--text-muted);">Enriched: ' + (m.enriched_at ? new Date(m.enriched_at).toLocaleTimeString() : 'Recently') + '</span>' +
                '<button class="btn btn-secondary" style="padding: 3px 8px; font-size: 10px;" onclick="inspectMovieJson(' + idx + ')">🔍 View Raw JSON</button>' +
              '</div>' +
            '</div>';
        }).join('');
      } catch (err) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #EF4444;">Error fetching enriched movies: ' + err.message + '</div>';
      }
    };

    window.inspectMovieJson = function(idx) {
      const movie = enrichedLoadedData[idx];
      if (!movie) return;
      document.getElementById('json-modal-title').innerText = '🔍 #' + movie.id + ' - ' + movie.title;
      document.getElementById('json-modal-content').innerText = JSON.stringify(movie, null, 2);
      document.getElementById('json-modal').classList.add('active');
    };

    window.closeJsonModal = function() {
      document.getElementById('json-modal').classList.remove('active');
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
    window.triggerAiCategoryDiscovery = window.triggerAiCategoryDiscovery;
    window.openCreateModal = window.openCreateModal;
    window.closeCreateModal = window.closeCreateModal;
    window.switchTab = window.switchTab;
    window.toggleSection = window.toggleSection;
    window.expandAllSections = window.expandAllSections;
    window.collapseAllSections = window.collapseAllSections;
    window.changeGeminiModel = window.changeGeminiModel;

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
    var triggerAiCategoryDiscovery = window.triggerAiCategoryDiscovery;
    var openCreateModal = window.openCreateModal;
    var closeCreateModal = window.closeCreateModal;
    var applyPreset = window.applyPreset;
    var submitCreateCategory = window.submitCreateCategory;
    var filterEnrichedEngine = window.filterEnrichedEngine;
    var debounceEnrichedSearch = window.debounceEnrichedSearch;
    var changeEnrichedPage = window.changeEnrichedPage;
    var loadEnrichedMovies = window.loadEnrichedMovies;
    var inspectMovieJson = window.inspectMovieJson;
    var closeJsonModal = window.closeJsonModal;
    var switchTab = window.switchTab;
    var toggleSection = window.toggleSection;
    var expandAllSections = window.expandAllSections;
    var collapseAllSections = window.collapseAllSections;
    var changeGeminiModel = window.changeGeminiModel;

    // Restore saved active tab (if any)
    const savedTab = localStorage.getItem('teraflix_active_tab') || 'operations';
    window.switchTab(savedTab);

    // Initial load + auto-refresh
    window.fetchMetrics();
    window.fetchScannerStatus();
    window.loadEnrichedMovies();
    setInterval(window.fetchMetrics, 10000);
    setInterval(window.fetchScannerStatus, 4000);
    setInterval(window.loadEnrichedMovies, 12000);
  </script>
</body>
</html>`;
}
