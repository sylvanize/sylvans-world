/* notes.js —— 合并 notes.json 和手机本子 localStorage */
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

  /* 读本子 localStorage 里的日记 */
  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem('sylvan_notes') || '[]');
    } catch (e) { return []; }
  }

  /* 合并：localStorage 的新日记排前面，去重 */
  function merge(remote) {
    var local = loadLocal();
    var seen = {};
    var out = [];
    local.forEach(function (n) {
      var key = (n.title || '') + '|' + (n.body || '');
      if (!seen[key]) { seen[key] = 1; out.push(n); }
    });
    (remote || []).forEach(function (n) {
      var key = (n.title || '') + '|' + (n.body || '');
      if (!seen[key]) { seen[key] = 1; out.push(n); }
    });
    return out;
  }

  fetch('js/notes.json?t=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      NOTES = merge(Array.isArray(data) ? data : []);
      render();
    })
    .catch(function () {
      NOTES = merge([]);
      render();
    });
})();
