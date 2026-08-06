// Manejo de perfil de usuario, fotos y reels
import { apiRequest, showToast } from './utils.js';

const profile = {
  currentUser: null,
  isOwnProfile: false,

  init() {
    this.loadProfile();
    this.setupEventListeners();
    this.setupImageUpload();
  },

  async loadProfile(userId = null) {
    try {
      const targetId = userId || this.getCurrentUserId();
      const data = await apiRequest(`/api/users/${targetId}`);
      this.currentUser = data.user;
      this.isOwnProfile = data.isOwnProfile;
      this.renderProfile();
    } catch (error) {
      showToast('Error al cargar perfil', 'error');
    }
  },

  renderProfile() {
    const container = document.getElementById('profile-container');
    if (!container) return;

    container.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">
          <img src="${this.currentUser.photo || '/img/default-avatar.png'}" alt="Avatar">
          ${this.isOwnProfile ? '<button class="change-photo-btn">📷</button>' : ''}
        </div>
        <div class="profile-info">
          <h2>${this.currentUser.name}</h2>
          <p class="username">@${this.currentUser.username}</p>
          <div class="profile-stats">
            <span><strong>${this.currentUser.products || 0}</strong> productos</span>
            <span><strong>${this.currentUser.friends || 0}</strong> amigos</span>
            <span><strong>${this.currentUser.reels || 0}</strong> reels</span>
          </div>
          ${!this.isOwnProfile ? `
            <div class="profile-actions">
              <button class="btn-friend" data-action="addFriend">➕ Agregar amigo</button>
              <button class="btn-message" data-action="message">💬 Mensaje</button>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="profile-tabs">
        <button class="tab active" data-tab="products">Productos</button>
        <button class="tab" data-tab="reels">Reels</button>
        <button class="tab" data-tab="about">Acerca de</button>
      </div>
      <div class="profile-content">
        <div id="tab-products" class="tab-content active">
          <div class="product-grid"></div>
        </div>
        <div id="tab-reels" class="tab-content">
          <div class="reels-grid"></div>
        </div>
        <div id="tab-about" class="tab-content">
          <div class="about-content"></div>
        </div>
      </div>
    `;

    this.loadProducts();
    this.loadReels();
    this.setupTabs();
  },

  async loadProducts() {
    const grid = document.querySelector('#tab-products .product-grid');
    if (!grid) return;

    try {
      const data = await apiRequest(`/api/products/user/${this.currentUser._id}`);
      grid.innerHTML = data.products.map(p => `
        <div class="product-card" onclick="location.href='/product-detail.html?id=${p._id}'">
          <img src="${p.images[0] || '/img/placeholder.jpg'}" alt="${p.title}">
          <h3>${p.title}</h3>
          <p class="price">$${p.price.toLocaleString()}</p>
        </div>
      `).join('');
    } catch (error) {
      showToast('Error al cargar productos', 'error');
    }
  },

  async loadReels() {
    const grid = document.querySelector('#tab-reels .reels-grid');
    if (!grid) return;

    try {
      const data = await apiRequest(`/api/reels/user/${this.currentUser._id}`);
      grid.innerHTML = data.reels.map(r => `
        <div class="reel-thumb" onclick="location.href='/reels.html?id=${r._id}'">
          <video src="${r.videoUrl}" muted></video>
          <div class="reel-overlay">
            <span>▶ ${r.views || 0}</span>
            <span>❤️ ${r.likes?.length || 0}</span>
          </div>
        </div>
      `).join('');
    } catch (error) {
      showToast('Error al cargar reels', 'error');
    }
  },

  setupImageUpload() {
    const uploadBtn = document.querySelector('.change-photo-btn');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
          const data = await apiRequest('/api/upload/profile', {
            method: 'POST',
            body: formData,
            headers: {}
          });
          showToast('Foto actualizada', 'success');
          location.reload();
        } catch (error) {
          showToast('Error al subir foto', 'error');
        }
      };
      input.click();
    });
  },

  setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  },

  setupEventListeners() {
    document.addEventListener('click', async (e) => {
      const friendBtn = e.target.closest('[data-action="addFriend"]');
      if (friendBtn) {
        await this.sendFriendRequest();
      }

      const messageBtn = e.target.closest('[data-action="message"]');
      if (messageBtn) {
        location.href = `/chat.html?user=${this.currentUser._id}`;
      }
    });
  },

  async sendFriendRequest() {
    try {
      await apiRequest('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ userId: this.currentUser._id })
      });
      showToast('Solicitud enviada', 'success');
    } catch (error) {
      showToast('Error al enviar solicitud', 'error');
    }
  },

  getCurrentUserId() {
    return JSON.parse(localStorage.getItem('user') || '{}').id;
  }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => profile.init());
