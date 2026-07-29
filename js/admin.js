(function () {
  'use strict';

  const STORAGE_KEY = 'groupBuyData';
  const SCRIPT_URL_KEY = 'googleScriptUrl'; // 與展示頁共用，供從試算表讀取列表（選用）
  var DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMsCxagnkHf6TbS5PzLJ-PpxyJY32eeDLTkX_vdDmCDeJ8OdUE2DxWyh4w2yquj7v3/exec';
  var listFilter = 'all';

  function getScriptUrl() {
    try {
      var saved = localStorage.getItem(SCRIPT_URL_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch (_) {}
    return DEFAULT_SCRIPT_URL || '';
  }

  function setScriptUrl(url) {
    try {
      if (url) localStorage.setItem(SCRIPT_URL_KEY, url);
      else localStorage.removeItem(SCRIPT_URL_KEY);
    } catch (_) {}
  }

  function loadExisting() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  function saveExisting(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /** 轉成 <input type="date"> 需要的 YYYY-MM-DD（支援試算表 ISO、斜線、Excel 序號） */
  function toInputDateString(val) {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'number') {
      var serialD = new Date((val - 25569) * 86400 * 1000);
      if (isNaN(serialD.getTime())) return '';
      return serialD.getFullYear() + '-' + String(serialD.getMonth() + 1).padStart(2, '0') + '-' + String(serialD.getDate()).padStart(2, '0');
    }
    if (typeof val === 'object' && val && typeof val.getTime === 'function') {
      var objD = val instanceof Date ? val : new Date(val);
      if (isNaN(objD.getTime())) return '';
      return objD.getFullYear() + '-' + String(objD.getMonth() + 1).padStart(2, '0') + '-' + String(objD.getDate()).padStart(2, '0');
    }
    var s = String(val).trim();
    if (!s) return '';
    var datePart = s.indexOf('T') >= 0 ? s.split('T')[0] : s;
    datePart = datePart.replace(/\//g, '-');
    var parts = datePart.split('-');
    if (parts.length < 3) return '';
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function toInputDateTimeLocal(val) {
    if (val === undefined || val === null || val === '') return '';
    try {
      var d = new Date(val);
      if (isNaN(d.getTime())) return '';
      var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
      var h = String(d.getHours()).padStart(2, '0'), min = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + day + 'T' + h + ':' + min;
    } catch (_) {
      return '';
    }
  }

  function normalizeStatusForForm(status) {
    var s = String(status || '').trim();
    if (s === 'upcoming' || s === '即將開團') return 'upcoming';
    if (s === 'ended' || s === '已結團') return 'ended';
    return 'ongoing';
  }

  function normalizeOpenResult(val) {
    var s = String(val || '').trim();
    if (s === 'success' || s === '成功開團' || s === '成功') return 'success';
    if (s === 'failed' || s === '未成團' || s === '失敗' || s === '未成功') return 'failed';
    return '';
  }

  function normalizeRegion(val) {
    var s = String(val || '').trim().toLowerCase();
    if (s === 'jp' || s === 'japan' || s === '日本' || s === '日本開團') return 'jp';
    if (s === 'kr' || s === 'korea' || s === '韓國' || s === '韓國開團') return 'kr';
    return '';
  }

  function regionLabel(val) {
    var region = normalizeRegion(val);
    if (region === 'jp') return '日本開團';
    if (region === 'kr') return '韓國開團';
    return '地區未設定';
  }

  function inferOpenResult(item) {
    if (normalizeStatusForForm(item.status) !== 'ended') return '';
    var explicit = normalizeOpenResult(item.openResult);
    if (explicit) return explicit;
    var progress = item.progress || [];
    var ordered = progress.find(function (n) { return n.name === '收單中' && n.done; });
    if (ordered || (item.registeredCount != null && item.registeredCount > 0)) return 'success';
    return 'failed';
  }

  function openResultLabel(val) {
    if (val === 'success') return '成功開團';
    if (val === 'failed') return '未成團';
    return '';
  }

  function matchesListFilter(item) {
    var statusKey = normalizeStatusForForm(item.status);
    var resultKey = inferOpenResult(item);
    if (listFilter === 'all') return true;
    if (listFilter === 'active') return statusKey !== 'ended';
    if (listFilter === 'success-ended') return statusKey === 'ended' && resultKey === 'success';
    if (listFilter === 'failed-ended') return statusKey === 'ended' && resultKey === 'failed';
    return true;
  }

  function toggleOpenResultRow() {
    var form = document.getElementById('groupForm');
    var row = document.getElementById('openResultRow');
    if (!form || !row) return;
    var status = (form.querySelector('input[name="status"]:checked') || {}).value || 'ongoing';
    row.hidden = status !== 'ended';
  }

  function getOpenResultFromForm(form) {
    var status = (form.querySelector('input[name="status"]:checked') || {}).value || 'ongoing';
    if (status !== 'ended') return '';
    var el = form.querySelector('input[name="openResult"]:checked');
    return el ? normalizeOpenResult(el.value) : 'success';
  }

  function getFormData() {
    var form = document.getElementById('groupForm');
    var title = form.title.value.trim();
    var imageUrl = (form.imageUrl && form.imageUrl.value) ? form.imageUrl.value.trim() : '';
    var startDate = form.startDate.value;
    var endDate = form.endDate.value;
    var badge = (form.querySelector('input[name="badge"]:checked') || {}).value || 'hot';
    var region = normalizeRegion((form.querySelector('input[name="region"]:checked') || {}).value);
    var status = (form.querySelector('input[name="status"]:checked') || {}).value || 'ongoing';
    var rawCount = form.registeredCount && form.registeredCount.value ? form.registeredCount.value.trim() : '';
    var registeredCount = rawCount === '' ? null : Math.max(0, parseInt(rawCount, 10) || 0);
    var countdownTo = form.countdownTo.value ? form.countdownTo.value.replace('T', 'T') : null;
    if (countdownTo && countdownTo.length === 16) countdownTo = countdownTo + ':00';
    var expectedShipDate = (form.expectedShipDate && form.expectedShipDate.value) ? form.expectedShipDate.value.trim() : null;
    var rawDelay = (form.shipDelayDays && form.shipDelayDays.value) ? form.shipDelayDays.value.trim() : '';
    var shipDelayDays = rawDelay === '' ? null : Math.max(0, parseInt(rawDelay, 10) || 0);

    var progressNames = ['收單中', '等待出荷', '集運中', '抵台', '已完成出貨'];
    var progress = [];
    progressNames.forEach(function (name, i) {
      var el = form.querySelector('input[data-name="' + name + '"]');
      progress.push({ name: name, done: el ? el.checked : false });
    });

    // 一番賞僅為標籤，一律寫入原本的試算表（第一張）
    return {
      title: title,
      imageUrl: imageUrl || null,
      startDate: startDate,
      endDate: endDate,
      badge: badge,
      region: region,
      status: status,
      openResult: getOpenResultFromForm(form),
      registeredCount: registeredCount,
      progress: progress,
      countdownTo: countdownTo || null,
      expectedShipDate: expectedShipDate || null,
      shipDelayDays: shipDelayDays
    };
  }

  function buildPayload(data, id) {
    return {
      id: id,
      sheet: data.sheet || null,
      title: data.title,
      imageUrl: data.imageUrl || null,
      status: data.status,
      openResult: data.openResult || null,
      badge: data.badge,
      region: data.region || null,
      startDate: data.startDate,
      endDate: data.endDate,
      registeredCount: data.registeredCount != null ? data.registeredCount : null,
      progress: data.progress,
      countdownTo: data.countdownTo,
      expectedShipDate: data.expectedShipDate || null,
      shipDelayDays: data.shipDelayDays != null ? data.shipDelayDays : null
    };
  }

  function addToLocal(payload) {
    var list = loadExisting();
    list.push(payload);
    saveExisting(list);
  }

  function updateInLocal(id, payload) {
    var list = loadExisting();
    var idx = list.findIndex(function (item) { return item.id === id; });
    if (idx < 0) return false;
    list[idx] = payload;
    saveExisting(list);
    return true;
  }

  function findInLocal(id) {
    var list = loadExisting();
    return list.find(function (item) { return item.id === id; }) || null;
  }

  function removeFromLocal(id) {
    if (!id) return;
    if (!confirm('確定要從本機移除此筆？試算表不會被刪除，僅移除本機列表中的這一筆。')) return;
    var list = loadExisting();
    var idx = list.findIndex(function (item) { return item.id === id; });
    if (idx < 0) {
      showMessage('找不到該筆資料。', 'error');
      return;
    }
    list.splice(idx, 1);
    saveExisting(list);
    var editingIdEl = document.getElementById('editingId');
    if (editingIdEl && editingIdEl.value === id) {
      editingIdEl.value = '';
    }
    renderExistingList();
    showMessage('已從本機移除該筆。', 'success');
  }

  function renderExistingList() {
    var box = document.getElementById('existingListBox');
    var clearBtn = document.getElementById('clearEditBtn');
    var editingIdEl = document.getElementById('editingId');
    var editingId = (editingIdEl && editingIdEl.value) ? editingIdEl.value.trim() : '';
    if (!box) return;
    var list = loadExisting().filter(matchesListFilter);
    box.innerHTML = '';
    if (list.length === 0) {
      var emptyMsg = document.createElement('p');
      emptyMsg.className = 'existing-list-empty';
      emptyMsg.textContent = listFilter === 'all'
        ? '尚無本機開團資料，請在下方表單新增。'
        : '此篩選條件下沒有商品，可改選其他篩選或從試算表載入。';
      box.appendChild(emptyMsg);
    }
    list.forEach(function (item) {
      var statusKey = normalizeStatusForForm(item.status);
      var statusTxt = { upcoming: '即將開團', ongoing: '正在開團', ended: '已結團' }[statusKey] || item.status;
      var resultTxt = statusKey === 'ended' ? openResultLabel(inferOpenResult(item)) : '';
      var meta = [regionLabel(item.region), toInputDateString(item.startDate), toInputDateString(item.endDate), statusTxt, resultTxt].filter(Boolean).join(' · ');
      var div = document.createElement('div');
      div.className = 'existing-item';
      div.innerHTML =
        '<div class="existing-item-info">' +
          '<div class="existing-item-title">' + escapeHtml(item.title || '未命名') + '</div>' +
          '<div class="existing-item-meta">' + escapeHtml(meta) + '</div>' +
        '</div>' +
        '<div class="existing-item-actions">' +
          '<button type="button" class="btn btn-secondary existing-load-btn" data-id="' + escapeHtml(item.id) + '">載入編輯</button>' +
          '<button type="button" class="btn btn-remove existing-remove-btn" data-id="' + escapeHtml(item.id) + '">從本機移除</button>' +
        '</div>';
      box.appendChild(div);
    });
    var removeBtns = box.querySelectorAll('.existing-remove-btn');
    list.forEach(function (item, i) {
      var loadBtn = box.querySelector('.existing-load-btn[data-id="' + item.id + '"]');
      if (loadBtn) loadBtn.addEventListener('click', function () { loadItemIntoForm(item.id); });
      if (removeBtns[i]) removeBtns[i].addEventListener('click', function () { removeFromLocal(item.id); });
    });
    if (clearBtn) clearBtn.style.display = editingId ? 'inline-block' : 'none';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function loadItemIntoForm(id) {
    var item = findInLocal(id);
    if (!item) {
      showMessage('找不到該筆資料。', 'error');
      return;
    }
    var form = document.getElementById('groupForm');
    form.title.value = item.title || '';
    form.imageUrl.value = item.imageUrl || '';
    if (form.imageUrl && !form.imageUrl.value && item.imageUrl) form.imageUrl.value = item.imageUrl;
    var badge = (item.badge === 'new' || item.badge === 'recommend' || item.badge === 'ichibansho') ? item.badge : 'hot';
    var badgeEl = form.querySelector('input[name="badge"][value="' + badge + '"]');
    if (badgeEl) badgeEl.checked = true;
    var region = normalizeRegion(item.region);
    form.querySelectorAll('input[name="region"]').forEach(function (el) {
      el.checked = el.value === region;
    });
    form.startDate.value = toInputDateString(item.startDate);
    form.endDate.value = toInputDateString(item.endDate);
    var status = normalizeStatusForForm(item.status);
    var statusEl = form.querySelector('input[name="status"][value="' + status + '"]');
    if (statusEl) statusEl.checked = true;
    var openResult = inferOpenResult(item);
    var openResultEl = form.querySelector('input[name="openResult"][value="' + (openResult || 'success') + '"]');
    if (openResultEl) openResultEl.checked = true;
    toggleOpenResultRow();
    form.registeredCount.value = (item.registeredCount != null && item.registeredCount !== '') ? String(item.registeredCount) : '';
    var progressNames = ['收單中', '等待出荷', '集運中', '抵台', '已完成出貨'];
    var progress = item.progress || [];
    progressNames.forEach(function (name) {
      var el = form.querySelector('input[data-name="' + name + '"]');
      if (el) {
        var p = progress.find(function (x) { return x.name === name; });
        el.checked = !!(p && p.done);
      }
    });
    form.countdownTo.value = toInputDateTimeLocal(item.countdownTo);
    if (form.expectedShipDate) form.expectedShipDate.value = toInputDateString(item.expectedShipDate);
    if (form.shipDelayDays) form.shipDelayDays.value = (item.shipDelayDays != null && item.shipDelayDays !== '') ? String(item.shipDelayDays) : '';
    var editingIdEl = document.getElementById('editingId');
    if (editingIdEl) editingIdEl.value = id;
    renderExistingList();
    showMessage('已載入「' + (item.title || '') + '」，可修改狀態或進度後按「送出」或「僅儲存至本機」。', 'success');
  }

  function clearEditMode() {
    var editingIdEl = document.getElementById('editingId');
    if (editingIdEl) editingIdEl.value = '';
    renderExistingList();
    showMessage('已切換為新增模式，表單可留空或填寫新的一筆。', 'success');
  }

  function loadFromSheet() {
    try {
      var btn = document.getElementById('loadFromSheetBtn');
      var resetBtn = function () {
        if (btn) { btn.disabled = false; btn.textContent = '從試算表載入列表（取得列號以支援同步更新）'; }
      };
      showMessage('正在從試算表載入…', 'success');
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) console.error(err);
      showMessage('載入時發生錯誤：' + (err && err.message ? err.message : String(err)), 'error');
      return;
    }
    var url = (document.getElementById('scriptUrl') || {}).value || getScriptUrl();
    if (!url || !url.trim()) {
      showMessage('請先填寫下方「Apps Script 網址」後再按此按鈕。', 'error');
      return;
    }
    url = url.trim().replace(/\/$/, '');
    var getUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=get';
    if (btn) { btn.disabled = true; btn.textContent = '載入中…'; }
    fetch(getUrl, { method: 'GET', mode: 'cors' })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('伺服器回傳 ' + res.status + '，請確認 Apps Script 網址與試算表 ID 是否正確。');
        }
        return res.text();
      })
      .then(function (text) {
        var list;
        try {
          list = JSON.parse(text);
        } catch (e) {
          throw new Error('試算表回傳內容不是 JSON，請確認網址為「網路應用程式」的網址。');
        }
        if (!Array.isArray(list)) {
          if (list && list.error) {
            throw new Error(list.error || '試算表連線失敗');
          }
          if (list && list.ok === false && list.error) {
            throw new Error(list.error);
          }
          throw new Error('試算表回傳格式不符，請確認 Apps Script 已部署為網路應用程式。');
        }
        if (list.length === 0) {
          resetBtn();
          showMessage('試算表目前沒有資料（至少需有一列標題與一列資料）。若試算表明明有資料，請檢查 Apps Script 是否已設定 SPREADSHEET_ID 並「重新部署」。', 'error');
          return;
        }
        function normalizeDateForMatch(val) {
          return toInputDateString(val);
        }
        var existing = loadExisting();
        var updated = 0;
        var added = 0;
        list.forEach(function (row) {
          var id = row.id;
          var sheetRowIndex = null;
          if (typeof id === 'string' && id.indexOf('row-') === 0) {
            sheetRowIndex = parseInt(id.replace('row-', ''), 10);
            if (isNaN(sheetRowIndex)) sheetRowIndex = null;
          }
          var payload = {
            id: id,
            title: row.title,
            imageUrl: row.imageUrl || null,
            badge: row.badge || 'hot',
            region: normalizeRegion(row.region) || null,
            startDate: toInputDateString(row.startDate) || null,
            endDate: toInputDateString(row.endDate) || null,
            registeredCount: row.registeredCount != null ? row.registeredCount : null,
            status: normalizeStatusForForm(row.status),
            openResult: normalizeOpenResult(row.openResult) || null,
            progress: Array.isArray(row.progress) ? row.progress : [],
            countdownTo: row.countdownTo || null,
            expectedShipDate: toInputDateString(row.expectedShipDate) || null,
            shipDelayDays: row.shipDelayDays != null ? row.shipDelayDays : null,
            sheetRowIndex: sheetRowIndex
          };
          if (normalizeStatusForForm(payload.status) === 'ended' && !payload.openResult) {
            payload.openResult = inferOpenResult(payload);
          }
          var idxById = existing.findIndex(function (item) { return item.id === id; });
          if (idxById >= 0) {
            existing[idxById] = Object.assign({}, existing[idxById], payload);
            updated++;
            return;
          }
          var sheetStart = normalizeDateForMatch(row.startDate);
          var idxByTitleStart = existing.findIndex(function (item) {
            if (String(item.title || '').trim() !== String(row.title || '').trim()) return false;
            return normalizeDateForMatch(item.startDate) === sheetStart;
          });
          if (idxByTitleStart >= 0) {
            existing[idxByTitleStart] = Object.assign({}, existing[idxByTitleStart], payload);
            updated++;
            return;
          }
          existing.push(payload);
          added++;
        });
        saveExisting(existing);
        renderExistingList();
        resetBtn();
        var msg = '已從試算表載入 ' + list.length + ' 筆';
        if (updated > 0 || added > 0) {
          msg += '（更新 ' + updated + ' 筆、新增 ' + added + ' 筆）';
        }
        msg += '，並記錄列號。之後載入編輯並送出即可同步更新試算表。';
        showMessage(msg, 'success');
      })
      .catch(function (err) {
        resetBtn();
        var msg = (err && err.message) ? err.message : '請檢查網址與網路';
        if (String(msg).indexOf('Failed to fetch') !== -1 || String(msg).indexOf('NetworkError') !== -1) {
          msg = '無法連線（可能是 CORS 或網路問題）。若用 file:// 開啟請改由本機伺服器或 GitHub Pages 開啟後台。';
        }
        showMessage(msg, 'error');
      });
  }

  function showMessage(text, type) {
    var el = document.getElementById('message');
    if (!el) return;
    el.textContent = text;
    el.className = 'message show ' + (type || 'success');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setSubmitLoading(loading) {
    var btn = document.getElementById('submitBtn');
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? '匯入中…' : '送出並匯入 Google 試算表';
    }
  }

  function addField(form, name, value) {
    var input = document.createElement('input');
    input.name = name;
    input.type = 'hidden';
    input.value = value == null ? '' : value;
    form.appendChild(input);
  }

  function submitToSheet(payload, onDone) {
    var url = (document.getElementById('scriptUrl') || {}).value || getScriptUrl();
    if (!url || !url.trim()) {
      if (onDone) onDone(new Error('請先填寫 Google Apps Script 網址'));
      return;
    }
    url = url.trim().replace(/\/$/, '');
    setSubmitLoading(true);
    var params = new URLSearchParams();
    params.append('action', 'append');
    params.append('title', payload.title || '');
    params.append('imageUrl', payload.imageUrl || '');
    params.append('badge', payload.badge || 'hot');
    params.append('region', payload.region || '');
    params.append('startDate', payload.startDate || '');
    params.append('endDate', payload.endDate || '');
    params.append('registeredCount', payload.registeredCount != null ? String(payload.registeredCount) : '');
    params.append('status', payload.status || 'ongoing');
    params.append('progress', JSON.stringify(payload.progress || []));
    params.append('countdownTo', payload.countdownTo || '');
    params.append('expectedShipDate', payload.expectedShipDate || '');
    params.append('shipDelayDays', payload.shipDelayDays != null ? String(payload.shipDelayDays) : '');
    params.append('openResult', payload.openResult || '');
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        setSubmitLoading(false);
        if (result && result.ok) {
          showMessage(result.message || '已寫入試算表「' + (result.sheetName || '') + '」，目前共 ' + (result.rows || 0) + ' 列。', 'success');
          if (onDone) onDone(null, result);
        } else {
          showMessage((result && result.error) ? result.error : '寫入試算表時發生錯誤。', 'error');
          if (onDone) onDone(new Error(result && result.error ? result.error : 'unknown'));
        }
      })
      .catch(function (err) {
        setSubmitLoading(false);
        var msg = (err && err.message) ? err.message : '請檢查網址與網路';
        if (msg === 'Failed to fetch') {
          msg = '無法連線（Failed to fetch）。請確認：1) Apps Script 已部署為「網路應用程式」且存取權設為「所有使用者」；2) 網址正確且無多餘空白；3) 無擴充功能或防火牆封鎖 script.google.com；4) 若為本機 file:// 請改由 localhost 或 GitHub Pages 開啟。';
        } else {
          msg = '無法連線至 Apps Script：' + msg;
        }
        showMessage(msg, 'error');
        if (onDone) onDone(err);
      });
  }

  function submitToSheetUpdate(payload, onDone) {
    var url = (document.getElementById('scriptUrl') || {}).value || getScriptUrl();
    if (!url || !url.trim()) {
      if (onDone) onDone(new Error('請先填寫 Google Apps Script 網址'));
      return;
    }
    url = url.trim().replace(/\/$/, '');
    setSubmitLoading(true);
    var params = new URLSearchParams();
    params.append('action', 'update');
    params.append('rowIndex', String(payload.sheetRowIndex != null ? payload.sheetRowIndex : ''));
    params.append('title', payload.title || '');
    params.append('imageUrl', payload.imageUrl || '');
    params.append('badge', payload.badge || 'hot');
    params.append('region', payload.region || '');
    params.append('startDate', payload.startDate || '');
    params.append('endDate', payload.endDate || '');
    params.append('registeredCount', payload.registeredCount != null ? String(payload.registeredCount) : '');
    params.append('status', payload.status || 'ongoing');
    params.append('progress', JSON.stringify(payload.progress || []));
    params.append('countdownTo', payload.countdownTo || '');
    params.append('expectedShipDate', payload.expectedShipDate || '');
    params.append('shipDelayDays', payload.shipDelayDays != null ? String(payload.shipDelayDays) : '');
    params.append('openResult', payload.openResult || '');
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        setSubmitLoading(false);
        if (result && result.ok) {
          showMessage(result.message || '已更新試算表該列。', 'success');
          if (onDone) onDone(null);
        } else {
          showMessage((result && result.error) ? result.error : '更新試算表時發生錯誤。', 'error');
          if (onDone) onDone(new Error(result && result.error ? result.error : 'unknown'));
        }
      })
      .catch(function (err) {
        setSubmitLoading(false);
        var msg = (err && err.message) ? err.message : '請檢查網址與網路';
        showMessage('無法連線：' + msg, 'error');
        if (onDone) onDone(err);
      });
  }

  document.getElementById('groupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var data = getFormData();
    if (!data.title || !data.region || !data.startDate || !data.endDate) {
      showMessage('請填寫商品名稱、開團地區、開團日期與結團日期。', 'error');
      return;
    }
    var editingIdEl = document.getElementById('editingId');
    var editingId = (editingIdEl && editingIdEl.value) ? editingIdEl.value.trim() : '';
    var id = editingId || generateId();
    var existing = editingId ? findInLocal(editingId) : null;
    var payload = buildPayload(data, id);
    if (existing && existing.sheetRowIndex != null) payload.sheetRowIndex = existing.sheetRowIndex;

    var url = (document.getElementById('scriptUrl') || {}).value || getScriptUrl();
    if (editingId) {
      updateInLocal(editingId, payload);
      if (editingIdEl) editingIdEl.value = '';
      renderExistingList();
      if (url && url.trim() && payload.sheetRowIndex != null) {
        setScriptUrl(url.trim());
        submitToSheetUpdate(payload, function () {});
      } else if (url && url.trim()) {
        showMessage('已更新本機資料。試算表未同步（此筆當初未記錄列號），請手動修改試算表或重新匯入。', 'success');
      } else {
        showMessage('已更新本機資料，可至展示頁查看。', 'success');
      }
    } else {
      if (url && url.trim()) {
        setScriptUrl(url.trim());
        addToLocal(payload);
        submitToSheet(payload, function (err, result) {
          if (!err && result && result.rows != null) {
            var list = loadExisting();
            var last = list[list.length - 1];
            if (last && last.id === payload.id) {
              last.sheetRowIndex = result.rows;
              saveExisting(list);
            }
          }
        });
      } else {
        addToLocal(payload);
        showMessage('已儲存至本機。若需匯入試算表，請先填寫下方 Apps Script 網址後再送出。', 'success');
      }
    }
  });

  document.getElementById('saveLocalBtn').addEventListener('click', function () {
    var data = getFormData();
    if (!data.title || !data.region || !data.startDate || !data.endDate) {
      showMessage('請填寫商品名稱、開團地區、開團日期與結團日期。', 'error');
      return;
    }
    var editingIdEl = document.getElementById('editingId');
    var editingId = (editingIdEl && editingIdEl.value) ? editingIdEl.value.trim() : '';
    var id = editingId || generateId();
    var existing = editingId ? findInLocal(editingId) : null;
    var payload = buildPayload(data, id);
    if (existing && existing.sheetRowIndex != null) payload.sheetRowIndex = existing.sheetRowIndex;

    if (editingId) {
      updateInLocal(editingId, payload);
      if (editingIdEl) editingIdEl.value = '';
      renderExistingList();
      showMessage('已更新本機資料，可至展示頁查看。', 'success');
    } else {
      addToLocal(payload);
      showMessage('已僅儲存至本機，可至展示頁查看。', 'success');
    }
  });

  document.getElementById('clearEditBtn').addEventListener('click', function () {
    clearEditMode();
  });

  (function () {
    var form = document.getElementById('groupForm');
    if (!form) return;
    form.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('button');
      if (!btn || !btn.closest('.quick-open-btns') || !btn.dataset.minutes) return;
      var minutes = parseInt(btn.dataset.minutes, 10);
      if (isNaN(minutes) || minutes < 0) return;
      var now = new Date();
      var openAt = new Date(now.getTime() + minutes * 60 * 1000);
      var y = openAt.getFullYear();
      var m = String(openAt.getMonth() + 1).padStart(2, '0');
      var d = String(openAt.getDate()).padStart(2, '0');
      var h = String(openAt.getHours()).padStart(2, '0');
      var min = String(openAt.getMinutes()).padStart(2, '0');
      var startDateEl = form.startDate;
      var countdownToEl = form.countdownTo;
      if (startDateEl) startDateEl.value = y + '-' + m + '-' + d;
      if (countdownToEl) countdownToEl.value = y + '-' + m + '-' + d + 'T' + h + ':' + min;
      showMessage('已設定開團日期為今天、倒數目標時間為 ' + minutes + ' 分鐘後，可再修改其他欄位後送出。', 'success');
    });
  })();

  // 用事件委派綁定「從試算表載入」按鈕，避免因載入順序導致沒反應
  var existingListSection = document.getElementById('existingListSection');
  if (existingListSection) {
    existingListSection.addEventListener('click', function (e) {
      var filterBtn = e.target && e.target.closest && e.target.closest('.existing-filter-btn');
      if (filterBtn) {
        e.preventDefault();
        listFilter = filterBtn.dataset.filter || 'all';
        existingListSection.querySelectorAll('.existing-filter-btn').forEach(function (b) {
          b.classList.toggle('active', b === filterBtn);
        });
        renderExistingList();
        return;
      }
      if (e.target && e.target.id === 'loadFromSheetBtn') {
        e.preventDefault();
        loadFromSheet();
      }
    });
  }

  document.querySelectorAll('input[name="status"]').forEach(function (el) {
    el.addEventListener('change', toggleOpenResultRow);
  });
  toggleOpenResultRow();

  var scriptInput = document.getElementById('scriptUrl');
  if (scriptInput) {
    scriptInput.value = getScriptUrl();
    scriptInput.addEventListener('change', function () {
      setScriptUrl(this.value.trim());
    });
    scriptInput.addEventListener('blur', function () {
      setScriptUrl(this.value.trim());
    });
  }
  var testBtn = document.getElementById('testScriptBtn');
  if (testBtn) {
    testBtn.addEventListener('click', function () {
      var url = (document.getElementById('scriptUrl') || {}).value || getScriptUrl();
      if (!url || !url.trim()) {
        showMessage('請先填寫 Apps Script 網址', 'error');
        return;
      }
      url = url.trim().replace(/\/$/, '') + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=test';
      window.open(url, '_blank');
    });
  }

  document.querySelectorAll('.theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var theme = this.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelectorAll('.theme-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.theme === theme);
      });
      try {
        localStorage.setItem('groupBuyTheme', theme);
      } catch (_) {}
    });
  });

  var savedTheme = 'dawn';
  try {
    savedTheme = localStorage.getItem('groupBuyTheme') || 'dawn';
  } catch (_) {}
  if (['dawn', 'night', 'sakura'].indexOf(savedTheme) >= 0) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.theme === savedTheme);
    });
  }

  renderExistingList();

  window.loadFromSheet = loadFromSheet;
})();
