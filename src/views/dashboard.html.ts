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
      max-height: 420px;
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
      min-width: 600px;
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
      z-index: 100;
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
            <p class="brand-subtitle">TMDB Backend Health & Categorization</p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <div class="status-badge">
          <div class="status-dot"></div>
          <span id="server-status-text">Server Active</span>
        </div>
        <button class="btn btn-secondary" onclick="fetchMetrics()">🔄 Refresh</button>
        <button class="btn btn-secondary" onclick="triggerRegenerateCategories()">📁 Categories</button>
        <button class="btn btn-primary" style="grid-column: span 2;" onclick="triggerMovieSync()">⚡ Trigger Enrichment (100)</button>
      </div>
    </header>

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

    <!-- Major Studios Breakdown Grid -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-title-row">
        <div>
          <h2 style="font-size: 15px; font-weight: 800;">Studio Hub Live Counters</h2>
          <p class="card-desc">Available titles for each studio watermark card</p>
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
            </tr>
          </thead>
          <tbody id="categories-tbody">
            <!-- Injected via JavaScript -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="toast">Notification</div>

  <script>
    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    async function fetchMetrics() {
      try {
        const res = await fetch('/api/metrics');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        renderData(data);
      } catch (err) {
        console.error('Fetch error:', err);
        showToast('⚠️ Failed to load metrics: ' + err.message);
      }
    }

    function renderData(d) {
      // 1. Top Summary
      document.getElementById('val-total-movies').innerText = (d.catalogue.totalMovies || 0).toLocaleString();
      document.getElementById('val-arabic-total').innerText = (d.catalogue.withAnyArabic || 0).toLocaleString();
      document.getElementById('prog-arabic').style.width = (d.catalogue.arabicCoveragePct || 0) + '%';
      document.getElementById('val-arabic-pct').innerText = d.catalogue.arabicCoveragePct + '% Translated';
      document.getElementById('val-studios-enriched').innerText = (d.catalogue.withStudios || 0).toLocaleString();
      document.getElementById('val-uptime').innerText = d.server.uptimeFormatted;
      document.getElementById('val-memory').innerText = 'RAM: ' + d.server.memoryUsedMB + 'MB / ' + d.server.memoryTotalMB + 'MB';

      // 2. Arabic Breakdown
      const tot = d.catalogue.totalMovies || 1;
      document.getElementById('val-arabic-unique-label').innerText = (d.catalogue.withAnyArabic || 0).toLocaleString() + ' Titles';
      
      const tAr = d.catalogue.withArabicTitle || 0;
      document.getElementById('val-title-ar').innerText = tAr.toLocaleString() + ' (' + ((tAr / tot) * 100).toFixed(1) + '%)';
      document.getElementById('prog-title-ar').style.width = ((tAr / tot) * 100) + '%';

      const oAr = d.catalogue.withArabicOverview || 0;
      document.getElementById('val-overview-ar').innerText = oAr.toLocaleString() + ' (' + ((oAr / tot) * 100).toFixed(1) + '%)';
      document.getElementById('prog-overview-ar').style.width = ((oAr / tot) * 100) + '%';

      const tagAr = d.catalogue.withArabicTagline || 0;
      document.getElementById('val-tagline-ar').innerText = tagAr.toLocaleString() + ' (' + ((tagAr / tot) * 100).toFixed(1) + '%)';
      document.getElementById('prog-tagline-ar').style.width = ((tagAr / tot) * 100) + '%';

      // 3. Era Breakdown
      const y26 = d.recentReleases.y2026;
      document.getElementById('val-y2026').innerText = y26.translated + ' / ' + y26.total + ' (' + y26.pct + '%)';
      document.getElementById('prog-y2026').style.width = y26.pct + '%';

      const y25 = d.recentReleases.y2025;
      document.getElementById('val-y2025').innerText = y25.translated + ' / ' + y25.total + ' (' + y25.pct + '%)';
      document.getElementById('prog-y2025').style.width = y25.pct + '%';

      const mod = d.recentReleases.modernEra;
      document.getElementById('val-modern').innerText = mod.translated + ' / ' + mod.total + ' (' + mod.pct + '%)';
      document.getElementById('prog-modern').style.width = mod.pct + '%';

      // 4. Studios
      const studiosContainer = document.getElementById('studios-container');
      studiosContainer.innerHTML = '';
      (d.studios || []).forEach(s => {
        const div = document.createElement('div');
        div.className = 'studio-pill';
        div.innerHTML = \`
          <div>
            <div class="studio-name" style="display:flex; align-items:center; gap:5px;">
              <span style="width:6px; height:6px; border-radius:50%; background:\${s.color}; display:inline-block;"></span>
              \${s.name}
            </div>
            <div class="studio-name-ar">\${s.nameAr}</div>
          </div>
          <div class="studio-count-badge" style="color: \${s.count >= 6 ? '#10B981' : '#F59E0B'}">\${s.count}</div>
        \`;
        studiosContainer.appendChild(div);
      });

      // 5. Categories Table
      const tbody = document.getElementById('categories-tbody');
      tbody.innerHTML = '';
      const cats = d.categories || [];
      document.getElementById('categories-count-badge').innerText = cats.length + ' Published Shelves';

      cats.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><strong>#\${c.sort_order}</strong></td>
          <td style="font-weight:600; color:white;">\${c.title}</td>
          <td style="direction:rtl; text-align:right;">\${c.title_ar || '-'}</td>
          <td><span style="text-transform:uppercase; font-size:10px; opacity:0.8;">\${c.category_type}</span></td>
          <td><strong style="color:#10B981;">\${(c.movie_count || 0).toLocaleString()} titles</strong></td>
          <td><span class="pill-published">Live</span></td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function triggerMovieSync() {
      showToast('⚡ Triggering background enrichment batch...');
      try {
        const res = await fetch('/api/sync/movies?batch=100', { method: 'POST' });
        const result = await res.json();
        showToast('✓ ' + (result.result?.message || 'Batch executed successfully!'));
        setTimeout(fetchMetrics, 1200);
      } catch (err) {
        showToast('❌ Sync failed: ' + err.message);
      }
    }

    async function triggerRegenerateCategories() {
      showToast('🔄 Regenerating home categories...');
      try {
        const res = await fetch('/api/sync/categories', { method: 'POST' });
        const result = await res.json();
        showToast('✓ Published ' + (result.result?.published || 0) + ' home categories!');
        setTimeout(fetchMetrics, 1200);
      } catch (err) {
        showToast('❌ Failed: ' + err.message);
      }
    }

    // Initial load + auto-refresh every 12 seconds
    fetchMetrics();
    setInterval(fetchMetrics, 12000);
  </script>
</body>
</html>`;
}
