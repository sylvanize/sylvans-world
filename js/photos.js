/* =====================================================================
   摄影总页 · 左右分栏交互（参考 grndwrk.studio）
   ---------------------------------------------------------------------
   ★★★ 后期想改东西，去哪里改？（速查表） ★★★

   | 想改什么                            | 去哪个文件、改哪里                    |
   |-------------------------------------|---------------------------------------|
   | 大标题「摄影」/英文小字/介绍/按钮文字 | photos.html 里的 PHOTOS_CONFIG        |
   | 照片集名称/地点/日期/一句话介绍       | js/data.js 的 SITE.places             |
   | 字号大小                             | photos.html 顶部 CSS 变量（--ph-*）   |
   | 左右栏宽度、边距、照片尺寸等方位      | photos.html 顶部 CSS 变量（--ph-*）   |
   | 右栏滚动快慢/顺滑度                  | 本文件搜「0.12」（阻尼系数）           |
   | 相册大图横向滑动快慢                 | 本文件搜「0.08」（阻尼系数）           |
   | 加新照片集                           | js/data.js 加一条 + photos/新文件夹    |
   | 往现有照片集加照片                   | 直接往对应文件夹丢 photo-08.jpg...     |

   数据来源：SITE.places（js/data.js）——右侧列表、左栏信息全靠它自动渲染，
   所以加新照片集完全不用碰本文件。
   ===================================================================== */

// 电脑原图，手机小图
const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
const CDN = IS_MOBILE
  ? 'https://res.cloudinary.com/jwjttap0/image/upload/w_1000,q_auto,f_auto/'
  : 'https://res.cloudinary.com/jwjttap0/image/upload/q_auto,f_auto/';

