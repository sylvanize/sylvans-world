/* ============================================================
   notes.js —— 日常列表
   数据来源：js/notes.json（手机俳句本同步到这里）
   ============================================================ */
(function () {
  'use strict';

  var NOTES = [];

  function render() {
    var list = document.getElementById('noteList');
    var count = document.getElementById('noteCount');
    if (!list) return;

    count.textContent = NOTES.length + ' 篇';

    if (!NOTES.length) {
      list.innerHTML = '<div class="empty">还没有日记，去手机上记一篇吧</div>';
      return;
    }

    NOTES.forEach(function (n) {
      var card = document.createElement('div');
      card.className = 'note-card';
      var html = '';
      if (n.title) html += '<div class="nt">' + n.title + '</div>';
      if (n.body) html += '<div class="nb">' + n.body + '</div>';
      if (n.images && n.images.length) {
        html += '<div class="imgs">' + n.images.map(function (u) {
          return '<img src="' + u + '" loading="lazy" alt="">';
        }).join('') + '</div>';
      }
      if (n.date) html += '<div class="date">' + n.date + '</div>';
      card.innerHTML = html;
      list.appendChild(card);
    });

    /* 点图看大图 */
    var lb = document.getElementById('lightbox');
    var lbImg = document.getElementById('lightboxImg');
    list.querySelectorAll('.imgs img').forEach(function (im) {
      im.addEventListener('click', function () {
        lbImg.src = im.src;
        lb.classList.add('open');
      });
    });
    lb.addEventListener('click', function () { lb.classList.remove('open'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lb.classList.remove('open');
    });
  }

  fetch('js/notes.json?t=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      NOTES = Array.isArray(data) ? data : [];
      render();
    })
    .catch(function () {
      NOTES = [];
      render();
    });
})();
