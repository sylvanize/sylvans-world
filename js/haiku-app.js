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

  // 分类标签
  var ALL_TAGS = ['被抛','畏','他人','自由','荒谬与反抗','向死而生','身体','无意义与意义','表达与语言','自由与束缚','身体与活着','成为自己','日记','碎片'];
  var selectedTag = null;

  function autoClassify(text) {
    var t = text.toLowerCase();
    if (/(焦虑|害怕|恐惧|不安|慌|紧张|担心|压力|无助|迷茫|累|崩溃|哭)/.test(t)) return '畏';
    if (/(别人|他们|朋友|妈妈|爸爸|爱|喜欢|想你|想念|在意|孤独|理解|缘分|恨|关系)/.test(t)) return '他人';
    if (/(自由|选择|能够|可以|成为自己|努力|成长|做不到|怎么办|改变)/.test(t)) return '自由';
    if (/(无意义|荒谬|反抗|坚持|承受|困难|痛苦|挣扎|继续|活下去|接受|失去|做错)/.test(t)) return '荒谬与反抗';
    if (/(死亡|时间|未来|变老|生命|永远|过去|曾经|明天|昨天|时光)/.test(t)) return '向死而生';
    if (/(身体|情绪|疲惫|失眠|心情|抑郁|感觉)/.test(t)) return '身体';
    if (/(意义|目的|价值|心理学)/.test(t)) return '无意义与意义';
    if (/(表达|写|语言|文字|沟通|沉默|看书|阅读)/.test(t)) return '表达与语言';
    if (/(束缚|规则|体制|学习|学校|考试|论文|专业)/.test(t)) return '自由与束缚';
    if (/(活着|生活|人生|日子|世界|日常)/.test(t)) return '身体与活着';
    if (/(自我|我是谁|自己|真实|扮演)/.test(t)) return '成为自己';
    if (text.length < 10) return '碎片';
    return '日记';
  }

  function renderTagPicker(current) {
    var box = $('mTags');
    if (!box) return;
    box.innerHTML = '';
    ALL_TAGS.forEach(function (tag) {
      var b = document.createElement('div');
      b.textContent = tag;
      b.style.cssText = 'padding:4px 10px;border-radius:12px;font-size:12px;cursor:pointer;' +
        (tag === current ? 'background:#1a1b1c;color:#fff;' : 'background:#e8e6df;');
      b.onclick = function () {
        selectedTag = (selectedTag === tag) ? null : tag;
        renderTagPicker(selectedTag);
      };
      box.appendChild(b);
    });
  }

  // 悲伤时跳出的力量句（你自己以前写的）
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
    '凡事别把后果想的太严重',
    '别把自己想得太重要，学会接受有人离开',
    '我的思想是我最宝贵的财富，思想不会消失',
    '步履不停'
  ];
  // 开心时跳出的开心句
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
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // 自动分类
  var ALL_TAGS = ['被抛','畏','他人','自由','荒谬与反抗','向死而生','身体','无意义与意义','表达与语言','自由与束缚','身体与活着','成为自己','日记','杂多'];
  function autoTag(text) {
    var t = (text||'').toLowerCase();
    var tags = [];
    if (/(命运|没办法|不得不|世界|生来|处境|冷漠|毁灭|操蛋|无法|为什么)/.test(t)) tags.push('被抛');
    if (/(焦虑|害怕|恐惧|不安|慌|紧张|担心|压力|无助|迷茫|累|麻|崩溃|哭|难过|后悔)/.test(t)) tags.push('畏');
    if (/(别人|他们|她|他|朋友|妈妈|爸爸|家|爱|喜欢|想念|在意|孤独|缘分|关系|感谢)/.test(t)) tags.push('他人');
    if (/(自由|选择|成为自己|我要|我想|努力|成长|做不到|怎么办|改变|存在)/.test(t)) tags.push('自由');
    if (/(无意义|荒谬|坚持|承受|困难|痛苦|挣扎|活下去|接受|放下|失去|做错|难)/.test(t)) tags.push('荒谬与反抗');
    if (/(死亡|死|时间|未来|变老|生命|永远|过去|曾经|明天|昨天|时光)/.test(t)) tags.push('向死而生');
    if (/(生病|身体|情绪|疲惫|失眠|心情|感觉|心里)/.test(t)) tags.push('身体');
    if (/(意义|目的|价值|心理)/.test(t)) tags.push('无意义与意义');
    if (/(表达|写|语言|文字|沟通|沉默|看书|阅读)/.test(t)) tags.push('表达与语言');
    if (/(束缚|规则|学习|学校|考试|论文|专业)/.test(t)) tags.push('自由与束缚');
    if (/(活着|生活|人生|日子|日常|夏天|风|光)/.test(t)) tags.push('身体与活着');
    if (/(自我|我是谁|自己|真实|扮演)/.test(t)) tags.push('成为自己');
    if (!tags.length) tags.push('杂多');
    return tags;
  }
  var selectedTags = [];
  function renderTagPicker(current) {
    selectedTags = (current||[]).slice();
    var box = $('mTags');
    box.innerHTML = '';
    ALL_TAGS.forEach(function(t) {
      var b = document.createElement('div');
      b.style.cssText = 'padding:4px 10px;border-radius:12px;background:#eee;cursor:pointer;font-size:12px;';
      if (selectedTags.indexOf(t) >= 0) b.style.background = '#333', b.style.color = '#fff';
      b.textContent = t;
      b.onclick = function() {
        var i = selectedTags.indexOf(t);
        if (i >= 0) selectedTags.splice(i,1); else selectedTags.push(t);
        renderTagPicker(selectedTags);
      };
      box.appendChild(b);
    });
  }

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

  /* ============================================================
     Tab 切换
     ============================================================ */
  var currentTab = 'haiku';

  function switchTab(tab) {
    currentTab = tab;
    $('tabHaiku').classList.toggle('on', tab === 'haiku');
    $('tabNote').classList.toggle('on', tab === 'note');
    $('tabMood').classList.toggle('on', tab === 'mood');
    $('panel-haiku').hidden = tab !== 'haiku';
    $('panel-note').hidden = tab !== 'note';
    $('panel-mood').hidden = tab !== 'mood';
    $('fab').style.display = tab === 'mood' ? 'none' : 'flex';   // 心情页用自带按钮
    $('search').style.display = tab === 'mood' ? 'none' : 'block'; // 心情页不搜索
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

  /* ============================================================
     俳句列表
     ============================================================ */
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

  /* ============================================================
     日记列表
     ============================================================ */
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

  /* ============================================================
     心情页：当前心情 + 一键记录 + 历史 + 本周统计
     ============================================================ */
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

    // 本周统计（近 7 天）
    var week = new Date(Date.now() - 6 * 86400000);
    var weekStart = dateStr(week);
    var h = 0, s = 0;
    moods.forEach(function (m) {
      if ((m.date || '') >= weekStart) { if (m.type === 'happy') h++; else s++; }
    });
    $('moodStat').textContent = (moods.length ? '这周 开心 ×' + h + ' · 悲伤 ×' + s : '');

    // 历史：按今天 / 昨天 / 更早分组
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

  function addMood(type) {
    var now = new Date();
    var base = MOOD_TEXT[type];
    var extra = type === 'sad' ? pick(POWER_QUOTES) : pick(HAPPY_QUOTES);
    moods.unshift({
      id: uid(), type: type, text: base + '\n\n—— ' + extra, note: '',
      date: dateStr(now),
      time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
      synced: false
    });
    lsSet('sylvan_moods', moods);
    renderMood();
    toast(type === 'happy' ? 'good' : '傻瓜血脉');
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

  /* ============================================================
     编辑器：新建 / 编辑（俳句三行 / 日记标题+正文+图片）
     ============================================================ */
  var editingKind = null;   // 'haiku' | 'note' | null
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
    selectedTag = (n && n.tag) || null;
    renderTagPicker(selectedTag);
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
      var fullText = title + '\n' + body;
      var tag = selectedTag || autoClassify(fullText);
      if (editingId) {
        for (var j = 0; j < notes.length; j++) if (notes[j].id === editingId) {
          notes[j].title = title; notes[j].body = body; notes[j].images = pendingImages.slice();
          notes[j].tag = tag;
          notes[j].synced = false;
          break;
        }
      } else {
        notes.unshift({
          id: uid(), title: title, body: body,
          images: pendingImages.slice(),
          tag: tag,
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

  /* ============================================================
     图片（日记用）：压缩 1200px / JPEG 0.75，最多 2 张
     ============================================================ */
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

  /* ============================================================
     设置
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
     同步到 GitHub：俳句 → poems.json，日记 → notes.json
     按 id 合并，编辑不重复；图片先传 Cloudinary
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

  /* 单个数组的合并同步，返回 Promise */
  function mergeAndPush(path, local, strip) {
    return ghGet(path).then(function (remote) {
      var remoteList = [];
      if (remote && remote.content) {
        try { remoteList = JSON.parse(b64Decode(remote.content)); } catch (e) {}
      }
      if (!Array.isArray(remoteList)) remoteList = [];

      var pending = local.filter(function (x) { return !x.synced; });
      if (!pending.length) return;   // 这一侧没有待同步内容，跳过（不报错）

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

  /* ---------- 初始化 ---------- */
  renderCurrent();
})();