(function () {
  if (typeof SITE === 'undefined') return;

  const places = SITE.places || [];
  const total = places.length;
  if (!total) return;

  const CFG = typeof PHOTOS_CONFIG !== 'undefined' ? PHOTOS_CONFIG : {};

  /* ---------- DOM ---------- */
  const right = document.getElementById('photos-right');
  const track = document.getElementById('photos-track');
  const plName = document.getElementById('pl-name');
  const plTags = document.getElementById('pl-tags');
  const plIntro = document.getElementById('pl-intro');
  const plEnter = document.getElementById('pl-enter');
  const prCountNum = document.getElementById('pr-count-num');
  const prCountTotal = document.getElementById('pr-count-total');
  const prevBtn = document.getElementById('pl-prev');
  const nextBtn = document.getElementById('pl-next');
  const nextNameEl = document.getElementById('pl-next-name');
  const prevNameEl = document.getElementById('pl-prev-name');
  const gallerySection = document.getElementById('gallery-section');
  const galleryTitle = document.getElementById('gallery-title');
  const galleryName = document.getElementById('gallery-name');
  const galleryIntro = document.getElementById('gallery-intro');
  const galleryDate = document.getElementById('gallery-date');
  const galleryCount = document.getElementById('gallery-count');
  const galleryViewport = document.getElementById('gallery-viewport');
  const galleryTrack = document.getElementById('gallery-track');
  const backBtn = document.getElementById('back-to-regions');

  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const pad = n => String(n).padStart(2, '0');

  /* ---------- 文案配置写入左栏 ---------- */
  if (CFG.title) document.getElementById('pl-title').textContent = CFG.title;
  const subEl = document.getElementById('pl-subtitle');
  if (CFG.subtitle && subEl) subEl.textContent = CFG.subtitle;
  const descEl = document.getElementById('pl-desc');
  if (CFG.desc && descEl) descEl.textContent = CFG.desc;
  if (CFG.label) document.getElementById('pl-label').textContent = CFG.label;
  if (CFG.dateLabel) document.getElementById('pl-date-label').textContent = CFG.dateLabel;
  if (CFG.enterLabel) plEnter.textContent = CFG.enterLabel;
  if (CFG.nextLabel) document.getElementById('pl-next-label').textContent = CFG.nextLabel;
  if (CFG.prevLabel) document.getElementById('pl-prev-label').textContent = CFG.prevLabel;

  /* ---------- 渲染右侧照片列 ---------- */
  const items = [];
  places.forEach((place, i) => {
    const el = document.createElement('div');
    // 企鹅相册（data.js 里 egg:true 的最后一条）是一张"真相册"：
    // 它参与页码/联动/左栏文案，但额外叠了一张"举起相机"的图，
    // 鼠标停留时淡入（举起），移走淡出（放下）——纯 CSS 切换。
    el.className = 'pr-item' + (i === 0 ? ' active' : '') + (place.egg ? ' pg-egg' : '');
    el.innerHTML = `
      <img class="pg-down" src="${CDN}photos/${place.id}/cover.jpg" alt="${place.name}" loading="lazy" onerror="this.style.display='none'" onload="window.dispatchEvent(new Event('resize'))">
      ${place.egg ? `<img class="pg-up" src="${CDN}photos/${place.id}/photo-01.png" alt="" loading="lazy" onerror="this.style.display='none'" onload="window.dispatchEvent(new Event('resize'))">` : ''}
      <span class="pr-name">${place.name}</span>
    `;
    // 企鹅相册点击不打开相册（hover 换装就是它的交互）
    if (!place.egg) el.addEventListener('click', () => openGallery(i));
    track.appendChild(el);
    items.push(el);
  });

  prCountTotal.textContent = pad(total);

  /* ---------- 平滑阻尼滚动（右栏） ---------- */
  let target = 0;   // 目标偏移
  let current = 0;  // 当前实际偏移
  let max = 0;
  let activeIndex = 0;

  // 动态测量最大可滚动距离。
  // 关键：照片列内容高度会随图片加载、布局变化而变化，
  // 如果只在页面 load / resize 时量一次，后面轨道变高但上限没更新，
  // 就会"划到一半划不动"（相册越多越明显）。所以滚动过程中也要持续重测。
  // 注意：要用 track 的最后一个子元素算——末尾还挂了一只"企鹅彩蛋"，
  // 它不在相册 items 里，但占了轨道高度，漏掉它就会划不到企鹅。
    function measure() {
    // 上限 = 轨道内容总高 - 视口高。
    // scrollHeight 自动包含所有子元素（包括末尾企鹅），
    // 加再多相册也不会卡，永远能滑到最下面。
    max = Math.max(0, track.scrollHeight - right.clientHeight);
    target = Math.min(target, max);
    current = Math.min(current, max);
  }



  function itemTop(i) {
    return items[i] ? items[i].offsetTop : 0;
  }

  function setActive(i) {
    if (i === activeIndex) return;
    const prev = activeIndex;
    activeIndex = i;
    const place = places[i];

    if (prev === -1) {
      // 首次加载：直接填入内容，不用动画
      plName.textContent = place.name;
      plTags.textContent = `${place.country} · ${place.date || ''}`.trim();
      plIntro.textContent = place.intro || '';
    } else {
      // 后续切换：左栏文字先淡出再换内容
      [plName, plTags, plIntro].forEach(el => {
        el.classList.remove('swap-out');
        void el.offsetWidth;
        el.classList.add('swap-out');
      });
      setTimeout(() => {
        plName.textContent = place.name;
        plTags.textContent = `${place.country} · ${place.date || ''}`.trim();
        plIntro.textContent = place.intro || '';
        [plName, plTags, plIntro].forEach(el => el.classList.remove('swap-out'));
      }, 200);
    }

    prCountNum.textContent = pad(i + 1);

    // 底部 NEXT / PREV 自动带上相邻照片集名（对应参考站的 NEXT ... / PREV ...）
    const prevName = places[(i - 1 + total) % total].name;
    const nextName = places[(i + 1) % total].name;
    if (nextNameEl) nextNameEl.textContent = nextName;
    if (prevNameEl) prevNameEl.textContent = prevName;

    if (prev >= 0) items[prev].classList.remove('active');
    items[i].classList.add('active');
  }

  // 联动判定：跟随"阅读线"（视口上方 16% 那条线）当前压住的照片集。
  // 刚打开时停在第一个照片集，往下滚动时自然切换到下一个。
  function detectActive() {
    const line = current + right.clientHeight * 0.16;
    let idx = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].offsetTop <= line) idx = i;
      else break;
    }
    return idx;
  }

  // 桌面：自定义平滑滚动；触屏：交给浏览器原生滚动
  if (!isTouch) {
    right.addEventListener('wheel', e => {
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= right.clientHeight;
      target = Math.min(max, Math.max(0, target + dy));
    }, { passive: false });

    (function loop() {
      current += (target - current) * 0.12;  // ← 垂直滚动阻尼：0.12 代表顺滑度，越小越慢越顺（0.05~0.2 之间调）
      if (Math.abs(target - current) < 0.05) current = target;
      track.style.transform = `translateY(${-current}px)`;
      // 持续重测滚动上限：图片加载/布局变化导致轨道变高时，上限实时跟上，永远不会划不动
      measure();
      const idx = detectActive();
      if (idx !== activeIndex) setActive(idx);
      requestAnimationFrame(loop);
    })();

    // 上下键切换照片集
    window.addEventListener('keydown', e => {
      if (gallerySection.classList.contains('open')) return;
      if (e.key === 'ArrowDown') goTo(activeIndex + 1);
      if (e.key === 'ArrowUp') goTo(activeIndex - 1);
    });
  } else {
    right.style.overflowY = 'auto';
    right.style.scrollbarWidth = 'none';
    right.addEventListener('scroll', () => {
      const idx = detectActive();
      if (idx !== activeIndex) setActive(idx);
    });
  }

  function goTo(i) {
    i = Math.max(0, Math.min(total - 1, i));
    target = Math.max(0, Math.min(max, itemTop(i) - right.clientHeight * 0.10));
    if (isTouch) {
      right.scrollTo({ top: target, behavior: 'smooth' });
    }
  }

  prevBtn.addEventListener('click', () => goTo(activeIndex - 1));
  nextBtn.addEventListener('click', () => goTo(activeIndex + 1));
  plEnter.addEventListener('click', () => openGallery(activeIndex));

  window.addEventListener('resize', () => {
    measure();
    if (isTouch) right.scrollTo({ top: target });
  });
  window.addEventListener('load', measure);

  /* ---------- 相册大图浏览（p-del 同款：Swiper 拖拽 + 自定义防连滚翻页） ---------- */
  let gallerySwiper = null; // 当前相册的 Swiper 实例
  let gWheelAcc = 0, gWheelLock = false;   // 双指/滚轮：累积滚动量 + 翻页锁（防一次手势滚到底/回弹）

  function openGallery(i) {
    const place = places[i];
    galleryName.textContent = place.name;
    galleryIntro.textContent = place.intro || `${place.country} · ${place.date || ''}`;
    galleryDate.textContent = place.date || '';
    galleryTrack.innerHTML = '';
    if (gallerySwiper) { gallerySwiper.destroy(true, true); gallerySwiper = null; }

    // 预加载照片：只有加载成功的才加入轨道（不等全部加载完，直接显示）
    gallerySection.classList.add('open');
    initGallerySwiper();
    for (let n = 1; n <= 20; n++) {
      const idx = n;
      const probe = new Image();
      probe.onload = () => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide gs';
        const im = document.createElement('img');
        im.src = probe.src;
        im.alt = `${place.name} ${idx}`;
        im.loading = 'lazy';
        im.draggable = false;
        im.style.userSelect = 'none';
        slide.appendChild(im);
        galleryTrack.appendChild(slide);
      };
      probe.onerror = () => {};
      probe.src = `${CDN}photos/${place.id}/photo-${String(idx).padStart(2, '0')}.jpg`;
    }
  }

  function initGallerySwiper() {
    gallerySwiper = new Swiper(galleryViewport, {
      direction: 'horizontal',
      speed: 500,               // 切换动画时长（p-del 手感）
      slidesPerView: 1,
      simulateTouch: true,      // 鼠标按住拖动（跟手 + 松手惯性吸附）
      on: {
        slideChange: function () {
          galleryCount.textContent = String(this.realIndex + 1).padStart(2, '0');
        }
      }
    });
    galleryCount.textContent = '01';
  }

  function closeGallery() {
    gallerySection.classList.remove('open');
    if (gallerySwiper) { gallerySwiper.destroy(true, true); gallerySwiper = null; }
  }
  backBtn.addEventListener('click', closeGallery);

  // 点击翻页：按下抬起在同一位置 = 点击（左半上一张、右半下一张）；位移超过 15px = 拖动，交给 Swiper
  // 不做任何遮挡层，避免挡住 Swiper 的拖动和滚动
  let gNavDown = null, gNavLock = false;
  gallerySection.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('.back-btn')) return; // 返回按钮不翻页
    gNavDown = { x: e.clientX, t: Date.now() };
  });
  gallerySection.addEventListener('pointerup', e => {
    if (!gNavDown) return;
    const moved = Math.abs(e.clientX - gNavDown.x) > 15; // 拖过 = 不算点击
    const held = Date.now() - gNavDown.t > 800;          // 长按 = 不算点击
    gNavDown = null;
    if (moved || held) return;
    if (!gallerySwiper || gNavLock) return;
    if (e.clientX > window.innerWidth / 2) gallerySwiper.slideNext();
    else gallerySwiper.slidePrev();
    gNavLock = true;                                     // 动画期间忽略再次点击，一次只翻一张
    setTimeout(() => { gNavLock = false; }, 550);
  });

  // 掐掉原生图片拖拽（否则按住拖照片会触发浏览器"拖图"，抢走 Swiper 的滑动）
  galleryViewport.addEventListener('dragstart', e => e.preventDefault());

  // 滚轮 / MacBook 双指横滑：累积超过阈值才翻一屏，翻后锁 600ms（防一次手势滚到底、防惯性回弹）
  // 监听在 gallerySection 上（任何位置的双指滑动都能触发）
  gallerySection.addEventListener('wheel', e => {
    e.preventDefault();
    if (!gallerySwiper || gWheelLock) return;      // 动画未结束：忽略惯性连滚
    const dx = Math.abs(e.deltaX), dy = Math.abs(e.deltaY);
    const delta = dx >= dy ? e.deltaX : e.deltaY; // 双指横滑取 deltaX，滚轮取 deltaY
    gWheelAcc += delta;
    if (Math.abs(gWheelAcc) < 50) return;         // 没滚够 50px 不动
    const dir = gWheelAcc > 0 ? 1 : -1;
    gWheelAcc = 0;
    if (dir > 0) gallerySwiper.slideNext(); else gallerySwiper.slidePrev();
    gWheelLock = true;
    setTimeout(() => { gWheelLock = false; }, 600);
  }, { passive: false });

  /* ---------- 初始化 ---------- */
  activeIndex = -1; // 让第一次 setActive(0) 能真正填入内容
  setActive(0);
  measure();

  // URL 参数：?region=xxx 直接打开对应照片集
  const params = new URLSearchParams(location.search);
  const regionId = params.get('region');
  if (regionId) {
    const idx = places.findIndex(p => p.id === regionId);
    if (idx >= 0) openGallery(idx);
  }
})();
