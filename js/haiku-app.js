/* ============================================================
   haiku-app.js —— 手机俳句本 & 日常本
   - 本地记录（localStorage，离线可用）
   - 一键同步：俳句 → js/poems.json，日常 → js/notes.json
   - 图片：压缩后本地存；配置 Cloudinary 后可随日记同步
   ============================================================ */
(function () {
  'use strict';

  var REPO = 'sylvans-world';
  var OWNER = 'sylvanize';
  var GH = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/';

  /* ---------- 本地存储 ---------- */
  function lsGet(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { alert('本地存储已满，请先同步或删除一些内容'); }
  }

  var haikus = lsGet('sylvan_haikus', []);
  var notes = lsGet('sylvan_notes', []);
  var token = localStorage.getItem('sylvan_token') || '';
  var cloudName = localStorage.getItem('sylvan_cloud') || '';
  var preset = localStorage.getItem('sylvan_preset') || '';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 工具 ---------- */
  function today() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
  }

  /* ============================================================
     ① Tab 切换
     ============================================================ */
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('on'); });
      tab.classList.add('on');
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('on'); });
      $('panel-' + tab.dataset.tab).classList.add('on');
    });
  });

  /* ============================================================
     ①½ 草稿自动保存（写一半退出不丢）
     ============================================================ */
  var draftTimer = null;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try {
        localStorage.setItem('sylvan_draft', JSON.stringify({
          l1: $('l1').value, l2: $('l2').value, l3: $('l3').value,
          t: $('nTitle').value, b: $('nBody').value
        }));
      } catch (e) {}
    }, 400);
  }
  ['l1', 'l2', 'l3', 'nTitle', 'nBody'].forEach(function (id) {
    $(id).addEventListener('input', saveDraft);
  });
  function restoreDraft() {
    try {
      var d = JSON.parse(localStorage.getItem('sylvan_draft') || 'null');
      if (!d) return;
      $('l1').value = d.l1 || ''; $('l2').value = d.l2 || ''; $('l3').value = d.l3 || '';
      $('nTitle').value = d.t || ''; $('nBody').value = d.b || '';
    } catch (e) {}
  }
  function clearDraft() {
    try { localStorage.removeItem('sylvan_draft'); } catch (e) {}
  }

  /* ============================================================
     ①¾ 复制到剪贴板（发微信/朋友圈方便）
     ============================================================ */
  function copyText(text) {
    function done() { toast('已复制'); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  /* ============================================================
     ② 俳句：保存 + 列表
     ============================================================ */
  $('saveHaikuBtn').addEventListener('click', function () {
    var l1 = $('l1').value.trim();
    var l2 = $('l2').value.trim();
    var l3 = $('l3').value.trim();
    if (!l1 && !l2 && !l3) { toast('写点什么吧'); return; }
    haikus.unshift({
      id: uid(),
      lines: [l1, l2, l3].filter(function (x) { return x; }),
      date: today(),
      synced: false
    });
    lsSet('sylvan_haikus', haikus);
    $('l1').value = $('l2').value = $('l3').value = '';
    clearDraft();
    renderHaikus();
    toast('存好了');
  });

  function renderHaikus() {
    var box = $('haikuList');
    if (!haikus.length) { box.innerHTML = '<div class="empty">还没有东西，写一首吧</div>'; return; }
    box.innerHTML = '';
    document.querySelector('#panel-haiku h3').textContent = '我的俳句 (' + haikus.length + ')';
    haikus.forEach(function (h) {
      var el = document.createElement('div');
      el.className = 'haiku-item';
      el.innerHTML =
        '<div class="txt">' + h.lines.join('\n') + '</div>' +
        '<div class="meta"><span class="date">' + h.date + '</span>' +
        '<span><button class="copy">复制</button>' +
        '<span class="status ' + (h.synced ? 'synced' : 'pending') + '">' + (h.synced ? '已同步' : '待同步') + '</span>' +
        '<button class="del" data-id="' + h.id + '">✕</button></span></div>';
      box.appendChild(el);
    });
    box.querySelectorAll('.del').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('确定删除这首俳句吗？')) return;
        haikus = haikus.filter(function (h) { return h.id !== b.dataset.id; });
        lsSet('sylvan_haikus', haikus);
        renderHaikus();
      });
    });
    box.querySelectorAll('.copy').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = Array.prototype.indexOf.call(box.querySelectorAll('.copy'), b);
        copyText(haikus[idx].lines.join('\n') + '\n—— ' + haikus[idx].date);
      });
    });
  }

  /* ============================================================
     ③ 日常：图片选择/压缩 + 保存 + 列表
     ============================================================ */
  var pendingImages = [];   // 本次写作待存的图（dataURL）

  $('imgAdd').addEventListener('click', function () { $('fileInput').click(); });
  $('fileInput').addEventListener('change', function () {
    var files = Array.prototype.slice.call($('fileInput').files || []);
    files.forEach(function (file) {
      if (pendingImages.length >= 2) { toast('最多 2 张图'); return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        compressImage(e.target.result, function (dataUrl) {
          pendingImages.push(dataUrl);
          renderImgRow();
        });
      };
      reader.readAsDataURL(file);
    });
    $('fileInput').value = '';
  });

  function compressImage(dataUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var MAX = 1200;
      var w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        var r = Math.min(MAX / w, MAX / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = function () { cb(dataUrl); };
    img.src = dataUrl;
  }

  function renderImgRow() {
    var row = $('imgRow');
    row.innerHTML = '';
    pendingImages.forEach(function (d, i) {
      var box = document.createElement('div');
      box.className = 'img-box';
      box.innerHTML = '<img src="' + d + '"><button class="rm" data-i="' + i + '">✕</button>';
      row.appendChild(box);
    });
    if (pendingImages.length < 2) {
      var add = document.createElement('button');
      add.className = 'img-add';
      add.textContent = '＋';
      add.addEventListener('click', function () { $('fileInput').click(); });
      row.appendChild(add);
    }
    row.querySelectorAll('.rm').forEach(function (b) {
      b.addEventListener('click', function () {
        pendingImages.splice(parseInt(b.dataset.i, 10), 1);
        renderImgRow();
      });
    });
  }

  $('saveNoteBtn').addEventListener('click', function () {
    var title = $('nTitle').value.trim();
    var body = $('nBody').value.trim();
    if (!title && !body && !pendingImages.length) { toast('写点什么吧'); return; }
    notes.unshift({
      id: uid(),
      title: title,
      body: body,
      images: pendingImages.slice(),
      date: today(),
      synced: false
    });
    lsSet('sylvan_notes', notes);
    $('nTitle').value = ''; $('nBody').value = '';
    pendingImages = [];
    clearDraft();
    renderImgRow();
    renderNotes();
    toast('存好了');
  });

  function renderNotes() {
    var box = $('noteList');
    if (!notes.length) { box.innerHTML = '<div class="empty">还没有日记</div>'; return; }
    box.innerHTML = '';
    document.querySelector('#panel-note h3').textContent = '我的日记 (' + notes.length + ')';
    notes.forEach(function (n) {
      var el = document.createElement('div');
      el.className = 'note-item';
      var thumbs = '';
      if (n.images && n.images.length) {
        thumbs = '<div class="thumbs">' + n.images.map(function (im) {
          return '<img src="' + im + '">';
        }).join('') + '</div>';
      }
      el.innerHTML =
        (n.title ? '<div class="nt">' + n.title + '</div>' : '') +
        (n.body ? '<div class="nb">' + n.body + '</div>' : '') +
        thumbs +
        '<div class="meta"><span class="date">' + n.date + '</span>' +
        '<span><button class="copy">复制</button>' +
        '<span class="status ' + (n.synced ? 'synced' : 'pending') + '">' + (n.synced ? '已同步' : '待同步') + '</span>' +
        '<button class="del" data-id="' + n.id + '">✕</button></span></div>';
      box.appendChild(el);
    });
    box.querySelectorAll('.del').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('确定删除这篇日记吗？')) return;
        notes = notes.filter(function (n) { return n.id !== b.dataset.id; });
        lsSet('sylvan_notes', notes);
        renderNotes();
      });
    });
    box.querySelectorAll('.copy').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = Array.prototype.indexOf.call(box.querySelectorAll('.copy'), b);
        var n = notes[idx];
        copyText((n.title ? n.title + '\n' : '') + n.body + '\n—— ' + n.date);
      });
    });
  }

  /* ============================================================
     ④ 设置
     ============================================================ */
  $('setBtn').addEventListener('click', function () {
    $('tokenInput').value = token;
    $('cloudNameInput').value = cloudName;
    $('presetInput').value = preset;
    $('sheet').classList.add('open');
  });
  $('tokenCancel').addEventListener('click', function () { $('sheet').classList.remove('open'); });
  $('tokenOk').addEventListener('click', function () {
    token = $('tokenInput').value.trim();
    cloudName = $('cloudNameInput').value.trim();
    preset = $('presetInput').value.trim();
    localStorage.setItem('sylvan_token', token);
    localStorage.setItem('sylvan_cloud', cloudName);
    localStorage.setItem('sylvan_preset', preset);
    $('sheet').classList.remove('open');
    toast(token ? '保存好了' : '没填 token，同步会失败');
  });
  $('sheet').addEventListener('click', function (e) {
    if (e.target === $('sheet')) $('sheet').classList.remove('open');
  });

  /* ============================================================
     ⑤ 同步到 GitHub
     ============================================================ */
  function b64Encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64Decode(str) { return decodeURIComponent(escape(atob(str))); }

  function ghGet(path) {
    return fetch(GH + path, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
    }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('GitHub 读取失败 (' + r.status + ')');
      return r.json();
    });
  }

  function ghPut(path, content, sha) {
    var body = { message: 'sync from haiku-app', content: b64Encode(content) };
    if (sha) body.sha = sha;
    return fetch(GH + path, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('GitHub 写入失败 (' + r.status + ')');
      return r.json();
    });
  }

  /* 图片 → Cloudinary，返回 URL；没配置则返回 null */
  function uploadImage(dataUrl) {
    if (!cloudName || !preset) return Promise.resolve(null);
    return fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (blob) {
      var fd = new FormData();
      fd.append('file', blob);
      fd.append('upload_preset', preset);
      return fetch('https://api.cloudinary.com/v1_1/' + cloudName + '/image/upload', {
        method: 'POST', body: fd
      }).then(function (r) { return r.json(); }).then(function (j) {
        return j.secure_url || null;
      });
    });
  }

  function syncOne(path, localItems, mapFn) {
    return ghGet(path).then(function (remote) {
      var existing = [];
      if (remote && remote.content) {
        try { existing = JSON.parse(b64Decode(remote.content)); } catch (e) {}
      }
      if (!Array.isArray(existing)) existing = [];
      var newItems = localItems.filter(function (it) { return !it.synced; });
      if (!newItems.length) return { count: 0 };

      var merged = existing.slice();
      return Promise.all(newItems.map(mapFn)).then(function (mapped) {
        mapped.forEach(function (m) { if (m) merged.push(m); });
        var sha = remote ? remote.sha : undefined;
        return ghPut(path, JSON.stringify(merged, null, 2), sha).then(function () {
          return { count: newItems.length };
        });
      });
    });
  }

  $('syncBtn').addEventListener('click', function () {
    if (!token) { toast('先到设置里填 GitHub 密钥'); $('setBtn').click(); return; }
    var btn = $('syncBtn');
    btn.disabled = true;
    btn.textContent = '同步中…';

    var pHaikus = syncOne('js/poems.json', haikus, function (h) {
      return Promise.resolve({ lines: h.lines, date: h.date || '' });
    });

    var pNotes = syncOne('js/notes.json', notes, function (n) {
      var imgs = n.images || [];
      var uploads = imgs.map(uploadImage);
      return Promise.all(uploads).then(function (urls) {
        var good = urls.filter(function (u) { return u; });
        return {
          title: n.title || '',
          body: n.body || '',
          images: good,
          date: n.date || ''
        };
      });
    });

    Promise.all([pHaikus, pNotes]).then(function (res) {
      var hc = res[0].count, nc = res[1].count;
      haikus.forEach(function (h) { h.synced = true; });
      notes.forEach(function (n) { n.synced = true; });
      lsSet('sylvan_haikus', haikus);
      lsSet('sylvan_notes', notes);
      renderHaikus(); renderNotes();
      var imgNote = notes.some(function (n) { return n.images.length && !cloudName; });
      toast('同步完成 · 俳句 ' + hc + ' 首，日记 ' + nc + ' 篇' + (imgNote ? '（图片未配置，只同步了文字）' : ''));
    }).catch(function (err) {
      toast('同步失败：' + err.message);
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = '同步到网站';
    });
  });

  /* ---------- 初始化 ---------- */
  restoreDraft();
  renderHaikus();
  renderNotes();
  renderImgRow();
})();
