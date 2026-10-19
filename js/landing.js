/* ============================================================
   sylvan's world — 首页彩蛋逻辑（script.js）
   ------------------------------------------------------------
   功能一览：
   1. 页面加载完默认出现 1 只企鹅，自动循环播放"跺脚"帧动画
   2. 点击任意企鹅 -> 新增 1 只（上限 6 只；满员后再点不再新增）
   3. 满员后再次点击企鹅 -> 所有企鹅"愣住"3 秒，然后继续跺脚
   4. 点击页面空白处 -> 跳转 home.html；点击企鹅不会触发跳转
   5. 帧图片全部预加载，切换不闪烁
   6. 预留了"点击对话弹窗"的扩展位（见文件末尾）
   ============================================================ */

(function () {
  'use strict';

  /* ---------- ① 配置区：想调整参数，改这里就行 ---------- */

  // 企鹅总数上限
  // 说明：需求文字里写的是 5，但"最终效果图"里是 6 只企鹅，
  //       且需求里"未满 6 时新增"也指向 6，所以按 6 实现。
  const MAX_PENGUINS = 6;

  // 跺脚帧动画：单帧切换间隔（毫秒）
  const FRAME_INTERVAL = 180;

  // 帧播放循环顺序：0→1→2→0→3→4→0（penguin0 是站立帧，其余是抬脚帧）
  // 数字对应下面 FRAME_PATHS 数组里的下标
  const FRAME_SEQUENCE = [0, 1, 2, 0, 3, 4, 0];

  // 5 张帧图片的文件名（与站点的 penguin0~4.png 对应）
  const FRAME_PATHS = [
    'assets/penguins/penguin0.png',
    'assets/penguins/penguin1.png',
    'assets/penguins/penguin2.png',
    'assets/penguins/penguin3.png',
    'assets/penguins/penguin4.png'
  ];

  // 满员后再点击时，企鹅"愣住"的时长（毫秒）
  const FREEZE_MS = 3000;

  // 6 个环绕位置（与 style.css 里的 data-slot 选择器一一对应）。
  // 顺序 = 企鹅出现的先后：第 1 只（初始）在标题正下方 slot 5，
  // 之后按对称顺序填：左上 → 右上 → 左下 → 右下 → 上，
  // 满 6 只时正好对称围满标题一圈（参考效果图布局）。
  const SLOT_SEQUENCE = [5, 1, 2, 3, 4, 0];

  /* ---------- ② 找到页面里的两个关键元素 ---------- */

  const landing = document.getElementById('landing');       // 整个页面容器
  const queue   = document.getElementById('penguinQueue');  // 企鹅队列容器

  /* ---------- ③ 运行时状态 ---------- */

  let count    = 0;    // 当前企鹅数量
  let frozen   = false;// 是否正处于"愣住"状态（防止重复触发）
  let frameIdx = 0;    // 帧序列的游标（当前播到第几帧）
  let timer    = null; // 帧动画的定时器句柄

  /* ---------- ④ 预加载全部帧图片 ----------
     提前把 5 张帧图加载进缓存。之后换帧只是把缓存好的图片
     重新赋给 <img>，浏览器直接从内存取，不会有白屏闪烁。 */
  const loadedFrames = FRAME_PATHS.map(function (src) {
    const img = new Image();
    img.src = src;          // 触发浏览器开始下载这张图
    return img;             // 把加载好的图片对象存起来备用
  });

  /* ---------- ⑤ 帧动画：让所有企鹅同步换帧 ---------- */

  // 把帧序列游标推进一格，并让队列里所有企鹅显示当前帧
  function nextFrame() {
    frameIdx = (frameIdx + 1) % FRAME_SEQUENCE.length;   // 循环播放
    const src = loadedFrames[FRAME_SEQUENCE[frameIdx]].src;
    queue.querySelectorAll('img').forEach(function (el) {
      el.src = src;   // 所有企鹅同步切换到同一帧
    });
  }

  // 开始跺脚（用 setInterval 每 180ms 换一帧）
  function startAnimation() {
    if (timer) return;             // 已经在播就不重复开定时器
    timer = setInterval(nextFrame, FRAME_INTERVAL);
  }

  // 停止跺脚（愣住时调用；clearInterval 后企鹅停留在当前帧）
  function stopAnimation() {
    clearInterval(timer);
    timer = null;
  }

  /* ---------- ⑥ 新增一只企鹅 ---------- */

  function addPenguin() {
    if (count >= MAX_PENGUINS) return;   // 到上限了就不再新增

    const img = document.createElement('img');
    img.className = 'penguin new';       // 'new' 类负责弹入动画
    img.dataset.slot = SLOT_SEQUENCE[count]; // 分配环绕位置（style.css 按它定位）
    img.src = loadedFrames[0].src;       // 新企鹅从"站立帧"开始
    img.alt = '企鹅';
    queue.appendChild(img);              // 放进队列容器

    count++;
    // 弹入动画结束后移除 'new' 类，避免后续 hover 等样式被干扰
    img.addEventListener('animationend', function () {
      img.classList.remove('new');
    });
  }

  /* ---------- ⑦ 满员后再点：所有企鹅愣住 3 秒 ---------- */

  function freezeAll() {
    if (frozen) return;          // 已经在愣住就不重复计时
    frozen = true;
    stopAnimation();             // 停掉跺脚，企鹅定格在当前帧
    setTimeout(function () {
      frozen = false;
      startAnimation();          // 3 秒后恢复跺脚
    }, FREEZE_MS);
  }

  /* ---------- ⑧ 点击逻辑（用"事件委托"挂在队列上） ----------
     好处：以后新增的企鹅不用单独绑定事件，点谁都生效。
     点击企鹅 -> 阻止冒泡（不触发 landing 的跳转）+ 新增/愣住。
     点击页面空白 -> 走 landing 的监听，跳转 home.html。 */

  queue.addEventListener('click', function (e) {
    // 只处理点中企鹅图片的情况
    if (!e.target.classList || !e.target.classList.contains('penguin')) return;

    e.stopPropagation();   // 关键：拦住冒泡，让 landing 收不到这次点击

    if (count < MAX_PENGUINS) {
      addPenguin();        // 未满员：新增一只
    } else {
      freezeAll();         // 已满员：全体愣住 3 秒
    }
  });

  // 页面空白处点击 -> 跳转主站（企鹅的点击已被上面 stopPropagation 拦下）
  landing.addEventListener('click', function () {
    location.href = 'home.html';
  });

  /* ---------- ⑨ 初始化：先放 1 只企鹅，然后开始跺脚 ---------- */

  addPenguin();      // 页面加载完，默认就存在 1 只企鹅
  startAnimation();  // 自动播放跺脚帧动画

  /* ---------- ⑩ 扩展预留：点击企鹅弹出对话 ----------
     以后想给企鹅加"点击弹对话气泡"的话，在 ⑧ 的 queue 点击里
     增加一个分支即可，例如：

       if (count >= MAX_PENGUINS) {
         openDialog(e.target);   // 满员后点企鹅，弹对话 + 愣住
       }

     然后在这里实现：

       function openDialog(penguinEl) {
         // 在 penguinEl 上方生成一个气泡 div，内容可来自
         // penguinEl.dataset.line（给企鹅加台词）……
       }

     结构上已经预留：企鹅 <img> 都在 queue 里、有统一的 .penguin 类，
     直接按位置计算气泡坐标即可，无需改动动画部分。
     ============================================================ */
})();
