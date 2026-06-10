(function () {
  'use strict';

  const STORAGE_KEY = 'groupBuyData';

  var PROGRESS_ICONS = {
    '收單中': '<svg class="progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    '等待出荷': '<svg class="progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>',
    '集運中': '<svg class="progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h5l3 3v5h-8V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    '抵台': '<svg class="progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    '已完成出貨': '<svg class="progress-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>'
  };
  function getProgressIcon(name) {
    return PROGRESS_ICONS[name] || PROGRESS_ICONS['已完成出貨'];
  }
  const DEFAULT_DATA = [
    {
      id: '1',
      title: '日本直送草莓禮盒',
      status: 'upcoming',
      badge: 'new',
      imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
      startDate: '2025-03-10',
      endDate: '2025-03-20',
      progress: [{ name: '收單中', done: false }, { name: '等待出荷', done: false }, { name: '集運中', done: false }, { name: '抵台', done: false }, { name: '已完成出貨', done: false }],
      countdownTo: '2025-03-10T10:00:00'
    },
    {
      id: '2',
      title: '韓國美妝熱銷組',
      status: 'ongoing',
      badge: 'hot',
      imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
      startDate: '2025-02-28',
      endDate: '2025-03-15',
      progress: [{ name: '收單中', done: true }, { name: '等待出荷', done: true }, { name: '集運中', done: false }, { name: '抵台', done: false }, { name: '已完成出貨', done: false }],
      registeredCount: 10,
      countdownTo: '2025-03-18T18:00:00'
    },
    {
      id: '3',
      title: '春日零食大賞',
      status: 'ongoing',
      badge: 'recommend',
      imageUrl: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400',
      startDate: '2025-03-01',
      endDate: '2025-03-12',
      progress: [{ name: '收單中', done: true }, { name: '等待出荷', done: false }, { name: '集運中', done: false }, { name: '抵台', done: false }, { name: '已完成出貨', done: false }],
      registeredCount: 24,
      countdownTo: '2025-03-20T12:00:00'
    },
    {
      id: '4',
      title: '冬季保暖小物團',
      status: 'ended',
      badge: 'hot',
      imageUrl: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400',
      startDate: '2025-01-05',
      endDate: '2025-01-20',
      progress: [{ name: '收單中', done: true }, { name: '等待出荷', done: true }, { name: '集運中', done: true }, { name: '抵台', done: true }, { name: '已完成出貨', done: true }],
      countdownTo: null
    },
    {
      id: '5',
      title: '初春限定和菓子',
      status: 'upcoming',
      badge: 'recommend',
      imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
      startDate: '2025-03-15',
      endDate: '2025-03-25',
      progress: [{ name: '收單中', done: false }, { name: '等待出荷', done: false }, { name: '集運中', done: false }, { name: '抵台', done: false }, { name: '已完成出貨', done: false }],
      countdownTo: '2025-03-15T09:00:00'
    }
  ];

  let allProducts = [];
  let currentFilter = 'upcoming';
  let currentTheme = 'dawn';
  let currentPage = 1;
  const PER_PAGE = 9;

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) allProducts = parsed;
        else allProducts = [...DEFAULT_DATA];
      } else {
        allProducts = [...DEFAULT_DATA];
      }
    } catch (_) {
      allProducts = [...DEFAULT_DATA];
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts));
    } catch (_) {}
  }

  // 各分類內依「開團日」由新到舊排列（最新在上）
  // 開團日「中午 12:00」起才移到正在開團；結團日後為已結團
  // 支援日期格式 2026-03-05 或 2026/03/05（試算表可能存成斜線或 Excel 數字）
  function parseLocalDateOnly(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    var s = dateStr.trim();
    var datePart = s.indexOf('T') >= 0 ? s.split('T')[0] : s;
    var parts = datePart.split(/[-/]/);
    if (parts.length < 3) return null;
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1, d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return { year: y, month: m, date: d, value: y * 10000 + m * 100 + d };
  }
  /** 將欄位值轉成 YYYY-MM-DD（支援字串 -/ 與 Excel 序列數字），供倒數目標用 */
  function toDateOnlyString(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') {
      var d = new Date((val - 25569) * 86400 * 1000);
      if (isNaN(d.getTime())) return null;
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    var s = String(val).trim();
    if (!s) return null;
    var datePart = s.indexOf('T') >= 0 ? s.split('T')[0] : s;
    var parts = datePart.split(/[-/]/);
    if (parts.length < 3) return null;
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  /** 取得「開團時刻」：開團日已過則一律視為已開團；否則有填倒數目標時間則以該時刻為準，沒填則為開團日中午 12:00 */
  function getOpeningMoment(p) {
    var ct = p.countdownTo;
    if (ct != null && String(ct).trim() !== '') {
      // 臨時開團：以倒數目標時間為最高優先（即使 startDate 因試算表時區/格式偏移導致「落在昨天」）
      var d = new Date(ct);
      if (!isNaN(d.getTime())) return d;
    }

    // 沒有 countdownTo 時，才用 startDate 的中午 12:00 當作開團時刻
    var startStr = toDateOnlyString(p.startDate);
    if (!startStr) return null;
    var start = parseLocalDateOnly(startStr);
    if (!start) return null;
    var startNoon = new Date(start.year, start.month, start.date, 12, 0, 0, 0);

    var now = new Date();
    var todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();
    var todayValue = todayY * 10000 + todayM * 100 + todayD;
    if (todayValue > start.value) return startNoon;

    return startNoon;
  }

  function resolveStatusByDate(p) {
    var now = new Date();
    var todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate();
    var todayValue = todayY * 10000 + todayM * 100 + todayD;

    // 以「結團日是否已過」先判斷 ended
    var endDateStr = toDateOnlyString(p.endDate);
    if (endDateStr) {
      var end = parseLocalDateOnly(endDateStr);
      if (end && todayValue > end.value) return 'ended';
    } else {
      // 若沒有結團日，才退回使用來源狀態
      var s0 = String(p.status || '').trim();
      if (s0 === 'ended' || s0 === '已結團') return 'ended';
    }

    // 再以「開團時刻」判斷是否 upcoming（支援倒數目標 countdownTo）
    var openingMoment = getOpeningMoment(p);
    if (openingMoment && now < openingMoment) return 'upcoming';

    // 其餘情況都算正在開團
    return 'ongoing';
  }

  function getFiltered() {
    var list = allProducts.filter(function (p) { return resolveStatusByDate(p) === currentFilter; });
    list = list.slice().sort(function (a, b) {
      var da = a.startDate || '';
      var db = b.startDate || '';
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      var ta = new Date(da + (da.indexOf('T') >= 0 ? '' : 'T00:00:00')).getTime();
      var tb = new Date(db + (db.indexOf('T') >= 0 ? '' : 'T00:00:00')).getTime();
      return isNaN(tb) - isNaN(ta) || tb - ta; // 開團日較新（較晚）的排上面
    });
    return list;
  }

  function formatDate(str) {
    if (!str) return '—';
    var s = String(str).trim();
    var d = s.indexOf('T') >= 0 ? new Date(s) : new Date(s + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  }

  function getCountdown(toIso) {
    if (!toIso) return null;
    const to = new Date(toIso);
    if (isNaN(to.getTime())) return null;
    const now = new Date();
    const diff = to - now;
    if (diff <= 0) return { text: '已到期', done: true };
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((diff % (60 * 1000)) / 1000);
    const parts = [];
    if (days) parts.push(days + ' 天');
    parts.push(String(hours).padStart(2, '0') + ' 時');
    parts.push(String(mins).padStart(2, '0') + ' 分');
    parts.push(String(secs).padStart(2, '0') + ' 秒');
    return { text: parts.join(' '), done: false };
  }

  function renderCards() {
    const grid = document.getElementById('cardsGrid');
    const empty = document.getElementById('emptyState');
    const paginationWrap = document.getElementById('paginationWrap');
    if (!grid || !empty) return;

    const fullList = getFiltered();
    const totalPages = Math.max(1, Math.ceil(fullList.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PER_PAGE;
    const list = fullList.slice(start, start + PER_PAGE);

    grid.innerHTML = '';

    if (fullList.length === 0) {
      empty.hidden = false;
      if (paginationWrap) { paginationWrap.innerHTML = ''; paginationWrap.hidden = true; }
      return;
    }
    empty.hidden = true;
    if (paginationWrap) paginationWrap.hidden = false;

    list.forEach(function (p) {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.dataset.id = p.id;
      if (p.expectedShipDate != null && String(p.expectedShipDate).trim() !== '') {
        card.dataset.expectedShipDate = String(p.expectedShipDate).trim();
      } else {
        card.dataset.expectedShipDate = '';
      }

      const badgeClass = (p.badge === 'new' ? 'new' : p.badge === 'hot' ? 'hot' : p.badge === 'ichibansho' ? 'ichibansho' : 'recommend');
      const badgeText = (p.badge === 'new' ? '新品' : p.badge === 'hot' ? '熱銷' : p.badge === 'ichibansho' ? '一番賞' : '推薦');

      let progressHtml = '';
      if (p.progress && p.progress.length) {
        var currentIdx = (p.status === 'ended') ? -1 : p.progress.findIndex(function (n) { return !n.done; });
        progressHtml = '<div class="progress-steps">' + p.progress.map(function (node, i) {
          var c = node.done ? 'passed' : (i === currentIdx) ? 'current' : 'pending';
          var icon = getProgressIcon(node.name);
          return '<div class="progress-node ' + c + '"><span class="progress-node-label">' + escapeHtml(node.name) + '</span><span class="progress-node-icon">' + icon + '<span class="progress-node-light" aria-hidden="true"></span></span></div>';
        }).join('') + '</div>';
      }

      var statusForCountdown = resolveStatusByDate(p);
      var countdownParts = [];
      if (statusForCountdown === 'upcoming') {
        var startDateStr = toDateOnlyString(p.startDate);
        var startTarget = p.countdownTo || (startDateStr ? startDateStr + 'T12:00:00' : null);
        if (startTarget) {
          var cdStart = getCountdown(startTarget);
          if (cdStart && !cdStart.done) {
            countdownParts.push('<div class="countdown" data-countdown-type="start">開團倒數：<span>' + cdStart.text + '</span></div>');
          } else if (cdStart && cdStart.done) {
            countdownParts.push('<div class="countdown countdown-done" data-countdown-type="start">開團已到</div>');
          }
        }
      } else if (statusForCountdown === 'ongoing') {
        var endDateStr = toDateOnlyString(p.endDate);
        var endTarget = endDateStr ? endDateStr + 'T23:59:59' : null;
        if (endTarget) {
          var cdEnd = getCountdown(endTarget);
          if (cdEnd && !cdEnd.done) {
            countdownParts.push('<div class="countdown" data-countdown-type="end">結團時間：<span>' + cdEnd.text + '</span></div>');
          } else if (cdEnd && cdEnd.done) {
            // 即使倒數到期，也維持顯示「結團時間」這行，讓正在開團卡片仍看得到結團時間倒數
            countdownParts.push('<div class="countdown countdown-done" data-countdown-type="end">結團時間：<span>' + cdEnd.text + '</span></div>');
          }
        }
      } else {
        countdownParts.push('<div class="countdown countdown-done">已結團</div>');
      }
      // 只在「已結團」頁顯示出貨倒數，避免正在開團/即將開團也跳出出貨倒數造成混淆
      if (statusForCountdown === 'ended') {
        var shipTarget = getShipCountdownTarget(p);
        if (shipTarget) {
          var cdShip = getCountdown(shipTarget);
          if (cdShip && !cdShip.done) {
            countdownParts.push('<div class="countdown" data-countdown-type="ship">出貨倒數：<span>' + cdShip.text + '</span></div>');
          } else if (cdShip && cdShip.done) {
            countdownParts.push('<div class="countdown countdown-done" data-countdown-type="ship">已過預計出貨日</div>');
          }
        }
      }
      var countdownHtml = countdownParts.join('');

      var imageHtml = '';
      if (p.imageUrl && p.imageUrl.trim()) {
        var safeUrl = escapeHtml(p.imageUrl.trim());
        imageHtml = '<div class="card-image-wrap"><img src="' + safeUrl + '" alt="" class="card-image" loading="lazy" /></div>';
      }

      var registeredHtml = '';
      if (p.registeredCount != null && p.registeredCount > 0) {
        registeredHtml = '<div class="card-registered">共 ' + String(p.registeredCount) + ' 位登記預購</div>';
      }

      card.innerHTML =
        '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
        imageHtml +
        '<h3 class="card-title">' + escapeHtml(p.title) + '</h3>' +
        '<div class="card-dates">' +
        '<span>開團 ' + formatDate(p.startDate) + '</span>' +
        '<span>結團 ' + formatDate(p.endDate) + '</span>' +
        '</div>' +
        registeredHtml +
        '<div class="progress-wrap">' +
        '<div class="progress-label">進度</div>' +
        progressHtml +
        countdownHtml +
        '</div>';

      grid.appendChild(card);
    });

    if (paginationWrap && fullList.length > 0) {
      var nav = document.createElement('div');
      nav.className = 'pagination';
      // 桌機與手機共用：第 1 頁只顯示右箭頭 ›，第 2 頁起顯示左箭頭 ‹，未到最後一頁時右邊也顯示 ›
      var showPrev = currentPage > 1;
      var showNext = currentPage < totalPages;
      var parts = [];
      if (showPrev) {
        parts.push('<button type="button" class="pagination-arrow pagination-prev" aria-label="上一頁"><svg class="pagination-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>');
      }
      for (var i = 1; i <= totalPages; i++) {
        var isCurrent = i === currentPage;
        parts.push('<button type="button" class="pagination-btn' + (isCurrent ? ' active' : '') + '" data-page="' + i + '" aria-current="' + (isCurrent ? 'true' : 'false') + '" aria-label="第' + i + '頁">' + i + '</button>');
      }
      if (showNext) {
        parts.push('<button type="button" class="pagination-arrow pagination-next" aria-label="下一頁"><svg class="pagination-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>');
      }
      nav.innerHTML = parts.join('');
      paginationWrap.innerHTML = '';
      paginationWrap.appendChild(nav);
      paginationWrap.hidden = false;
      nav.querySelectorAll('.pagination-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var page = parseInt(this.dataset.page, 10);
          if (page === currentPage) return;
          currentPage = page;
          renderCards();
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      var prevBtn = nav.querySelector('.pagination-prev');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          if (currentPage <= 1) return;
          currentPage--;
          renderCards();
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      var nextBtn = nav.querySelector('.pagination-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          if (currentPage >= totalPages) return;
          currentPage++;
          renderCards();
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } else if (paginationWrap) {
      paginationWrap.innerHTML = '';
      paginationWrap.hidden = true;
    }
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const filter = this.dataset.filter;
        if (filter === currentFilter) return;
        currentFilter = filter;
        currentPage = 1;
        document.querySelectorAll('.tab').forEach(function (b) {
          b.classList.toggle('active', b.dataset.filter === filter);
          b.setAttribute('aria-selected', b.dataset.filter === filter ? 'true' : 'false');
        });
        renderCards();
      });
    });
  }

  function bindTheme() {
    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const theme = this.dataset.theme;
        if (theme === currentTheme) return;
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.theme === theme);
          b.setAttribute('aria-pressed', b.dataset.theme === theme ? 'true' : 'false');
        });
        try {
          localStorage.setItem('groupBuyTheme', theme);
        } catch (_) {}
      });
    });
  }

  function getShipCountdownTarget(p) {
    if (!p) return null;
    var raw = p.expectedShipDate;
    if (raw === undefined || raw === null || String(raw).trim() === '') return null;
    raw = String(raw).trim();
    var base = raw.indexOf('T') >= 0 ? raw : (raw.indexOf('-') >= 0 ? raw + 'T23:59:59' : null);
    if (base === null && /^\d+$/.test(raw)) {
      var serial = parseInt(raw, 10);
      if (!isNaN(serial)) {
        var d0 = new Date((serial - 25569) * 86400 * 1000);
        if (!isNaN(d0.getTime())) base = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0') + 'T23:59:59';
      }
    }
    if (!base) return null;
    var d = new Date(base);
    if (isNaN(d.getTime())) return null;
    var delay = parseInt(p.shipDelayDays, 10);
    if (!isNaN(delay) && delay > 0) d.setDate(d.getDate() + delay);
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day + 'T23:59:59';
  }

  function getCountdownTargetByType(p, type) {
    if (!p) return null;
    if (type === 'start') {
      var startStr = toDateOnlyString(p.startDate);
      return p.countdownTo || (startStr ? startStr + 'T12:00:00' : null);
    }
    if (type === 'end') {
      var endStr = toDateOnlyString(p.endDate);
      return endStr ? endStr + 'T23:59:59' : null;
    }
    if (type === 'ship') return getShipCountdownTarget(p);
    return null;
  }

  function tickCountdown() {
    document.querySelectorAll('.countdown[data-countdown-type]').forEach(function (div) {
      const span = div.querySelector('span');
      if (!span) return;
      const card = div.closest('.product-card');
      if (!card) return;
      const id = card.dataset.id;
      const type = div.dataset.countdownType;
      const p = allProducts.find(function (x) { return String(x.id) === id; });
      var countdownTarget = p ? getCountdownTargetByType(p, type) : null;
      if (!p || !countdownTarget) return;
      const cd = getCountdown(countdownTarget);
      if (!cd) return;
      if (cd.done) {
        if (type === 'start') div.innerHTML = '開團已到';
        else if (type === 'end') div.innerHTML = '結團時間：<span>' + cd.text + '</span>';
        else if (type === 'ship') div.innerHTML = '已過預計出貨日';
        else div.innerHTML = '已到期';
        div.classList.add('countdown-done');
        return;
      }
      span.textContent = cd.text;
    });
  }

  // 從 Google Apps Script 讀取：優先 localStorage / 全域變數，否則使用預設網址
  var DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMsCxagnkHf6TbS5PzLJ-PpxyJY32eeDLTkX_vdDmCDeJ8OdUE2DxWyh4w2yquj7v3/exec';
  function getScriptUrl() {
    if (typeof window.GOOGLE_SCRIPT_URL === 'string' && window.GOOGLE_SCRIPT_URL) return window.GOOGLE_SCRIPT_URL;
    try {
      var saved = localStorage.getItem('googleScriptUrl');
      if (saved && saved.trim()) return saved.trim();
    } catch (_) {}
    return DEFAULT_SCRIPT_URL || '';
  }
  function maybeFetchFromSheet(cb) {
    var url = getScriptUrl();
    if (!url || !url.trim()) {
      if (cb) cb();
      return;
    }
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    var mainUrl = url + sep + 'action=get';
    fetch(mainUrl)
      .then(function (r) { return r.json(); })
      .then(function (data1) {
        allProducts = Array.isArray(data1) ? data1 : [];
        if (allProducts.length) saveData();
        if (cb) cb();
      })
      .catch(function () {
        if (cb) cb();
      });
  }

  function init() {
    loadData();
    var savedTheme = 'dawn';
    try {
      savedTheme = localStorage.getItem('groupBuyTheme') || 'dawn';
    } catch (_) {}
    if (['dawn', 'night', 'sakura'].indexOf(savedTheme) >= 0) {
      currentTheme = savedTheme;
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.querySelectorAll('.theme-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.theme === savedTheme);
        b.setAttribute('aria-pressed', b.dataset.theme === savedTheme ? 'true' : 'false');
      });
    }
    bindTabs();
    bindTheme();
    renderCards();
    tickCountdown();
    setInterval(tickCountdown, 1000);
    // 狀態重算與列表重繪：15 秒一次，減少手機閃動感
    setInterval(renderCards, 15 * 1000);
    maybeFetchFromSheet(function () {
      renderCards();
      tickCountdown();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__groupBuyReload = function () {
    loadData();
    renderCards();
  };
})();
