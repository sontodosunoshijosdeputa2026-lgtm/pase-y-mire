// ============================================================
// PASE Y MIRE
// GESTIÓN DE AMIGOS Y SOLICITUDES
// ============================================================

import { apiRequest, showToast } from './utils.js';

const friendsManager = {

  init() {
    this.loadFriends();
    this.loadRequests();
    this.setupEventListeners();
    this.setupSearch();
  },


  // ==========================================================
  // AMIGOS
  // ==========================================================

  async loadFriends() {
    try {
      const data = await apiRequest('/api/friends');

      this.renderFriends(data.friends || []);

    } catch (error) {
      console.error('Error al cargar amigos:', error);
      showToast('Error al cargar amigos', 'error');
    }
  },


  renderFriends(friends) {
    const container = document.getElementById('friends-list');

    if (!container) return;

    if (!friends.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No tienes amigos aún</p>
          <button type="button"
                  onclick="document.getElementById('search-input')?.focus()">
            Buscar personas
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = friends.map(friend => `
      <div class="friend-item" data-id="${friend.id}">

        <img
          src="${friend.avatar || '/img/default-avatar.png'}"
          alt="${this.escapeHtml(friend.name)}"
        >

        <div class="friend-info">
          <h4>${this.escapeHtml(friend.name)}</h4>

          <span class="friend-rating">
            ⭐ ${Number(friend.rating || 0).toFixed(1)}
          </span>
        </div>

        <div class="friend-actions">

          <button
            type="button"
            class="btn-chat"
            data-action="chat"
            data-id="${friend.id}">
            💬
          </button>

          <button
            type="button"
            class="btn-remove"
            data-action="remove"
            data-id="${friend.id}">
            ✖
          </button>

        </div>

      </div>
    `).join('');
  },


  // ==========================================================
  // SOLICITUDES
  // ==========================================================

  async loadRequests() {
    try {
      const data = await apiRequest('/api/friends/requests');

      this.renderRequests(data.requests || []);

    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      showToast('Error al cargar solicitudes', 'error');
    }
  },


  renderRequests(requests) {
    const container = document.getElementById('friend-requests');

    if (!container) return;

    if (!requests.length) {
      container.innerHTML = `
        <p class="no-requests">
          No hay solicitudes pendientes
        </p>
      `;
      return;
    }

    container.innerHTML = requests.map(request => {

      const user = request.user || {};

      return `
        <div
          class="friend-request"
          data-id="${request.id}">

          <img
            src="${user.avatar || '/img/default-avatar.png'}"
            alt="${this.escapeHtml(user.name || 'Usuario')}"
          >

          <div class="request-info">

            <h4>
              ${this.escapeHtml(user.name || 'Usuario')}
            </h4>

            <span>
              Te envió una solicitud de amistad
            </span>

          </div>

          <div class="request-actions">

            <button
              type="button"
              class="btn-accept"
              data-action="accept"
              data-id="${request.id}">
              ✓ Aceptar
            </button>

            <button
              type="button"
              class="btn-reject"
              data-action="reject"
              data-id="${request.id}">
              ✕
            </button>

          </div>

        </div>
      `;
    }).join('');
  },


  // ==========================================================
  // BÚSQUEDA
  // ==========================================================

  setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    let searchTimeout = null;

    searchInput.addEventListener('input', event => {

      const query = event.target.value.trim();

      clearTimeout(searchTimeout);

      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }

      searchTimeout = setTimeout(async () => {

        try {

          const data = await apiRequest(
            `/api/friends/search?q=${encodeURIComponent(query)}`
          );

          this.renderSearchResults(data.users || []);

        } catch (error) {

          console.error('Error buscando usuarios:', error);

          showToast(
            'Error al buscar usuarios',
            'error'
          );

        }

      }, 300);
    });
  },


  renderSearchResults(users) {
    const container = document.getElementById('search-results');

    if (!container) return;

    if (!users.length) {
      container.innerHTML = `
        <p class="no-results">
          No se encontraron usuarios
        </p>
      `;
      return;
    }

    container.innerHTML = users.map(user => `

      <div
        class="search-result"
        data-id="${user.id}">

        <img
          src="${user.avatar || '/img/default-avatar.png'}"
          alt="${this.escapeHtml(user.name)}"
        >

        <div class="result-info">

          <h4>
            ${this.escapeHtml(user.name)}
          </h4>

          <span>
            ${this.escapeHtml(
              user.email
                ? '@' + user.email.split('@')[0]
                : ''
            )}
          </span>

        </div>

        <button
          type="button"
          class="btn-add-friend"
          data-action="addFriend"
          data-id="${user.id}">
          Agregar
        </button>

      </div>

    `).join('');
  },


  // ==========================================================
  // EVENTOS
  // ==========================================================

  setupEventListeners() {

    document.addEventListener('click', async event => {

      const acceptButton =
        event.target.closest('[data-action="accept"]');

      if (acceptButton) {
        await this.acceptRequest(
          acceptButton.dataset.id
        );
        return;
      }


      const rejectButton =
        event.target.closest('[data-action="reject"]');

      if (rejectButton) {
        await this.rejectRequest(
          rejectButton.dataset.id
        );
        return;
      }


      const removeButton =
        event.target.closest('[data-action="remove"]');

      if (removeButton) {

        if (confirm('¿Eliminar este amigo?')) {

          await this.removeFriend(
            removeButton.dataset.id
          );

        }

        return;
      }


      const addButton =
        event.target.closest('[data-action="addFriend"]');

      if (addButton) {

        await this.sendFriendRequest(
          addButton.dataset.id
        );

        return;
      }


      const chatButton =
        event.target.closest('[data-action="chat"]');

      if (chatButton) {

        location.href =
          `/chat.html?user=${encodeURIComponent(
            chatButton.dataset.id
          )}`;

      }

    });
  },


  // ==========================================================
  // ACEPTAR
  // ==========================================================

  async acceptRequest(requestId) {

    try {

      await apiRequest(
        `/api/friends/requests/${requestId}/accept`,
        {
          method: 'POST'
        }
      );

      showToast(
        'Solicitud aceptada',
        'success'
      );

      await Promise.all([
        this.loadRequests(),
        this.loadFriends()
      ]);

    } catch (error) {

      console.error(error);

      showToast(
        error.message || 'Error al aceptar solicitud',
        'error'
      );
    }
  },


  // ==========================================================
  // RECHAZAR
  // ==========================================================

  async rejectRequest(requestId) {

    try {

      await apiRequest(
        `/api/friends/requests/${requestId}/reject`,
        {
          method: 'POST'
        }
      );

      showToast(
        'Solicitud rechazada',
        'info'
      );

      await this.loadRequests();

    } catch (error) {

      console.error(error);

      showToast(
        error.message || 'Error al rechazar solicitud',
        'error'
      );
    }
  },


  // ==========================================================
  // ELIMINAR AMIGO
  // ==========================================================

  async removeFriend(friendId) {

    try {

      await apiRequest(
        `/api/friends/${friendId}`,
        {
          method: 'DELETE'
        }
      );

      showToast(
        'Amigo eliminado',
        'info'
      );

      await this.loadFriends();

    } catch (error) {

      console.error(error);

      showToast(
        error.message || 'Error al eliminar amigo',
        'error'
      );
    }
  },


  // ==========================================================
  // ENVIAR SOLICITUD
  // ==========================================================

  async sendFriendRequest(userId) {

    const button = document.querySelector(
      `.btn-add-friend[data-id="${userId}"]`
    );

    try {

      if (button) {
        button.disabled = true;
        button.textContent = 'Enviando...';
      }

      await apiRequest(
        '/api/friends/request',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: Number(userId)
          })
        }
      );

      if (button) {
        button.textContent = '✓ Enviado';
      }

      showToast(
        'Solicitud enviada',
        'success'
      );

    } catch (error) {

      console.error(error);

      if (button) {
        button.disabled = false;
        button.textContent = 'Agregar';
      }

      showToast(
        error.message || 'Error al enviar solicitud',
        'error'
      );
    }
  },


  // ==========================================================
  // SEGURIDAD HTML
  // ==========================================================

  escapeHtml(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }

};


// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener(
  'DOMContentLoaded',
  () => friendsManager.init()
);
