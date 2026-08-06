// Sistema de chat con WebSockets y llamadas
import { apiRequest, showToast } from './utils.js';

class ChatManager {
  constructor() {
    this.socket = null;
    this.currentConversation = null;
    this.userId = JSON.parse(localStorage.getItem('user') || '{}').id;
    this.isTyping = false;
    this.typingTimeout = null;
    this.init();
  }

  init() {
    this.connectSocket();
    this.loadConversations();
    this.setupEventListeners();
    this.setupMessageInput();
  }

  connectSocket() {
    const token = localStorage.getItem('token');
    this.socket = io(process.env.SOCKET_URL || window.location.origin, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Conectado al servidor de chat');
    });

    this.socket.on('new_message', (data) => {
      this.handleNewMessage(data);
    });

    this.socket.on('user_typing', (data) => {
      this.handleTyping(data);
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor de chat');
    });
  }

  async loadConversations() {
    try {
      const data = await apiRequest('/api/chat/conversations');
      this.renderConversations(data.conversations);
    } catch (error) {
      showToast('Error al cargar conversaciones', 'error');
    }
  }

  renderConversations(conversations) {
    const container = document.getElementById('conversations-list');
    if (!container) return;

    if (conversations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No tienes conversaciones aún</p>
          <button onclick="location.href='/friends.html'">Buscar amigos</button>
        </div>
      `;
      return;
    }

    container.innerHTML = conversations.map(c => {
      const otherUser = c.participants.find(p => p._id !== this.userId);
      return `
        <div class="conversation-item" data-id="${c._id}" onclick="chat.selectConversation('${c._id}')">
          <img src="${otherUser?.photo || '/img/default-avatar.png'}" alt="${otherUser?.name}">
          <div class="conversation-info">
            <div class="conversation-name">${otherUser?.name || 'Usuario'}</div>
            <div class="conversation-last">${c.lastMessage?.content || 'Sin mensajes'}</div>
          </div>
          ${c.unreadCount ? `<span class="unread-badge">${c.unreadCount}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  async selectConversation(conversationId) {
    this.currentConversation = conversationId;
    document.querySelectorAll('.conversation-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === conversationId);
    });

    try {
      const data = await apiRequest(`/api/chat/messages/${conversationId}`);
      this.renderMessages(data.messages);
      this.markAsRead(conversationId);
    } catch (error) {
      showToast('Error al cargar mensajes', 'error');
    }
  }

  renderMessages(messages) {
    const container = document.getElementById('messages-container');
    if (!container) return;

    container.innerHTML = messages.map(m => `
      <div class="message ${m.sender._id === this.userId ? 'sent' : 'received'}">
        <div class="message-content">${m.content}</div>
        <div class="message-time">${new Date(m.createdAt).toLocaleTimeString()}</div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  setupMessageInput() {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');

    if (!input || !sendBtn) return;

    input.addEventListener('input', () => {
      if (!this.isTyping && this.currentConversation) {
        this.isTyping = true;
        this.socket.emit('typing', {
          conversationId: this.currentConversation,
          isTyping: true
        });
      }

      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.isTyping = false;
        if (this.currentConversation) {
          this.socket.emit('typing', {
            conversationId: this.currentConversation,
            isTyping: false
          });
        }
      }, 1000);
    });

    sendBtn.addEventListener('click', () => this.sendMessage());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content || !this.currentConversation) return;

    this.socket.emit('send_message', {
      conversationId: this.currentConversation,
      content
    });

    input.value = '';
    this.isTyping = false;
  }

  handleNewMessage(data) {
    if (data.conversationId === this.currentConversation) {
      this.renderMessages([data.message]);
    }
    this.loadConversations(); // Actualizar lista de conversaciones
  }

  handleTyping(data) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;

    if (data.isTyping && data.userId !== this.userId) {
      const user = document.querySelector(`.conversation-item[data-id="${data.conversationId}"] .conversation-name`);
      indicator.textContent = `${user?.textContent || 'Usuario'} está escribiendo...`;
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  async markAsRead(conversationId) {
    try {
      await apiRequest(`/api/chat/messages/${conversationId}/read`, {
        method: 'PUT'
      });
    } catch (error) {
      console.error('Error al marcar como leído:', error);
    }
  }

  setupEventListeners() {
    // Iniciar llamada
    document.addEventListener('click', (e) => {
      const callBtn = e.target.closest('[data-action="call"]');
      if (callBtn && this.currentConversation) {
        this.startCall();
      }
    });
  }

  startCall() {
    // Implementación básica de WebRTC
    showToast('Función de llamada en desarrollo', 'info');
    // Aquí iría la integración con WebRTC
  }

  // Crear nueva conversación con un usuario
  async createConversation(userId) {
    try {
      const data = await apiRequest('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      this.selectConversation(data.conversation._id);
      this.loadConversations();
    } catch (error) {
      showToast('Error al crear conversación', 'error');
    }
  }
}

// Instancia global
const chat = new ChatManager();
window.chat = chat;

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si hay un userId en la URL para iniciar conversación
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('user');
  if (userId) {
    setTimeout(() => chat.createConversation(userId), 500);
  }
});
