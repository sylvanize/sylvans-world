/* 全站 BGM */
(function () {
  var base = location.pathname.includes('/friend-pages/') ? '../' : './';

  // 先建按钮
  var btn = document.createElement('button');
  btn.innerHTML = '♪';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;width:44px;height:44px;border-radius:50%;border:2px solid #1A1A1A;background:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  document.body.appendChild(btn);

  var vol = document.createElement('input');
  vol.type = 'range';
  vol.min = 0; vol.max = 100; vol.value = 40;
  vol.style.cssText = 'position:fixed;bottom:72px;right:20px;z-index:99999;width:100px;display:none;';
  document.body.appendChild(vol);
  btn.addEventListener('mouseenter', function() { vol.style.display = 'block'; });
  document.body.addEventListener('mouseleave', function() { vol.style.display = 'none'; });
  vol.addEventListener('input', function() { audio.volume = vol.value / 100; });

  // 音乐
  var audio = new Audio();
  audio.loop = true;
  audio.volume = 0.4;
  audio.preload = 'none';

  // 恢复位置
  var savedTime = parseFloat(localStorage.getItem('music_time') || '0');
  audio.currentTime = savedTime;
  setInterval(function () {
    if (!audio.paused) localStorage.setItem('music_time', audio.currentTime);
  }, 2000);

  var hasStarted = localStorage.getItem('music_started') === '1';

  function play() {
    localStorage.setItem('music_started', '1');
    if (!audio.src) audio.src = base + 'music.mp3';
    audio.play().then(function(){
      btn.innerHTML = '♪';
    }).catch(function(){});
  }
  function pause() {
    audio.pause();
    btn.innerHTML = '✕';
  }

  // 点/滑页面任意处开始
  document.addEventListener('click', function() {
    if (audio.paused) play();
  });
  document.addEventListener('touchstart', function() {
    if (audio.paused) play();
  });
  document.addEventListener('touchmove', function() {
    if (audio.paused) play();
  });
  document.addEventListener('wheel', function() {
    if (audio.paused) play();
  });
  document.addEventListener('keydown', function() {
    if (audio.paused) play();
  });

  // 按钮点击：切换
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (audio.paused) play(); else pause();
  });

  // 如果之前开始过，尝试自动播
  if (hasStarted) {
    play();
  }
})();
