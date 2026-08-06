// Gestión de amigos y solicitudes
import { apiRequest, showToast } from './utils.js';

const friendsManager = {
  init() {
    this.loadFriends();
    this.loadRequests();
    this.setupEventListeners();
    this.setupSearch();
  },

  async loadFriends() {
    try {
      const data = await apiRequest('/api/friends');
      this.renderFriends(data.friends);
    } catch (error) {
      showToast('Error al cargar amigos', 'error');
    }
  },

  renderFriends(friends) {
    const container = document.getElementById('friends-list');
    if (!container) return;

    if (friends.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No tienes amigos aún</p>
          <button onclick="document.getElementById('search-input').focus()">Buscar personas</button>
        </div>
      `;
      return;
    }

    container.innerHTML = friends.map(f => `
      <div class="friend-item" data-id="${f._id}">
        <img src="${f.photo || '/img/default-avatar.png'}" alt="${f.name}">
        <div class="friend-info">
          <h4>${f.name}</h4>
          <span class="friend-status ${f.isOnline ? 'online' : 'offline'}">
            ${f.isOnline ? '🟢 En línea' : '⚪ Desconectado'}
          </span>
        </div>
        <div class="friend-actions">
          <button class="btn-chat" data-action="chat" data-id="${f._id}">💬</button>
          <button class="btn-remove" data-action="remove" data-id="${f._id}">✖</button>
        </div>
      </div>
    `).join('');
  },

  async loadRequests() {
    try {
      const data = await apiRequest('/api/friends/requests');
      this.renderRequests(data.requests);
    } catch (error) {
      showToast('Error al cargar solicitudes', 'error');
    }
  },

  renderRequests(requests) {
    const container = document.getElementById('friend-requests');
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML = '<p class="no-requests">No hay solicitudes pendientes</p>';
      return;
    }

    container.innerHTML = requests.map(r => `
      <div class="friend-request" data-id="${r._id}">
        <img src="${r.user.photo || '/img/default-avatar.png'}" alt="${r.user.name}">
        <div class="request-info">
          <h4>${r.user.name}</h4>
          <span>Te envió una solicitud de amistad</span>
        </div>
        <div class="request-actions">
          <button class="btn-accept" data-action="accept" data-id="${r._id}">✓ Aceptar</button>
          <button class="btn-reject" data-action="reject" data-id="${r._id}">✕</button>
        </div>
      </div>
    `).join('');
  },

  setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    let searchTimeout;

    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim();
      clearTimeout(searchTimeout);

      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const data = await apiRequest(`/api/users/search?q=${encodeURIComponent(query)}`);
          this.renderSearchResults(data.users);
        } catch (error) {
          showToast('Error al buscar', 'error');
        }
      }, 300);
    });
  },

  renderSearchResults(users) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = '<p class="no-results">No se encontraron usuarios</p>';
      return;
    }

    container.innerHTML = users.map(u => `
      <div class="search-result" data-id="${u._id}">
        <img src="${u.photo || '/img/default-avatar.png'}" alt="${u.name}">
        <div class="result-info">
          <h4>${u.name}</h4>
          <span>@${u.username || u.email.split('@')[0]}</span>
        </div>
        <button class="btn-add-friend" data-action="addFriend" data-id="${u._id}">
          Agregar
        </button>
      </div>
    `).join('');
  },

  setupEventListeners() {
    document.addEventListener('click', async (e) => {
      // Aceptar solicitud
      const acceptBtn = e.target.closest('[data-action="accept"]');
      if (acceptBtn) {
        await this.acceptRequest(acceptBtn.dataset.id);
      }

      // Rechazar solicitud
      const rejectBtn = e.target.closest('[data-action="reject"]');
      if (rejectBtn) {
        await this.rejectRequest(rejectBtn.dataset.id);
      }

      // Eliminar amigo
      const removeBtn = e.target.closest('[data-action="remove"]');
      if (removeBtn) {
        if (confirm('¿Eliminar este amigo?')) {
          await this.removeFriend(removeBtn.dataset.id);
        }
      }

      // Agregar amigo desde búsqueda
      const addBtn = e.target.closest('[data-action="addFriend"]');
      if (addBtn) {
        await this.sendFriendRequest(addBtn.dataset.id);
      }

      // Ir a chat
      const chatBtn = e.target.closest('[data-action="chat"]');
      if (chatBtn) {
        location.href = `/chat.html?user=${chatBtn.dataset.id}`;
      }
    });
  },

  async acceptRequest(requestId) {
    try {
      await apiRequest(`/api/friends/accept/${requestId}`, { method: 'PUT' });
      showToast('Solicitud aceptada', 'success');
      this.loadRequests();
      this.loadFriends();
    } catch (error) {
      showToast('Error al aceptar solicitud', 'error');
    }
  },

  async rejectRequest(requestId) {
    try {
      await apiRequest(`/api/friends/reject/${requestId}`, { method: 'DELETE' });
      showToast('Solicitud rechazada', 'info');
      this.loadRequests();
    } catch (error) {
      showToast('Error al rechazar solicitud', 'error');
    }
  },

  async removeFriend(friendId) {
    try {
      await apiRequest(`/api/friends/${friendId}`, { method: 'DELETE' });
      showToast('Amigo eliminado', 'info');
      this.loadFriends();
    } catch (error) {
      showToast('Error al eliminar amigo', 'error');
    }
  },

  async sendFriendRequest(userId) {
    try {
      await apiRequest('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      showToast('Solicitud enviada', 'success');
      document.querySelector(`[data-id="${userId}"] .btn-add-friend`).textContent = '✓ Enviado';
    } catch (error) {
      if (error.message.includes('ya')) {
        showToast('Ya existe una solicitud', 'warning');
      } else {
        showToast('Error al enviar solicitud', 'error');
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => friendsManager.init());
