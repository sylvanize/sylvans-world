/* ============================================================
   poems.js —— 俳句列表 + 详情弹层
   数据来源：js/poems.json（手机俳句本同步到这里）
   手机端写俳句请用 haiku-app.html
   ============================================================ */
(function () {
  'use strict';

  var POEMS = [];

  function render() {
    var list = document.getElementById('poemList');
    var count = document.getElementById('poemCount');
    if (!list) return;

    count.textContent = POEMS.length + ' 首';

    POEMS.forEach(function (p, i) {
      var card = document.createElement('div');
      card.className = 'poem-card';
      card.innerHTML =
        '<div class="lines">' + p.lines.join('\n') + '</div>' +
        (p.date ? '<div class="date">' + p.date + '</div>' : '');
      card.addEventListener('click', function () { openDetail(i); });
      list.appendChild(card);
    });
  }

  /* ---------- 详情弹层 ---------- */
  var overlay = document.getElementById('poemOverlay');
  var bigLines = document.getElementById('bigLines');
  var bigDate = document.getElementById('bigDate');

  function openDetail(i) {
    var p = POEMS[i];
    if (!p) return;
    bigLines.textContent = p.lines.join('\n');
    bigDate.textContent = p.date || '';
    overlay.classList.add('open');
  }
  function closeDetail() {
    overlay.classList.remove('open');
  }

  if (overlay) {
    document.getElementById('poemClose').addEventListener('click', closeDetail);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeDetail();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDetail();
    });
  }

  /* ---------- 写俳句按钮：跳手机俳句本 ---------- */
  var writeBtn = document.getElementById('writeBtn');
  if (writeBtn) {
    writeBtn.addEventListener('click', function () {
      var isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        location.href = 'haiku-app.html';
      } else {
        // 电脑端提示扫码/提示
        writeBtn.textContent = '📱';
        setTimeout(function () { writeBtn.textContent = '＋'; }, 1500);
      }
    });
  }

  /* ---------- 加载数据 ---------- */
  fetch('js/poems.json?t=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      POEMS = Array.isArray(data) ? data : [];
      render();
    })
    .catch(function () {
      POEMS = [];
      render();
    });
})();
