/* 全站海豚自定义光标：p1 正常 / p2 点击态（悬停可点元素时） */
(function () {
  if (window.matchMedia('(pointer: coarse)').matches) return; // 触屏跳过
  var css = document.createElement('style');
  css.textContent =
    '*,*::before,*::after{cursor:none!important;}' +
    '.rm-cursor{position:fixed;top:0;left:0;width:40px;height:40px;pointer-events:none;z-index:9999;' +
      'background:url(assets/cursor.png) no-repeat center/contain;' +
      'transform:translate(-12%,-12%);transition:width .15s ease,height .15s ease;}' +
    '.rm-cursor.click{width:52px;height:52px;' +
      'background-image:url(assets/cursor-click.png);}';
  document.head.appendChild(css);

  var dot = document.createElement('div');
  dot.className = 'rm-cursor';
  document.body.appendChild(dot);

  var cx = -100, cy = -100, tx = -100, ty = -100, raf = null;
  function loop() {
    cx += (tx - cx) * 0.65; cy += (ty - cy) * 0.65;
    dot.style.left = cx + 'px'; dot.style.top = cy + 'px';
    raf = null;
    if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) raf = requestAnimationFrame(loop);
  }
  document.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest('a,button,.friend-avatar,.photos-card,.am-card,.region-card')) dot.classList.add('click');
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest('a,button,.friend-avatar,.photos-card,.am-card,.region-card')) dot.classList.remove('click');
  });
})();
