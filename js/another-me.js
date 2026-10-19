const scene = document.getElementById('scene');
const scene3d = document.getElementById('scene-3d');
const hoverInfo = document.getElementById('hover-info');
const hoverTitle = document.getElementById('hover-title');
const hoverCreator = document.getElementById('hover-creator');
const hoverNote = document.getElementById('hover-note');
const nowPlaying = document.getElementById('now-playing');
const playingTitle = document.getElementById('playing-title');
const audioPlayer = document.getElementById('audio-player');

let currentTrack = null;
let currentCard = null;

// 为每个类别分配3D位置
const items = [];

// 电影
SITE.films.forEach((item, i) => {
  items.push({
    ...item,
    type: 'film',
    x: -30 + (i % 4) * 20,
    y: -20 + Math.floor(i / 4) * 25,
    z: -100 - Math.random() * 200,
    rotate: (Math.random() - 0.5) * 20
  });
});

// 书籍
SITE.books.forEach((item, i) => {
  items.push({
    ...item,
    type: 'book',
    x: 20 + (i % 3) * 25,
    y: 10 + Math.floor(i / 3) * 30,
    z: -150 - Math.random() * 250,
    rotate: (Math.random() - 0.5) * 15
  });
});

// 音乐
SITE.music.forEach((item, i) => {
  items.push({
    ...item,
    type: 'music',
    x: -20 + (i % 5) * 15,
    y: 30 + Math.floor(i / 5) * 20,
    z: -80 - Math.random() * 180,
    rotate: (Math.random() - 0.5) * 25
  });
});

// 游戏
SITE.games.forEach((item, i) => {
  items.push({
    ...item,
    type: 'game',
    x: 30 + (i % 2) * 20,
    y: -30 + Math.floor(i / 2) * 25,
    z: -120 - Math.random() * 220,
    rotate: (Math.random() - 0.5) * 18
  });
});

// 渲染3D场景
function renderScene() {
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `scene-card scene-card-${item.type}`;
    card.dataset.type = item.type;
    card.dataset.id = item.title;
    
    card.innerHTML = `
      <img src="${item.cover}" alt="${item.title}" loading="lazy" onerror="this.style.display='none'">
      <div class="card-fallback" style="display:none;">${item.title}</div>
      ${item.type === 'music' ? '<div class="music-indicator"><span></span><span></span><span></span></div>' : ''}
    `;
    
    card.style.transform = `
      translateX(${item.x}vw)
      translateY(${item.y}vh)
      translateZ(${item.z}px)
      rotate(${item.rotate}deg)
    `;
    
    if (item.type === 'music') {
      card.addEventListener('click', () => playMusic(item, card));
    } else {
      card.addEventListener('mouseenter', () => showInfo(item));
      card.addEventListener('mouseleave', hideInfo);
    }
    
    scene3d.appendChild(card);
  });
}

// 鼠标移动控制3D视角
let mouseX = 0, mouseY = 0;
let currentX = 0, currentY = 0;

scene.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function animate() {
  currentX += (mouseX - currentX) * 0.05;
  currentY += (mouseY - currentY) * 0.05;
  
  const rotateX = currentY * -8;
  const rotateY = currentX * 8;
  
  scene3d.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  
  requestAnimationFrame(animate);
}

// 显示介绍
function showInfo(item) {
  hoverTitle.textContent = item.title;
  hoverCreator.textContent = `${item.creator || item.artist || ''} · ${item.year || ''}`;
  hoverNote.textContent = item.note || '';
  hoverInfo.classList.add('visible');
}

function hideInfo() {
  hoverInfo.classList.remove('visible');
}

// 播放音乐
async function playMusic(item, card) {
  if (currentTrack === item.fallbackPreview) {
    audioPlayer.pause();
    resetPlayer();
    return;
  }
  
  resetPlayer();
  
  // 尝试从iTunes获取最新预览URL
  let previewUrl = item.fallbackPreview;
  try {
    const res = await fetch(item.itunesUrl);
    const data = await res.json();
    if (data.results && data.results[0]) {
      previewUrl = data.results[0].previewUrl || previewUrl;
    }
  } catch (e) {}
  
  audioPlayer.src = previewUrl;
  audioPlayer.currentTime = 0;
  audioPlayer.play().catch(() => {});
  
  currentTrack = item.fallbackPreview;
  currentCard = card;
  card.classList.add('playing');
  
  playingTitle.textContent = `${item.title} — ${item.artist}`;
  nowPlaying.classList.add('visible');
  
  const timer = setTimeout(() => {
    audioPlayer.pause();
    resetPlayer();
  }, 15000);
  
  audioPlayer.onended = () => {
    clearTimeout(timer);
    resetPlayer();
  };
  
  audioPlayer.onpause = () => {
    clearTimeout(timer);
  };
}

function resetPlayer() {
  if (currentCard) {
    currentCard.classList.remove('playing');
  }
  currentTrack = null;
  currentCard = null;
  nowPlaying.classList.remove('visible');
}

// 初始化
renderScene();
animate();
