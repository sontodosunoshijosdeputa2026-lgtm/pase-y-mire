// Sistema de notificaciones en tiempo real
import { apiRequest, showToast } from './utils.js';

class NotificationManager {
  constructor() {
    this.socket = null;
    this.unreadCount = 0;
    this.notifications = [];
    this.init();
  }

  init() {
    this.connectSocket();
    this.loadNotifications();
    this.setupEventListeners();
    this.setupNotificationBadge();
    this.requestPermission();
  }

  connectSocket() {
    const token = localStorage.getItem('token');
    this.socket = io(process.env.SOCKET_URL || window.location.origin, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Conectado al servidor de notificaciones');
    });

    this.socket.on('new_notification', (notification) => {
      this.handleNewNotification(notification);
    });

    this.socket.on('friend_request', (data) => {
      this.handleFriendRequest(data);
    });

    this.socket.on('friend_accepted', (data) => {
      this.handleFriendAccepted(data);
    });
  }

  async loadNotifications() {
    try {
      const data = await apiRequest('/api/notifications');
      this.notifications = data.notifications;
      this.unreadCount = data.unreadCount;
      this.renderNotifications();
      this.updateBadge();
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  }

  renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>📭 No tienes notificaciones</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications.map(n => `
      <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n._id}">
        <div class="notification-icon">${this.getIcon(n.type)}</div>
        <div class="notification-content">
          <h4>${n.title}</h4>
          <p>${n.message}</p>
          <span class="notification-time">${this.getTimeAgo(n.createdAt)}</span>
        </div>
        ${!n.read ? '<span class="unread-dot">●</span>' : ''}
      </div>
    `).join('');

    // Marcar como leídas al hacer clic
    container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        this.markAsRead(item.dataset.id);
        const url = item.dataset.url || '#';
        if (url !== '#') {
          location.href = url;
        }
      });
    });
  }

  getIcon(type) {
    const icons = {
      'message': '💬',
      'friend_request': '🤝',
      'friend_accepted': '✅',
      'bid': '💰',
      'sale': '🛍️',
      'service': '🚚',
      'system': '⚙️'
    };
    return icons[type] || '📢';
  }

  getTimeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  handleNewNotification(notification) {
    this.notifications.unshift(notification);
    this.unreadCount++;
    this.renderNotifications();
    this.updateBadge();

    // Mostrar toast
    showToast(notification.title, 'info', notification.message);
  }

  handleFriendRequest(data) {
    showToast('Nueva solicitud de amistad', 'info', 'Alguien quiere ser tu amigo');
    this.loadNotifications();
  }

  handleFriendAccepted(data) {
    showToast('Solicitud aceptada', 'success', '¡Ahora son amigos!');
    this.loadNotifications();
  }

  async markAsRead(notificationId) {
    try {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      this.unreadCount--;
      this.updateBadge();
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  }

  async markAllAsRead() {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PUT' });
      this.unreadCount = 0;
      this.updateBadge();
      this.loadNotifications();
    } catch (error) {
      showToast('Error al marcar todas como leídas', 'error');
    }
  }

  setupNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (!badge) return;

    badge.addEventListener('click', () => {
      location.href = '/notifications.html';
    });
  }

  updateBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
  }

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  showBrowserNotification(title, body, icon) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/img/logo.png'
      });
    }
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const markAllBtn = e.target.closest('[data-action="markAllRead"]');
      if (markAllBtn) {
        this.markAllAsRead();
      }

      const notifToggle = e.target.closest('[data-action="toggleNotifications"]');
      if (notifToggle) {
        const panel = document.querySelector('.notifications-panel');
        if (panel) {
          panel.classList.toggle('open');
        }
      }
    });

    // Cerrar panel al hacer clic fuera
    document.addEventListener('click', (e) => {
      const panel = document.querySelector('.notifications-panel');
      if (panel && panel.classList.contains('open')) {
        if (!panel.contains(e.target) && !e.target.closest('[data-action="toggleNotifications"]')) {
          panel.classList.remove('open');
        }
      }
    });
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.notifications = new NotificationManager();
});
