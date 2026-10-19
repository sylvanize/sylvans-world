// 渲染摄影预览（取前几个地区封面）
function renderPhotosPreview() {
  const grid = document.getElementById('photos-preview-grid');
  if (!grid) return;

  SITE.places.slice(0, 6).forEach(place => {
    const card = document.createElement('a');
    card.className = 'photo-preview-card';
    card.href = `photos.html?region=${place.id}`;
    card.innerHTML = `
      <img src="photos/${place.id}/cover.jpg" alt="${place.name}" loading="lazy" onerror="this.style.display='none'">
      <div class="card-label">${place.name}</div>
    `;
    grid.appendChild(card);
  });
}

// 渲染朋友圆形头像
function renderFriendsCircles() {
  const container = document.getElementById('friends-circles');
  if (!container) return;

  // 占位：4 个朋友位置
  const friends = [
    { id: 'friend1', name: 'friend 1' },
    { id: 'friend2', name: 'friend 2' },
    { id: 'friend3', name: 'friend 3' },
    { id: 'friend4', name: 'friend 4' },
  ];

  friends.forEach(friend => {
    const circle = document.createElement('div');
    circle.className = 'friend-circle';
    circle.innerHTML = `<span>${friend.name}</span>`;
    circle.addEventListener('click', () => showFriendGallery(friend.id));
    container.appendChild(circle);
  });
}

// 显示朋友合照
function showFriendGallery(friendId) {
  const circles = document.getElementById('friends-circles');
  const gallery = document.getElementById('friends-gallery');
  const grid = document.getElementById('friends-gallery-grid');

  circles.classList.add('hidden');
  gallery.classList.remove('hidden');
  grid.innerHTML = '';

  // 尝试加载合照 friends/{friendId}/photo-01.jpg 到 photo-20.jpg
  for (let i = 1; i <= 20; i++) {
    const num = i.toString().padStart(2, '0');
    const img = document.createElement('img');
    img.src = `friends/${friendId}/photo-${num}.jpg`;
    img.alt = `${friendId} ${i}`;
    img.loading = 'lazy';
    img.onerror = function() { this.remove(); };
    grid.appendChild(img);
  }
}

document.getElementById('back-to-friends').addEventListener('click', () => {
  document.getElementById('friends-gallery').classList.add('hidden');
  document.getElementById('friends-circles').classList.remove('hidden');
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  renderPhotosPreview();
  renderFriendsCircles();
});
