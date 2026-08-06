// Feed de reels con scroll vertical estilo TikTok
import { apiRequest, showToast } from './utils.js';

const reelsFeed = {
  currentPage: 1,
  isLoading: false,
  hasMore: true,
  reels: [],
  currentIndex: 0,
  observer: null,

  init() {
    this.loadReels();
    this.setupScroll();
    this.setupEventListeners();
    this.setupIntersectionObserver();
  },

  async loadReels(page = 1, append = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const data = await apiRequest(`/api/reels?page=${page}&limit=5`);

      if (data.reels.length === 0) {
        this.hasMore = false;
        this.isLoading = false;
        return;
      }

      if (append) {
        this.reels = [...this.reels, ...data.reels];
      } else {
        this.reels = data.reels;
        this.currentIndex = 0;
      }

      this.hasMore = data.pagination.pages > page;
      this.renderReels(append);
      this.isLoading = false;

    } catch (error) {
      showToast('Error al cargar reels', 'error');
      this.isLoading = false;
    }
  },

  renderReels(append = false) {
    const container = document.getElementById('reels-container');
    if (!container) return;

    const reelsHTML = this.reels.map((reel, index) => `
      <div class="reel-item" data-index="${index}">
        <video 
          src="${reel.videoUrl}" 
          poster="${reel.thumbnail || ''}"
          muted
          loop
          playsinline
          data-reel-id="${reel._id}"
        ></video>
        <div class="reel-overlay">
          <div class="reel-user">
            <img src="${reel.user?.photo || '/img/default-avatar.png'}" alt="${reel.user?.name}">
            <span>${reel.user?.name || 'Usuario'}</span>
          </div>
          <div class="reel-description">${reel.description || ''}</div>
          <div class="reel-actions">
            <button class="reel-action like-btn" data-action="like" data-id="${reel._id}">
              <span class="icon">❤️</span>
              <span class="count">${reel.likes?.length || 0}</span>
            </button>
            <button class="reel-action comment-btn" data-action="comment" data-id="${reel._id}">
              <span class="icon">💬</span>
              <span class="count">${reel.comments?.length || 0}</span>
            </button>
            <button class="reel-action share-btn" data-action="share" data-id="${reel._id}">
              <span class="icon">↗️</span>
            </button>
          </div>
          <div class="reel-music">${reel.music?.title || '🎵 Sonido original'}</div>
        </div>
      </div>
    `).join('');

    if (append) {
      container.insertAdjacentHTML('beforeend', reelsHTML);
    } else {
      container.innerHTML = reelsHTML;
    }

    // Configurar videos
    this.setupVideos();
    this.updateActiveReel();
  },

  setupVideos() {
    document.querySelectorAll('.reel-item video').forEach(video => {
      video.addEventListener('click', () => {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });

      video.addEventListener('ended', () => {
        video.currentTime = 0;
        video.play();
      });
    });
  },

  setupScroll() {
    const container = document.getElementById('reels-container');
    if (!container) return;

    // Scroll con rueda del mouse
    let isScrolling = false;

    container.addEventListener('wheel', (e) => {
      e.preventDefault();

      if (isScrolling) return;
      isScrolling = true;

      const direction = e.deltaY > 0 ? 1 : -1;
      const newIndex = this.currentIndex + direction;

      if (newIndex >= 0 && newIndex < this.reels.length) {
        this.currentIndex = newIndex;
        this.updateActiveReel();
      }

      setTimeout(() => {
        isScrolling = false;
      }, 800);
    }, { passive: false });

    // Touch events para móvil
    let touchStartY = 0;
    let touchEndY = 0;

    container.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });

    container.addEventListener('touchend', () => {
      const diff = touchStartY - touchEndY;
      if (Math.abs(diff) > 50) {
        const direction = diff > 0 ? 1 : -1;
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.reels.length) {
          this.currentIndex = newIndex;
          this.updateActiveReel();
        }
      }
    }, { passive: true });

    // Teclado (flechas)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.reels.length) {
          this.currentIndex = newIndex;
          this.updateActiveReel();
        }
      }
    });
  },

  updateActiveReel() {
    const items = document.querySelectorAll('.reel-item');
    const videos = document.querySelectorAll('.reel-item video');

    items.forEach((item, index) => {
      const shouldBeActive = index === this.currentIndex;
      item.style.transform = `translateY(-${this.currentIndex * 100}%)`;
      
      const video = videos[index];
      if (video) {
        if (shouldBeActive) {
          video.play().catch(() => {});
          // Registrar vista
          this.registerView(video.dataset.reelId);
        } else {
          video.pause();
        }
      }
    });
  },

  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.hasMore && !this.isLoading) {
          const lastItem = entry.target;
          if (lastItem.dataset.index === String(this.reels.length - 1
