/*
 * 思想长廊 · 卡片叠组件（纯增量，自注入样式）
 * 依赖：CorridorData（数据）、CorridorSelect（选卡）
 *
 * 交互：
 *   - 当前帖为第一张（完整内容），其后叠放最多 5 张相关旧帖，仅露边缘
 *   - 触摸/鼠标左滑跟手，松手按阈值切换或回弹；触控板横向滑动也能切
 *   - 点图片 → 放大查看；点卡片 → 进入该帖并生成新叠（不一步退回来源帖）
 *   - ✕ 关闭，回到 archive 列表
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CorridorUI = factory();
})(typeof self !== 'undefined' ? self : function () { return this; }(), function () {
  'use strict';

  var DIM = 512;
  var deps = null;
  var stackEl = null;
  var active = false;

  // 当前叠状态
  var cards = [];      // [{entry, kind:'front'|'back', excerpt}]
  var pos = 0;         // 分数位置（0=第一张在最前）
  var maxPos = 0;
  var frontId = null;  // 当前最前帖 id（用于不一步退回）
  var drag = null;
  var suppressClick = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function splitSents(t) {
    return (t || '').split(/[。！？!?\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // 注入样式
  function injectStyle() {
    var css = ''
      + '#corridorStack{position:relative;z-index:5;width:100%;height:clamp(340px,64vh,660px);}'
      + '#corridorStack.hidden{display:none;}'
      + '.c-card{position:absolute;top:0;left:0;right:0;bottom:0;background:#fff;'
      + 'border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.10);'
      + 'display:flex;flex-direction:column;overflow:hidden;will-change:transform;user-select:none;'
      + '-webkit-user-select:none;touch-action:pan-y;}'
      + '.c-card .c-scroll{flex:1;overflow-y:auto;padding:6px 4px 10px;-webkit-overflow-scrolling:touch;}'
      + '.c-card .c-date{font-size:10.5px;letter-spacing:.12em;color:var(--faint);'
      + 'text-transform:uppercase;margin-bottom:10px;}'
      + '.c-card .c-ex{font-family:"Noto Serif SC",serif;font-size:15px;line-height:1.95;'
      + 'color:#222;white-space:pre-wrap;word-break:break-word;}'
      + '.c-card .c-enter{flex:none;text-align:center;padding:10px 0 12px;font-size:11px;'
      + 'letter-spacing:.18em;color:var(--faint);border-top:1px solid var(--line);}'
      + '.c-card .c-edge-hint{position:absolute;right:10px;top:50%;width:6px;height:40px;'
      + 'border-radius:3px;background:var(--line);opacity:.7;}'
      + '.c-anim .c-card{transition:transform .28s cubic-bezier(.22,.61,.36,1),opacity .28s ease;}'
      + '#corridorStack img{-webkit-user-drag:none;user-select:none;}'
      + '#viewCard .vclose{z-index:200;position:absolute;}'
      + '#cLightbox{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.92);'
      + 'display:none;align-items:center;justify-content:center;padding:4vw;}'
      + '#cLightbox.open{display:flex;}'
      + '#cLightbox img{max-width:100%;max-height:100%;border-radius:6px;}'
      + '#cLightbox .lb-close{position:absolute;top:14px;right:18px;color:#fff;font-size:26px;'
      + 'background:none;border:none;cursor:pointer;}'
      + '@media (max-width:600px){#corridorStack{height:clamp(320px,60vh,660px);}}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  // 图片放大灯箱
  function openLightbox(src) {
    var lb = document.getElementById('cLightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'cLightbox';
      lb.innerHTML = '<button class="lb-close" aria-label="关闭">✕</button><img alt="">';
      lb.addEventListener('click', function (ev) {
        if (ev.target === lb || ev.target.classList.contains('lb-close')) lb.classList.remove('open');
      });
      document.body.appendChild(lb);
    }
    lb.querySelector('img').src = src;
    lb.classList.add('open');
  }

  // 前卡完整内容（与 openView 一致的标记类）
  function frontHtml(d) {
    var lines = (d.text || '').split('\n');
    var noBold = ['碎片', '俳句'];
    var hasTitle = !noBold.some(function (t) { return (d.tags || []).indexOf(t) !== -1; });
    var h = '';
    if (hasTitle && lines[0]) {
      h += '<div class="vtitle">' + esc(lines[0]) + '</div>';
      if (lines.length > 1) h += '<div class="vbody">' + esc(lines.slice(1).join('\n')) + '</div>';
    } else {
      h += '<div class="vbody">' + esc(d.text) + '</div>';
    }
    (d.images || []).forEach(function (src) { h += '<img class="vimg" draggable="false" src="' + esc(src) + '">'; });
    var m = [];
    if (d.time) m.push(esc(d.time));
    if (d.source) m.push(esc(d.source));
    h += '<div class="vmeta">' + m.join(' · ') + '</div>';
    return h;
  }

  // 后卡：选与目标帖最像的一句
  function bestExcerpt(frontEntry, backEntry) {
    var sents = splitSents(backEntry.text);
    if (!sents.length) return { text: (backEntry.text || '').slice(0, 40), date: backEntry.date };
    var sv = deps.data.getSentenceVectors(backEntry._id != null ? backEntry._id : backEntry._key);
    var tv = deps.data.getPostVector(frontEntry._id != null ? frontEntry._id : frontEntry._key);
    var best = 0, bestVal = -Infinity;
    if (tv && sv.length) {
      for (var i = 0; i < sv.length; i++) {
        var s = 0;
        for (var k = 0; k < DIM; k++) s += tv[k] * sv[i][k];
        if (s > bestVal) { bestVal = s; best = i; }
      }
    }
    return { text: sents[best] || backEntry.text, date: backEntry.date || '' };
  }

  // 连续位置渲染
  function renderAt(p) {
    pos = p;
    var n = cards.length;
    for (var i = 0; i < n; i++) {
      var el = stackEl.children[i];
      var depth = i - p;
      var tx, ty, scale, op, z;
      if (depth <= -1) {
        tx = '-115%'; ty = '0'; scale = 0.96; op = 0; z = 0;
      } else if (depth < 0) {
        var f = 1 + depth; // -1..0
        tx = (depth * 115) + '%'; ty = '0'; scale = 0.96 + 0.04 * f; op = 1; z = 100 + i;
      } else {
        tx = (depth * 16) + 'px';
        ty = (depth * 8) + 'px';
        scale = Math.max(0.86, 1 - depth * 0.03);
        op = depth > 3.2 ? 0 : 1;
        z = 100 - i;
      }
      el.style.transform = 'translate(' + tx + ',' + ty + ') scale(' + scale + ')';
      el.style.opacity = op;
      el.style.zIndex = z;
    }
  }

  function snap(target) {
    stackEl.classList.add('c-anim');
    target = Math.max(0, Math.min(maxPos, target));
    renderAt(target);
    setTimeout(function () { stackEl.classList.remove('c-anim'); }, 300);
  }

  function buildCards(targetEntry, neighborEntries) {
    cards = [{ entry: targetEntry, kind: 'front' }];
    neighborEntries.forEach(function (e) {
      cards.push({ entry: e, kind: 'back', excerpt: bestExcerpt(targetEntry, e) });
    });
    maxPos = cards.length - 1;
  }

  function renderDom() {
    stackEl.innerHTML = '';
    cards.forEach(function (c, i) {
      var el = document.createElement('div');
      el.className = 'c-card';
      el.dataset.idx = i;
      if (c.kind === 'front') {
        el.innerHTML = '<div class="c-scroll">' + frontHtml(c.entry) + '</div>';
      } else {
        var date = c.excerpt.date || '';
        el.innerHTML = '<div class="c-scroll">'
          + '<div class="c-date">' + esc(date) + '</div>'
          + '<div class="c-ex">' + esc(c.excerpt.text) + '</div></div>'
          + '<div class="c-enter">进入这篇 →</div>'
          + (i > 0 ? '<span class="c-edge-hint"></span>' : '');
      }
      stackEl.appendChild(el);
    });
    stackEl.classList.remove('hidden', 'c-anim');
    renderAt(0);
  }

  // 进入某张卡片对应的帖子
  function enterCard(idx) {
    var target = cards[idx].entry;
    var curFront = Math.round(pos);
    var source = cards[curFront].entry;
    var sourceId = source._id != null ? source._id : source._key;
    show(target._key, sourceId);
  }

  // 手势
  function bindGestures() {
    stackEl.addEventListener('pointerdown', function (ev) {
      var cardEl = ev.target.closest('.c-card');
      if (!cardEl) return;
      suppressClick = false;
      drag = {
        startX: ev.clientX, startY: ev.clientY, startPos: pos,
        idx: Number(cardEl.dataset.idx), decided: false, horizontal: false, moved: false
      };
      stackEl.classList.remove('c-anim');
      try { stackEl.setPointerCapture(ev.pointerId); } catch (e) {}
    });

    stackEl.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.startX, dy = ev.clientY - drag.startY;
      if (!drag.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        drag.decided = true;
        // 横向更宽容：横向略占优即锁定，避免轻微斜向被误判成竖滑
        drag.horizontal = Math.abs(dx) > Math.abs(dy) * 0.85;
      }
      if (!drag.horizontal) return;
      ev.preventDefault();
      if (Math.abs(dx) > 10) { drag.moved = true; suppressClick = true; }
      var width = stackEl.clientWidth || 320;
      var span = width * 0.62;
      var np = drag.startPos - dx / span;
      renderAt(Math.max(0, Math.min(maxPos, np)));
    });

    function end(ev) {
      if (!drag) return;
      var d = drag; drag = null;
      if (!d.decided || !d.horizontal) return;
      var width = stackEl.clientWidth || 320;
      var dx = ev.clientX - d.startX;
      if (dx < -width * 0.18) snap(Math.ceil(pos + 0.001));
      else if (dx > width * 0.18) snap(Math.floor(pos - 0.001));
      else snap(Math.round(pos));
    }
    stackEl.addEventListener('pointerup', end);
    stackEl.addEventListener('pointercancel', function () { snap(Math.round(pos)); drag = null; });

    // 触控板 / 横向滚轮：横向滑动切卡
    var wheelAccum = 0, wheelLast = 0;
    stackEl.addEventListener('wheel', function (ev) {
      if (!active || maxPos === 0) return;
      if (Math.abs(ev.deltaX) < Math.abs(ev.deltaY) || Math.abs(ev.deltaX) < 2) return;
      ev.preventDefault();
      var now = Date.now();
      if (now - wheelLast > 250) wheelAccum = 0;
      wheelLast = now;
      wheelAccum += ev.deltaX;
      if (wheelAccum > 70) { snap(Math.max(0, Math.round(pos) - 1)); wheelAccum = 0; }
      else if (wheelAccum < -70) { snap(Math.min(maxPos, Math.round(pos) + 1)); wheelAccum = 0; }
    }, { passive: false });

    // 点击：图片放大 / 卡片进入（拖拽后不触发）
    stackEl.addEventListener('click', function (ev) {
      if (suppressClick) { suppressClick = false; return; }
      var img = ev.target.closest('img');
      if (img) { openLightbox(img.src); return; }
      var el = ev.target.closest('.c-card');
      if (!el) return;
      var idx = Number(el.dataset.idx);
      var curFront = Math.round(pos);
      if (idx === curFront) {
        // 已是最前：只有摘录卡（后卡）点击才进入，原始整帖不响应
        if (cards[idx].kind === 'back') enterCard(idx);
        return;
      }
      enterCard(idx);
    });
  }

  // 主入口：展示某帖的一叠
  function show(key, sourceId) {
    if (!deps.data.isEnabled()) return false;
    var entries = deps.getEntries();
    var tIndex = -1;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i]._key === key) { tIndex = i; break; }
    }
    if (tIndex === -1) return false;

    var pool = deps.data.buildPool(entries);
    var targetId = entries[tIndex]._id != null ? entries[tIndex]._id : entries[tIndex]._key;
    var pi = -1;
    for (var j = 0; j < pool.length; j++) { if (pool[j].id === targetId) { pi = j; break; } }
    if (pi === -1) return false;

    var sel = deps.sel(pool, pi, { excludeId: sourceId == null ? null : sourceId });
    var idToEntry = Object.create(null);
    entries.forEach(function (e) { idToEntry[e._id != null ? e._id : e._id] = e; });
    var neighbors = sel.map(function (poolIdx) { return idToEntry[pool[poolIdx].id]; })
      .filter(Boolean);

    frontId = targetId;
    buildCards(entries[tIndex], neighbors);
    deps.content.classList.add('hidden');
    renderDom();
    deps.overlay.classList.add('open');
    active = true;
    return true;
  }

  function close() {
    active = false;
    if (stackEl) { stackEl.classList.add('hidden'); stackEl.innerHTML = ''; }
    if (deps && deps.content) deps.content.classList.remove('hidden');
    if (deps && deps.overlay) deps.overlay.classList.remove('open');
  }

  function init(d) {
    deps = d;
    injectStyle();
    stackEl = document.createElement('div');
    stackEl.id = 'corridorStack';
    stackEl.className = 'hidden';
    deps.card.appendChild(stackEl);
    bindGestures();
  }

  return {
    init: init,
    show: show,
    close: close,
    openImage: openLightbox,
    isActive: function () { return active; }
  };
});
