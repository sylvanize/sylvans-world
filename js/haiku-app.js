/* ============================================================
   haiku-app.js —— sylvan's 本子（俳句 / 备忘录 / 心情，单页）
   - 本机：localStorage 三个键；上云：Supabase entries（自动）
   - 手动「同步到网站」：写 js/poems.json / notes.json / moods.json + synced-data.js
   - 单一标签体系（arcTags）；列表 / 搜索 / 编辑 / 删除 / 图片
   ============================================================ */
(function () {
  'use strict';

  /* ============ 常量 ============ */
  var REPO = 'sylvans-world', OWNER = 'sylvanize';
  var GH = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/';
  var POEMS_PATH = 'js/poems.json', NOTES_PATH = 'js/notes.json', MOODS_PATH = 'js/moods.json';

  var LS_HAIKU = 'sylvan_haikus', LS_NOTE = 'sylvan_notes', LS_MOOD = 'sylvan_moods',
      LS_MOOD_DEL = 'sylvan_mood_deleted';

  /* ============ 本机存储 ============ */
  function lsGet(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { alert('本地存储已满，请先同步或删除一些内容'); }
  }

  var haikus = lsGet(LS_HAIKU, []);
  var notes  = lsGet(LS_NOTE, []);
  var moods  = lsGet(LS_MOOD, []);
  var token = localStorage.getItem('sylvan_token') || '';
  var cloudName = localStorage.getItem('sylvan_cloud') || '';
  var preset = localStorage.getItem('sylvan_preset') || '';

  var $ = function (id) { return document.getElementById(id); };
  function findById(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  /* ============ 文本工具 ============ */
  // HTML 转义：所有写进 innerHTML 的用户内容都先过这里
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') +
      '.' + String(d.getDate()).padStart(2, '0');
  }
  // 点号日期 -> {iso 给 date 列, cn 给 time 列}
  function dotDate(dot) {
    var p = (dot || '').split('.');
    if (p.length !== 3) return { iso: '', cn: '' };
    return {
      iso: p[0] + '-' + p[1] + '-' + p[2],
      cn: p[0] + '年' + parseInt(p[1], 10) + '月' + parseInt(p[2], 10) + '日'
    };
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  /* ============ 心情文案 ============ */
  var MOOD_TEXT = { happy: 'good', sad: '这都是傻瓜的血脉使然呀！' };
  var MOOD_LABEL = { happy: '开心', sad: '悲伤' };

  var POWER_QUOTES = [
    '你必须在废墟中一次又一次的重建你的人生',
    '困难越是重重，你就越不要去期盼另一种生活',
    '唯有抓住表达，学会承受',
    '不接受很多事情，但我不接受不能改变任何事情',
    '你是存在着的，即使是推着石头的西西弗斯，你至少存在着',
    '无需再问，即便生活中的痛苦和快乐都将周而复始，我也还想要它无数次',
    '无数次我都觉得自己要完蛋了，但其实生活没有那么容易就完蛋',
    '如果只是一直使用而不思考和创造，则永远不可能成为创造者。创造，什么时候开始都不算晚',
    '怀揣着悲伤热忱的活着',
    '学会无所求，学会接受一切，要成长',
    '不要带着恐惧走向未来',
    '我又更自由了点',
    '生活蹂躏我可是我是一只狸猫我只会喊救命',
    '我是流水，是任植被生长的山坡，是携带万千生物吹拂的微风',
    '不要过分执着回忆想象中的幸福，你要看见你经历着的苦难',
    '既然不能换一种活法，不如换一种想法',
    '凡事别把后果想太严重',
    '别把自己想得太重要，学会接受有人离开',
    '我的思想是我最宝贵的财富，思想不会消失',
    '步履不停'
  ];
  var HAPPY_QUOTES = [
    '这个世界在慢慢变好，真好',
    '日子充实幸福得无时间抬笔记录，梦一般美好',
    '看到阳光洒满大地',
    '思考以及摄取知识真的是能让人走出不好情绪的好方法',
    '我合上眼睛，世界倒地死去。我抬起眼帘，一切重获新生',
    '我是流水，是任植被生长的山坡，是携带万千生物吹拂的微风',
    '我的世界五彩斑斓',
    '广州的夏天，蝉也开始叫了',
    '为什么不能全世界都想跟我聊天',
    '我好像在慢慢向自己期待的生活迈步',
    '每日，琐事如过堂风般穿透我',
    '有朋友真好',
    '我可以的我可以的我可以的，我一定可以的',
    '走出了一段痛苦的时段',
    '阳光又不能被刮动',
    '每天都能开心一点',
    '秋天的空气带着凉意，被风吹拂时，世界是新鲜的'
  ];

  /* ============ 归档自动归类（唯一标签体系）============ */
  var ARC_SOLO = ['日记', '随笔', '回忆', '碎片'];
  var ARC_THEMES = ['做自己', '身体', '他人', '活着'];

  function arcHas(t, kws) { return kws.some(function (k) { return t.indexOf(k) !== -1; }); }
  function arcTheme(t) {
    if (arcHas(t, ['焦虑','情绪','失眠','哭','紧张','疲惫','累','心情','难过','害怕','恐惧','不安','疼','烦躁','烦','郁','痛苦','压力','迷茫','无助','悲伤','毛病','矛盾','后悔','恨','睡','梦','控制','裸奔','燥','抑郁','反复','发泄','身体','心跳','不愉快','想法'])) return '身体';
    if (arcHas(t, ['朋友','她','关系','喜欢','社交','别人','妈妈','爸爸','爱','想念','他人','相处','对方','好友','同学','聊','姐','跟','欢','相','话','喜','尊','猜','主体性','两人'])) return '他人';
    if (arcHas(t, ['活着','生活','人生','改变','存在','世界','重建','时光','死亡','生命','未来','日子','春天','热爱','声','期','物','苦','慢','世','着','义','废墟'])) return '活着';
    return '做自己';
  }
  function arcDrawer(t, th) {
    if (th === '身体') return '身体的感觉';
    if (th === '他人') return '和人有关的';
    if (arcHas(t, ['不要','别','应当','必须','要学会','不能','应该','告诉自己','加油','要做','得学','要成为'])) return '跟自己说的';
    return '还在想的事';
  }
  function arcAuto(t) {
    if (arcHas(t, ['去年','前年','前几年','记得','小时候','那年','曾经','回忆','记忆','从前','儿时'])) return ['回忆'];
    var zh = (t.match(/[一-鿿]/g) || []).length;
    var en = (t.match(/[a-zA-Z]/g) || []).length;
    var repeated = /(.)\1\1/.test(t);
    if (t.length < 14 || (repeated && t.length < 40) || (en > zh && t.length < 45)) return ['碎片'];
    if (arcHas(t, ['?','？','为什么','是不是','应当','如何','该不该','能不能','要不要','我是否','思考'])) {
      var th = arcTheme(t);
      return [th, arcDrawer(t, th)];
    }
    if (arcHas(t, ['星球','毛线','意象','混沌','氧气','翅膀','季节','风','光','海','歌','诗'])) return ['随笔'];
    return ['日记'];
  }

  /* ============ Tab 切换 ============ */
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
  $('search').addEventListener('input', renderCurrent);

  function renderCurrent() {
    if (currentTab === 'haiku') renderHaikuList();
    else if (currentTab === 'note') renderNoteList();
    else renderMood();
  }

  /* ============ 俳句列表 ============ */
  function renderHaikuList() {
    var q = ($('search').value || '').trim().toLowerCase();
    var list = $('panel-haiku');
    var shown = haikus.filter(function (h) {
      if (!q) return true;
      return (h.lines || []).join(' ').toLowerCase().indexOf(q) >= 0;
    });
    $('count').textContent = haikus.length + ' 首';

    if (!shown.length) {
      list.innerHTML = '<div class="empty">' +
        (haikus.length ? '没有匹配的结果' : '还没有俳句，点右下角 ＋ 写一首') + '</div>';
      return;
    }
    list.innerHTML = '';
    shown.forEach(function (h) {
      var lines = h.lines || [];
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = h.id;
      el.innerHTML =
        (lines[0] ? '<div class="ct">' + esc(lines[0]) + '</div>' : '') +
        '<div class="cb">' + esc(lines.join('\n')) + '</div>' +
        '<div class="meta"><span>' + esc(h.date || '') + '</span>' +
        '<span class="status ' + (h.synced ? 'synced' : 'pending') + '">' +
        (h.synced ? '已同步' : '待同步') + '</span></div>';
      list.appendChild(el);
    });
    bindCards(list, haikus, openHaikuEditor);
  }

  /* ============ 备忘录列表 ============ */
  function renderNoteList() {
    var q = ($('search').value || '').trim().toLowerCase();
    var list = $('panel-note');
    var shown = notes.filter(function (n) {
      if (!q) return true;
      return ((n.title || '') + ' ' + (n.body || '')).toLowerCase().indexOf(q) >= 0;
    });
    $('count').textContent = notes.length + ' 条';

    if (!shown.length) {
      list.innerHTML = '<div class="empty">' +
        (notes.length ? '没有匹配的结果' : '还没有日记，点右下角 ＋ 开始记录') + '</div>';
      return;
    }
    list.innerHTML = '';
    shown.forEach(function (n) {
      var thumbs = '';
      if (n.images && n.images.length) {
        thumbs = '<div class="thumbs">' + n.images.slice(0, 3).map(function (im) {
          return '<img src="' + esc(im) + '">';
        }).join('') + '</div>';
      }
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = n.id;
      el.innerHTML =
        (n.title ? '<div class="ct">' + esc(n.title) + '</div>' : '') +
        (n.body ? '<div class="cb">' + esc(n.body) + '</div>' : '') +
        thumbs +
        '<div class="meta"><span>' + esc(n.date || '') + '</span>' +
        '<span class="status ' + (n.synced ? 'synced' : 'pending') + '">' +
        (n.synced ? '已同步' : '待同步') + '</span></div>';
      list.appendChild(el);
    });
    bindCards(list, notes, openNoteEditor);
  }

  function bindCards(list, arr, opener) {
    list.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('click', function () {
        var rec = findById(arr, c.dataset.id);
        if (rec) opener(rec);
      });
    });
  }

  /* ============ 心情页 ============ */
  function renderMood() {
    var now = $('moodNow');
    if (moods.length) {
      now.textContent = moods[0].note || moods[0].text;
      now.classList.remove('empty');
    } else {
      now.textContent = '此刻，什么都没有';
      now.classList.add('empty');
    }

    var weekStart = todayAt(Date.now() - 6 * 86400000);
    var h = 0, s = 0;
    moods.forEach(function (m) {
      if ((m.date || '') >= weekStart) { if (m.type === 'happy') h++; else s++; }
    });
    $('moodStat').textContent = moods.length ? '这周 开心 ×' + h + ' · 悲伤 ×' + s : '';

    var todayS = todayAt(Date.now());
    var yesterdayS = todayAt(Date.now() - 86400000);
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
          '<div class="face ' + esc(m.type) + '">' + MOOD_LABEL[m.type] + '</div>' +
          '<div class="mood-line">' +
          (m.note ? '<div class="mn">' + esc(m.note) + '</div>' : '') +
          '<div class="mt2">' + esc(m.text) + '</div></div>' +
          '<button class="mood-del" data-del="' + esc(m.id) + '">删除</button>';
        wrap.appendChild(el);
      });
    });

    wrap.querySelectorAll('.mood-card').forEach(function (c) {
      c.addEventListener('click', function () {
        var rec = findById(moods, c.dataset.id);
        if (rec) openMoodEditor(rec);
      });
    });
    wrap.querySelectorAll('.mood-del').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var rec = findById(moods, b.dataset.del);
        if (!rec) return;
        if (!window.confirm('确定删除这条心情吗？')) return;
        removeMood(rec);
        renderMood();
      });
    });

    /* 狸猫彩蛋：累计每 7 次悲伤召唤一只 */
    var sadCount = 0;
    moods.forEach(function (m) { if (m.type === 'sad') sadCount++; });
    var tanukis = Math.floor(sadCount / 7);
    var zone = $('tanukiZone');
    if (tanukis > 0) {
      $('tanukiFace').textContent = '🦝'.repeat(Math.min(tanukis, 5));
      $('tanukiLine').textContent = '狸猫 ×' + tanukis + '——集齐七个不开心，它就来陪你';
      var left = 7 - (sadCount % 7);
      $('tanukiSub').textContent = left < 7 ? '还差 ' + left + ' 个不开心，召唤下一只' : '';
      zone.hidden = false;
    } else {
      zone.hidden = true;
    }
  }

  function todayAt(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') +
      '.' + String(d.getDate()).padStart(2, '0');
  }

  function addMood(type) {
    var now = new Date();
    var extra = type === 'sad' ? pick(POWER_QUOTES) : pick(HAPPY_QUOTES);
    var m = {
      id: uid(), type: type,
      text: MOOD_TEXT[type] + '\n\n—— ' + extra, note: '',
      date: todayAt(now),
      time: String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0'),
      synced: false
    };
    moods.unshift(m);
    lsSet(LS_MOOD, moods);
    renderMood();
    toast(type === 'happy' ? 'good' : '傻瓜血脉');
    saveRecord('mood', m, LS_MOOD, moods);
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

  // 心情删除：本机移除 + 记防复活 + 软删云端
  function removeMood(m) {
    var guard = lsGet(LS_MOOD_DEL, []);
    guard.push({ id: m._supaId || null, text: moodCloudText(m) });
    lsSet(LS_MOOD_DEL, guard);
    var i = moods.indexOf(m);
    if (i !== -1) moods.splice(i, 1);
    lsSet(LS_MOOD, moods);
    if (m._supaId && window.SUPA && window.SUPA.remove) {
      window.SUPA.remove(m._supaId).catch(function () {});
    }
  }

  /* ============ 编辑器 ============ */
  var editingKind = null, editingId = null;
  var pendingImages = [];
  var arcAutoMode = true, arcManual = null;

  function editorText() { return $('mTitle').value + '\n' + $('mBody').value; }
  function currentArcTags() {
    if (arcAutoMode) return arcAuto(editorText());
    return arcManual || ['日记'];
  }
  function renderArcPicker() {
    var tags = currentArcTags();
    $('tagSuggest').textContent = tags.length === 1 ? tags[0] : ('思考 · ' + tags.join(' · '));
    $('autoBtn').classList.toggle('on', arcAutoMode);
    var box = $('mTags');
    box.innerHTML = '';
    function grp(label) {
      var l = document.createElement('div');
      l.className = 'grp-label';
      l.textContent = label;
      box.appendChild(l);
    }
    function chip(name, sel) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (sel ? ' sel' : '');
      b.textContent = name;
      b.onclick = function () {
        arcAutoMode = false;
        if (ARC_SOLO.indexOf(name) !== -1) arcManual = [name];
        else arcManual = [name, arcDrawer(editorText(), name)];
        renderArcPicker();
      };
      box.appendChild(b);
    }
    grp('日常');
    ARC_SOLO.forEach(function (n) { chip(n, tags.indexOf(n) !== -1); });
    grp('思考');
    ARC_THEMES.forEach(function (n) { chip(n, tags.indexOf(n) !== -1); });
  }

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
    if (n && n.arcTags && n.arcTags.length) { arcAutoMode = false; arcManual = n.arcTags.slice(); }
    else { arcAutoMode = true; arcManual = null; }
    renderArcPicker();
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

  $('autoBtn').addEventListener('click', function () {
    arcAutoMode = true;
    renderArcPicker();
  });
  $('mTitle').addEventListener('input', function () { if (arcAutoMode) renderArcPicker(); });
  $('mBody').addEventListener('input', function () { if (arcAutoMode) renderArcPicker(); });

  var saving = false;
  $('doneBtn').addEventListener('click', function () {
    if (saving) return;
    var kind = editingKind, lsKey, arr, rec;

    if (kind === 'haiku') {
      var l1 = $('l1').value.trim(), l2 = $('l2').value.trim(), l3 = $('l3').value.trim();
      if (!l1 && !l2 && !l3) { toast('写点什么吧'); return; }
      var lines = [l1, l2, l3].filter(Boolean);
      if (editingId) {
        rec = findById(haikus, editingId);
        rec.lines = lines; rec.synced = false;
      } else {
        rec = { id: uid(), lines: lines, date: today(), synced: false };
        haikus.unshift(rec);
      }
      lsKey = LS_HAIKU; arr = haikus;
    } else if (kind === 'note') {
      var title = $('mTitle').value.trim(), body = $('mBody').value.trim();
      if (!title && !body && !pendingImages.length) { toast('写点什么吧'); return; }
      var arcTags = currentArcTags();
      if (editingId) {
        rec = findById(notes, editingId);
        rec.title = title; rec.body = body;
        rec.images = pendingImages.slice(); rec.arcTags = arcTags; rec.synced = false;
      } else {
        rec = { id: uid(), title: title, body: body,
          images: pendingImages.slice(), arcTags: arcTags, date: today(), synced: false };
        notes.unshift(rec);
      }
      lsKey = LS_NOTE; arr = notes;
    } else if (kind === 'mood') {
      rec = findById(moods, editingId);
      rec.note = $('moodNote').value.trim();
      rec.synced = false;
      lsKey = LS_MOOD; arr = moods;
    } else {
      return;
    }

    lsSet(lsKey, arr);
    saving = true;
    closeEditor();
    renderCurrent();
    toast('已保存');
    saveRecord(kind, rec, lsKey, arr).then(function () { saving = false; });
  });

  $('editDel').addEventListener('click', function () {
    if (!editingKind || !editingId) return;
    if (!confirm('确定删除吗？')) return;
    if (editingKind === 'haiku') {
      haikus = haikus.filter(function (x) { return x.id !== editingId; });
      lsSet(LS_HAIKU, haikus);
    } else if (editingKind === 'note') {
      notes = notes.filter(function (x) { return x.id !== editingId; });
      lsSet(LS_NOTE, notes);
    } else if (editingKind === 'mood') {
      var rec = findById(moods, editingId);
      if (rec) removeMood(rec);
    }
    closeEditor();
    renderCurrent();
    toast('已删除');
  });

  $('fab').addEventListener('click', function () {
    if (currentTab === 'haiku') openHaikuEditor(null);
    else openNoteEditor(null);
  });

  /* ============ 图片：压缩 1200px / JPEG 0.75，最多 2 张 ============ */
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
    var img = new Image();
    img.onload = function () {
      var MAX = 1200, w = img.width, h = img.height;
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
      w.innerHTML = '<img src="' + esc(d) + '"><button class="rm" data-i="' + i + '">✕</button>';
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
        var pendingImagesNow = pendingImages;
        pendingImagesNow.splice(parseInt(b.dataset.i, 10), 1);
        renderImgs();
      });
    });
  }

  /* ============ 上云：Supabase 条目构造与保存 ============ */
  function moodCloudText(m) { return m.note ? (m.note + '\n\n' + m.text) : m.text; }

  function haikuEntry(h) {
    var d = dotDate(h.date);
    return { text: (h.lines || []).join('\n'), date: d.iso, time: d.cn,
      source: '本子', tags: ['俳句'], images: [] };
  }
  function noteEntry(n) {
    var d = dotDate(n.date);
    return { text: ((n.title || '') + '\n' + (n.body || '')).trim(),
      date: d.iso, time: d.cn, source: '本子',
      tags: n.arcTags || ['日记'], images: n.images || [] };
  }
  function moodEntry(m) {
    var d = dotDate(m.date);
    return { text: moodCloudText(m), date: d.iso, time: m.time || d.cn,
      source: '心情', tags: ['心情', m.type === 'sad' ? '悲伤' : '开心'], images: [] };
  }

  function saveRecord(kind, rec, lsKey, arr) {
    if (!window.SUPA) return Promise.resolve();
    var entry = kind === 'haiku' ? haikuEntry(rec)
      : kind === 'note' ? noteEntry(rec) : moodEntry(rec);

    var p;
    if (rec._supaId) {
      p = window.SUPA.update(rec._supaId, entry);
    } else if (window.SUPA.upsertForNotebook) {
      p = window.SUPA.upsertForNotebook(entry).then(function (rows) {
        if (rows && rows[0]) { rec._supaId = rows[0].id; lsSet(lsKey, arr); }
      });
    } else {
      p = window.SUPA.insert(entry).then(function (rows) {
        if (rows && rows[0]) { rec._supaId = rows[0].id; lsSet(lsKey, arr); }
      });
    }
    return p.catch(function () {});
  }

  /* 启动时把云端心情合并到本机（只增不删，防复活），实现跨设备 */
  function reconcileMoods() {
    if (!window.SUPA || !window.SUPA.loadMoods) return Promise.resolve();
    var guard = lsGet(LS_MOOD_DEL, []);
    var delIds = {}, delTexts = {};
    guard.forEach(function (g) { if (g.id) delIds[g.id] = 1; if (g.text) delTexts[g.text] = 1; });

    return window.SUPA.loadMoods().then(function (rows) {
      var added = 0;
      (rows || []).forEach(function (r) {
        if (delIds[r.id] || delTexts[r.text]) return;
        if (moods.some(function (m) { return m._supaId === r.id; })) return;
        if (moods.some(function (m) { moodCloudText(m) === r.text; })) return;
        var type = (r.tags || []).indexOf('悲伤') !== -1 ? 'sad' : 'happy';
        moods.push({
          id: uid(), type: type, text: r.text, note: '',
          date: (r.date || '').replace(/-/g, '.'), time: r.time || '',
          synced: true, _supaId: r.id
        });
        added++;
      });
      if (added) {
        moods.sort(function (a, b) {
          var ka = (a.date || '') + ' ' + (a.time || ''), kb = (b.date || '') + ' ' + (b.time || '');
          return ka < kb ? 1 : (ka > kb ? -1 : 0);
        });
        lsSet(LS_MOOD, moods);
      }
    }).catch(function () {});
  }

  /* ============ 设置 ============ */
  $('setBtn').addEventListener('click', function () {
    $('tokenInput').value = token;
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

  /* ============ 手动同步到 GitHub ============ */
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

  // 单个数组的合并同步；strip 完整定义该类型字段，避免字段丢失
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
        m.id = x.id || '';
        return m;
      });

      mapped.forEach(function (m) {
        var hit = null;
        for (var i = 0; i < remoteList.length; i++) {
          if (m.id && remoteList[i].id === m.id) { hit = remoteList[i]; break; }
        }
        if (hit) {
          for (var k in m) if (m[k] !== undefined) hit[k] = m[k];
        } else if (!remoteList.some(function (r) { return sameContent(r, m); })) {
          remoteList.push(m);
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
      return { lines: h.lines || [], date: h.date || '' };
    }).then(function () { lsSet(LS_HAIKU, haikus); });
  }
  function syncNotes() {
    return mergeAndPush(NOTES_PATH, notes, function (n) {
      return { title: n.title || '', body: n.body || '', images: n.images || [],
        date: n.date || '', arcTags: n.arcTags || [] };
    }).then(function () { lsSet(LS_NOTE, notes); });
  }
  function syncMoods() {
    return mergeAndPush(MOODS_PATH, moods, function (m) {
      return { type: m.type || '', text: m.text || '', note: m.note || '',
        date: m.date || '', time: m.time || '' };
    }).then(function () { lsSet(LS_MOOD, moods); });
  }

  function syncSyncedFile() {
    var payload = 'window.SYLVAN_SYNCED=' + JSON.stringify({
      poems: haikus.map(function (h) { return { lines: h.lines || [], date: h.date || '' }; }),
      notes: notes.map(function (n) {
        return { title: n.title || '', body: n.body || '', images: n.images || [],
          date: n.date || '', arcTags: n.arcTags || [] };
      })
    }) + ';';
    return ghGet('js/synced-data.js').then(function (remote) {
      return ghPut('js/synced-data.js', payload, remote ? remote.sha : undefined);
    });
  }

  $('syncBtn').addEventListener('click', function () {
    if (!token) { toast('先到设置里填 GitHub 密钥'); $('setBtn').click(); return; }
    var btn = $('syncBtn');
    btn.disabled = true;
    btn.textContent = '同步中…';
    Promise.all([syncHaikus(), syncNotes(), syncMoods()])
      .then(syncSyncedFile)
      .then(function () { renderCurrent(); toast('同步完成'); })
      .catch(function (err) { toast('同步失败：' + err.message); })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = '同步到网站';
      });
  });

  /* ============ 小体验：Esc 关闭 ============ */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if ($('sheet').classList.contains('open')) $('sheet').classList.remove('open');
    else if ($('editor').classList.contains('open')) closeEditor();
  });

  /* ============ 初始化 ============ */
  renderCurrent();
  reconcileMoods().then(function () { if (currentTab === 'mood') renderMood(); });
})();
