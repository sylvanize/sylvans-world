/* ============================================================
   haiku-app.js —— sylvan's 本子（俳句 + 备忘录，单 App 双页面）
   - 俳句 → localStorage 'sylvan_haikus' → 同步 js/poems.json
   - 日记 → localStorage 'sylvan_notes'  → 同步 js/notes.json
   - 列表 / 搜索 / 新建 / 编辑 / 删除 / 一键同步 / 图片
   ============================================================ */
(function () {
  'use strict';

  var REPO = 'sylvans-world';
  var OWNER = 'sylvanize';
  var GH = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/';
  var POEMS_PATH = 'js/poems.json';
  var NOTES_PATH = 'js/notes.json';
  var MOODS_PATH = 'js/moods.json';

  function lsGet(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { alert('本地存储已满，请先同步或删除一些内容'); }
  }

  var haikus = lsGet('sylvan_haikus', []);
  var notes = lsGet('sylvan_notes', []);
  var moods = lsGet('sylvan_moods', []);
  var token = localStorage.getItem('sylvan_token') || '';
  var cloudName = localStorage.getItem('sylvan_cloud') || '';
  var preset = localStorage.getItem('sylvan_preset') || '';

  var $ = function (id) { return document.getElementById(id); };

  var MOOD_TEXT = { happy: 'good', sad: '这都是傻瓜的血脉使然呀！' };
  var MOOD_LABEL = { happy: '开心', sad: '悲伤' };

  function today() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  var currentTab = 'haiku';

  function switchTab(tab) {
    currentTab = tab;
    $('tabHaiku').classList.toggle('on', tab === 'haiku');
    $('tabNote').classList.toggle('on', tab === 'note');
    $('tabMood').classList.toggle('on', tab === 'mood');
    $('panel-haiku').hidden = tab !== 'haiku';
    $('panel-note').hidden = tab !== 'note';
    $('panel-mood').hidden = tab !== 'mood';
    $('fab').style.display = tab === 'mood' ? 'none' : 'flex';
    $('search').style.display = tab === 'mood' ? 'none' : 'block';
    $('search').value = '';
    renderCurrent();
  }
  $('tabHaiku').addEventListener('click', function () { switchTab('haiku'); });
  $('tabNote').addEventListener('click', function () { switchTab('note'); });
  $('tabMood').addEventListener('click', function () { switchTab('mood'); });

  function renderCurrent() {
    if (currentTab === 'haiku') renderHaikuList();
    else if (currentTab === 'note') renderNoteList();
    else renderMood();
  }
  $('search').addEventListener('input', renderCurrent);

  function renderHaikuList() {
    var q = ($('search').value || '').trim().toLowerCase();
    var list = $('panel-haiku');
    var shown = haikus.filter(function (h) {
      if (!q) return true;
      return (h.lines || []).join(' ').toLowerCase().indexOf(q) >= 0;
    });
    $('count').textContent = haikus.length + ' 首';

    if (!shown.length) {
      list.innerHTML = '<div class="empty">' + (haikus.length ? '没有匹配的结果' : '还没有俳句，点右下角 ＋ 写一首') + '</div>';
      return;
    }
    list.innerHTML = '';
    shown.forEach(function (h) {
      var lines = h.lines || [];
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = h.id;
      el.innerHTML =
        (lines[0] ? '<div class="ct">' + lines[0] + '</div>' : '') +
        '<div class="cb">' + lines.join('\n') + '</div>' +
        '<div class="meta"><span>' + (h.date || '') + '</span>' +
        '<span class="status ' + (h.synced ? 'synced' : 'pending') + '">' + (h.synced ? '已同步' : '待同步') + '</span></div>';
      list.appendChild(el);
    });
    bindCards(list, haikus, openHaikuEditor);
  }

  function renderNoteList() {
    var q = ($('search').value || '').trim().toLowerCase();
    var list = $('panel-note');
    var shown = notes.filter(function (n) {
      if (!q) return true;
      return ((n.title || '') + ' ' + (n.body || '')).toLowerCase().indexOf(q) >= 0;
    });
    $('count').textContent = notes.length + ' 条';

    if (!shown.length) {
      list.innerHTML = '<div class="empty">' + (notes.length ? '没有匹配的结果' : '还没有日记，点右下角 ＋ 开始记录') + '</div>';
      return;
    }
    list.innerHTML = '';
    shown.forEach(function (n) {
      var thumbs = '';
      if (n.images && n.images.length) {
        thumbs = '<div class="thumbs">' + n.images.slice(0, 3).map(function (im) {
          return '<img src="' + im + '">';
        }).join('') + '</div>';
      }
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = n.id;
      el.innerHTML =
        (n.title ? '<div class="ct">' + n.title + '</div>' : '') +
        (n.body ? '<div class="cb">' + n.body + '</div>' : '') +
        thumbs +
        '<div class="meta"><span>' + (n.date || '') + '</span>' +
        '<span class="status ' + (n.synced ? 'synced' : 'pending') + '">' + (n.synced ? '已同步' : '待同步') + '</span></div>';
      list.appendChild(el);
    });
    bindCards(list, notes, openNoteEditor);
  }

  function bindCards(list, arr, opener) {
    list.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('click', function () {
        for (var i = 0; i < arr.length; i++) if (arr[i].id === c.dataset.id) { opener(arr[i]); return; }
      });
    });
  }

  function dateStr(d) {
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function renderMood() {
    var now = $('moodNow');
    if (moods.length) {
      now.textContent = moods[0].text;
      now.classList.remove('empty');
    } else {
      now.textContent = '此刻，什么都没有';
      now.classList.add('empty');
    }

    var week = new Date(Date.now() - 6 * 86400000);
    var weekStart = dateStr(week);
    var h = 0, s = 0;
    moods.forEach(function (m) {
      if ((m.date || '') >= weekStart) { if (m.type === 'happy') h++; else s++; }
    });
    $('moodStat').textContent = (moods.length ? '这周 开心 ×' + h + ' · 悲伤 ×' + s : '');

    var todayS = dateStr(new Date());
    var yesterdayS = dateStr(new Date(Date.now() - 86400000));
    var groups = [
      { label: '今天', items: [] },
      { label: '昨天', items: [] },
      { label: '更早', items: [] }
    ];
    moods.forEach(function (m) {
      if (m.date === todayS) groups[0].items.push(m);
      else if (m.date === yesterdayS) groups[1].items.push(m);
      else groups[2].items.push(m);
    });

    var wrap = $('moodGroups');
    wrap.innerHTML = '';
    groups.forEach(function (g) {
      if (!g.items.length) return;
      var title = document.createElement('div');
      title.className = 'mood-group-title';
      title.textContent = g.label;
      wrap.appendChild(title);
      g.items.forEach(function (m) {
        var el = document.createElement('div');
        el.className = 'card mood-card';
        el.dataset.id = m.id;
        el.innerHTML =
          '<div class="face ' + m.type + '">' + MOOD_LABEL[m.type] + '</div>' +
          '<div class="mood-line"><div class="mt2">' + m.text + '</div>' +
          (m.note ? '<div class="mn">' + m.note + '</div>' : '') + '</div>' +
          '<div class="meta">' + m.time + ' <span class="status ' + (m.synced ? 'synced' : 'pending') + '">' + (m.synced ? '已同步' : '待同步') + '</span></div>';
        wrap.appendChild(el);
      });
    });
    wrap.querySelectorAll('.mood-card').forEach(function (c) {
      c.addEventListener('click', function () {
        for (var i = 0; i < moods.length; i++) if (moods[i].id === c.dataset.id) { openMoodEditor(moods[i]); return; }
      });
    });

    var sadCount = 0;
    moods.forEach(function (m) { if (m.type === 'sad') sadCount++; });
    var tanukis = Math.floor(sadCount / 7);
    var zone = $('tanukiZone');
    if (tanukis > 0) {
      $('tanukiFace').textContent = '🦝'.repeat(Math.min(tanukis, 5));
      $('tanukiLine').textContent = '狸猫 ×' + tanukis;
      var left = 7 - (sadCount % 7);
      $('tanukiSub').textContent = left < 7 ? '还差 ' + left + ' 个不开心' : '';
      zone.hidden = false;
    } else {
      zone.hidden = true;
    }
  }

  function addMood(type) {
    var now = new Date();
    moods.unshift({
      id: uid(), type: type, text: MOOD_TEXT[type], note: '',
      date: dateStr(now),
      time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
      synced: false
    });
    lsSet('sylvan_moods', moods);
    renderMood();
    toast(type === 'happy' ? '记下了：good' : '记下了：傻瓜血脉');
  }
  $('moodHappy').addEventListener('click', function () { addMood('happy'); });
  $('moodSad').addEventListener('click', function () { addMood('sad'); });

  function openMoodEditor(m) {
    editingKind = 'mood';
    editingId = m.id;
    $('moodEditType').textContent = MOOD_LABEL[m.type];
    $('moodEditText').textContent = m.text;
    $('moodNote').value = m.note || '';
    $('editDel').style.visibility = 'visible';
    showGroup('mood');
    $('editor').classList.add('open');
    setTimeout(function () { $('moodNote').focus(); }, 300);
  }

  var editingKind = null;
  var editingId = null;
  var pendingImages = [];

  function showGroup(kind) {
    $('group-haiku').hidden = kind !== 'haiku';
    $('group-note').hidden = kind !== 'note';
    $('group-mood').hidden = kind !== 'mood';
  }

  function openHaikuEditor(h) {
    editingKind = 'haiku';
    editingId = h ? h.id : null;
    var lines = h && h.lines ? h.lines : ['', '', ''];
    $('l1').value = lines[0] || '';
    $('l2').value = lines[1] || '';
    $('l3').value = lines[2] || '';
    $('editDel').style.visibility = h ? 'visible' : 'hidden';
    showGroup('haiku');
    $('editor').classList.add('open');
    setTimeout(function () { (h ? $('l2') : $('l1')).focus(); }, 300);
  }

  function openNoteEditor(n) {
    editingKind = 'note';
    editingId = n ? n.id : null;
    pendingImages = n && n.images ? n.images.slice() : [];
    $('mTitle').value = n ? (n.title || '') : '';
    $('mBody').value = n ? (n.body || '') : '';
    $('editDel').style.visibility = n ? 'visible' : 'hidden';
    renderImgs();
    showGroup('note');
    $('editor').classList.add('open');
    setTimeout(function () { (n ? $('mBody') : $('mTitle')).focus(); }, 300);
  }

  function closeEditor() {
    $('editor').classList.remove('open');
    editingKind = null;
    editingId = null;
  }
  $('cancelBtn').addEventListener('click', closeEditor);

  $('doneBtn').addEventListener('click', function () {
    if (editingKind === 'haiku') {
      var l1 = $('l1').value.trim(), l2 = $('l2').value.trim(), l3 = $('l3').value.trim();
      if (!l1 && !l2 && !l3) { toast('写点什么吧'); return; }
      if (editingId) {
        for (var i = 0; i < haikus.length; i++) if (haikus[i].id === editingId) {
          haikus[i].lines = [l1, l2, l3].filter(function (x) { return x; });
          haikus[i].synced = false;
          break;
        }
      } else {
        haikus.unshift({
          id: uid(),
          lines: [l1, l2, l3].filter(function (x) { return x; }),
          date: today(), synced: false
        });
      }
      lsSet('sylvan_haikus', haikus);
    } else if (editingKind === 'note') {
      var title = $('mTitle').value.trim();
      var body = $('mBody').value.trim();
      if (!title && !body && !pendingImages.length) { toast('写点什么吧'); return; }
      if (editingId) {
        for (var j = 0; j < notes.length; j++) if (notes[j].id === editingId) {
          notes[j].title = title; notes[j].body = body; notes[j].images = pendingImages.slice();
          notes[j].synced = false;
          break;
        }
      } else {
        notes.unshift({
          id: uid(), title: title, body: body,
          images: pendingImages.slice(),
          date: today(), synced: false
        });
      }
      lsSet('sylvan_notes', notes);
    } else if (editingKind === 'mood') {
      var moodNote = $('moodNote').value.trim();
      for (var k = 0; k < moods.length; k++) if (moods[k].id === editingId) {
        moods[k].note = moodNote;
        moods[k].synced = false;
        break;
      }
      lsSet('sylvan_moods', moods);
    } else {
      return;
    }
    closeEditor();
    renderCurrent();
    toast('已保存');
  });

  $('editDel').addEventListener('click', function () {
    if (!editingKind || !editingId) return;
    if (!confirm('确定删除吗？')) return;
    if (editingKind === 'haiku') {
      haikus = haikus.filter(function (x) { return x.id !== editingId; });
      lsSet('sylvan_haikus', haikus);
    } else if (editingKind === 'note') {
      notes = notes.filter(function (x) { return x.id !== editingId; });
      lsSet('sylvan_notes', notes);
    } else if (editingKind === 'mood') {
      moods = moods.filter(function (x) { return x.id !== editingId; });
      lsSet('sylvan_moods', moods);
    }
    closeEditor();
    renderCurrent();
    toast('已删除');
  });

  $('fab').addEventListener('click', function () {
    if (currentTab === 'haiku') openHaikuEditor(null);
    else openNoteEditor(null);
  });

  $('mAdd') && ($('mAdd').addEventListener('click', function () { $('fileInput').click(); }));
  $('fileInput').addEventListener('change', function () {
    var files = Array.prototype.slice.call($('fileInput').files || []);
    files.forEach(function (file) {
      if (pendingImages.length >= 2) { toast('最多 2 张图'); return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        compressImage(e.target.result, function (dataUrl) {
          pendingImages.push(dataUrl);
          renderImgs();
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

  function renderImgs() {
    var box = $('mImgs');
    box.innerHTML = '';
    pendingImages.forEach(function (d, i) {
      var w = document.createElement('div');
      w.className = 'box';
      w.innerHTML = '<img src="' + d + '"><button class="rm" data-i="' + i + '">✕</button>';
      box.appendChild(w);
    });
    if (pendingImages.length < 2) {
      var a = document.createElement('button');
      a.className = 'add';
      a.textContent = '＋';
      a.addEventListener('click', function () { $('fileInput').click(); });
      box.appendChild(a);
    }
    box.querySelectorAll('.rm').forEach(function (b) {
      b.addEventListener('click', function () {
        pendingImages.splice(parseInt(b.dataset.i, 10), 1);
        renderImgs();
      });
    });
  }

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
    var body = { message: 'revert: remove archive + tags', content: b64Encode(content) };
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

  function sameContent(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  function mergeAndPush(path, local, strip) {
    return ghGet(path).then(function (remote) {
      var remoteList = [];
      if (remote && remote.content) {
        try { remoteList = JSON.parse(b64Decode(remote.content)); } catch (e) {}
      }
      if (!Array.isArray(remoteList)) remoteList = [];

      var pending = local.filter(function (x) { return !x.synced; });
      if (!pending.length) return;

      var mapped = pending.map(function (x) {
        var m = strip(x);
        return { id: x.id || '', lines: m.lines, title: m.title, body: m.body, images: m.images, date: m.date || '' };
      });

      mapped.forEach(function (m) {
        var hit = null;
        for (var i = 0; i < remoteList.length; i++) {
          if (m.id && remoteList[i].id === m.id) { hit = remoteList[i]; break; }
        }
        if (hit) {
          for (var k in m) if (m[k] !== undefined) hit[k] = m[k];
        } else {
          var dup = remoteList.some(function (r) { return sameContent(r, m); });
          if (!dup) remoteList.push(m);
        }
      });

      var sha = remote ? remote.sha : undefined;
      return ghPut(path, JSON.stringify(remoteList, null, 2), sha).then(function () {
        local.forEach(function (x) { x.synced = true; });
      });
    });
  }

  function syncHaikus() {
    return mergeAndPush(POEMS_PATH, haikus, function (h) {
      return { lines: h.lines || [] };
    }).then(function () { lsSet('sylvan_haikus', haikus); });
  }

  function syncNotes() {
    return mergeAndPush(NOTES_PATH, notes, function (n) {
      return { title: n.title || '', body: n.body || '', images: n.images || [] };
    }).then(function () { lsSet('sylvan_notes', notes); });
  }

  function syncMoods() {
    return mergeAndPush(MOODS_PATH, moods, function (m) {
      return { type: m.type || '', text: m.text || '', note: m.note || '', date: m.date || '', time: m.time || '' };
    }).then(function () { lsSet('sylvan_moods', moods); });
  }

  $('syncBtn').addEventListener('click', function () {
    if (!token) { toast('先到设置里填 GitHub 密钥'); $('setBtn').click(); return; }
    var btn = $('syncBtn');
    btn.disabled = true;
    btn.textContent = '同步中…';

    var task = [syncHaikus(), syncNotes(), syncMoods()];

    Promise.all(task).then(function () {
      renderCurrent();
      toast('同步完成');
    }).catch(function (err) {
      toast('同步失败：' + err.message);
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = '同步到网站';
    });
  });

  renderCurrent();
})();