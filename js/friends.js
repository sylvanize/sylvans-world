const friendsData = [
  { id: 'friend1', name: 'qubiao', solo: ['avatar.jpg','friend1.jpeg'], together: ['photo-01.jpg','photo-02.jpg','photo-03.jpg'], videos: ['video-01.mov'] },
  { id: 'friend2', name: '雪糕', solo: ['avatar.jpg','friend2.JPG'], together: ['photo-01.jpg','photo-02.jpg','photo-03.jpg','photo-04.jpg','photo-05.jpg','photo-06.jpg','photo-07.jpg','photo-08.jpg'], videos: ['video-01.mov','video-02.mov'] },
  { id: 'friend3', name: '小团体', solo: ['avatar.jpg','friend3.JPG'], together: ['photo-01.jpg','photo-02.jpg','photo-03.jpg','photo-04.jpg','photo-05.jpg'], videos: [] },
  { id: 'friend4', name: '雨', solo: ['avatar.jpg','friend4.JPG'], together: ['photo-01.jpg','photo-02.jpg','photo-03.jpg'], videos: [] },
  { id: 'friend5', name: 'friend5', solo: ['avatar.jpg'], together: ['photo-01.jpg','photo-02.jpg','photo-03.jpg','photo-04.jpg','photo-05.jpg','photo-06.jpg'], videos: [] },
  { id: 'friend6', name: 'friend6', solo: ['avatar.jpg','photo-01.jpg','photo-02.jpg','photo-03.jpg'], together: [], videos: [] }
];

const circlesContainer = document.getElementById('friends-circles');
const gallerySection = document.getElementById('friends-gallery');
const galleryGrid = document.getElementById('friends-gallery-grid');
const backBtn = document.getElementById('back-to-friends');

// 渲染圆形头像（用 avatar.jpg）
function renderCircles() {
  if (!circlesContainer) return;
  circlesContainer.innerHTML = '';
  friendsData.forEach(friend => {
    const circle = document.createElement('a');
    circle.className = 'friend-circle';
    circle.href = 'javascript:void(0)';
    circle.innerHTML = `<img src="friends/${friend.id}/solo/avatar.jpg" alt="${friend.name}"><span>${friend.name}</span>`;
    circle.addEventListener('click', (e) => {
      e.preventDefault();
      showFriendGallery(friend);
    });
    circlesContainer.appendChild(circle);
  });
}

// 显示朋友相册
function showFriendGallery(friend) {
  if (!gallerySection || !galleryGrid) return;
  circlesContainer.classList.add('hidden');
  gallerySection.classList.remove('hidden');
  galleryGrid.innerHTML = '';

  friend.solo.forEach(filename => {
    const img = document.createElement('img');
    img.src = `friends/${friend.id}/solo/${filename}`;
    img.alt = `${friend.name} solo`;
    img.loading = 'lazy';
    img.onerror = function() { this.remove(); };
    galleryGrid.appendChild(img);
  });

  friend.together.forEach(filename => {
    const img = document.createElement('img');
    img.src = `friends/${friend.id}/together/${filename}`;
    img.alt = `${friend.name} together`;
    img.loading = 'lazy';
    img.onerror = function() { this.remove(); };
    galleryGrid.appendChild(img);
  });

  friend.videos.forEach(filename => {
    const video = document.createElement('video');
    video.src = `friends/${friend.id}/together/${filename}`;
    video.controls = true;
    video.loading = 'lazy';
    video.onerror = function() { this.remove(); };
    galleryGrid.appendChild(video);
  });
}

if (backBtn) {
  backBtn.addEventListener('click', () => {
    gallerySection.classList.add('hidden');
    circlesContainer.classList.remove('hidden');
  });
}

renderCircles();
