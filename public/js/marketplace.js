// Estado global del marketplace
let marketplaceState = {
    products: [],
    filteredProducts: [],
    currentCategory: 'all',
    currentView: 'grid',
    currentUser: null,
    conversations: []
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadProducts();
    await loadConversations();
    initializeEventListeners();
});

// Verificar autenticación
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            marketplaceState.currentUser = await response.json();
            updateUserInterface();
        } else {
            window.location.href = '/index.html';
        }
    } catch (error) {
        console.error('Error checking auth:', error);
    }
}

// Actualizar interfaz de usuario
function updateUserInterface() {
    const user = marketplaceState.currentUser;
    
    // Actualizar avatar
    if (user.avatar) {
        document.getElementById('userAvatar').src = user.avatar;
    }
    
    // Mostrar badge de verificación
    if (user.verified) {
        const badge = document.getElementById('userVerified');
        badge.style.display = 'flex';
        if (user.logisticsProvider) {
            badge.classList.add('logistics');
        }
    }
    
    // Actualizar stats
    document.getElementById('userPosts').textContent = user.posts || 0;
    document.getElementById('userSales').textContent = user.sales || 0;
    document.getElementById('userMessages').textContent = user.messages || 0;
}

// Cargar productos
async function loadProducts() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/marketplace/products');
        if (response.ok) {
            marketplaceState.products = await response.json();
            marketplaceState.filteredProducts = [...marketplaceState.products];
            renderProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    } finally {
        showLoading(false);
    }
}

// Renderizar productos
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (marketplaceState.filteredProducts.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    grid.className = `products-grid ${marketplaceState.currentView === 'list' ? 'list-view' : ''}`;
    
    grid.innerHTML = marketplaceState.filteredProducts.map(product => `
        <div class="product-card" onclick="openProductModal('${product.id}')">
            <img src="${product.images[0] || '/assets/default-product.jpg'}" 
                 alt="${product.title}" 
                 class="product-image">
            <div class="product-info">
                <div class="product-header">
                    <div>
                        <h3 class="product-title">${product.title}</h3>
                        <span class="product-category">${product.category}</span>
                    </div>
                    <div class="product-price">$${product.price}</div>
                </div>
                <p class="product-description">${product.description.substring(0, 100)}...</p>
                <div class="product-footer">
                    <div class="product-seller">
                        <img src="${product.seller.avatar || '/assets/default-avatar.png'}" 
                             alt="${product.seller.name}" 
                             class="seller-avatar">
                        <span class="seller-name">
                            ${product.seller.name}
                            ${product.seller.verified ? '<i class="fas fa-check-circle" style="color: var(--verified);"></i>' : ''}
                            ${product.seller.logisticsProvider ? '<i class="fas fa-truck" style="color: var(--logistics-verified);"></i>' : ''}
                        </span>
                    </div>
                    <div class="product-actions">
                        <button class="action-btn" onclick="event.stopPropagation(); contactSeller('${product.id}')">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="action-btn" onclick="event.stopPropagation(); favoriteProduct('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Filtrar por categoría
function filterCategory(category) {
    marketplaceState.currentCategory = category;
    
    // Actualizar UI de categorías
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.category-item').classList.add('active');
    
    // Filtrar productos
    if (category === 'all') {
        marketplaceState.filteredProducts = [...marketplaceState.products];
    } else {
        marketplaceState.filteredProducts = marketplaceState.products.filter(
            p => p.category === category
        );
    }
    
    renderProducts();
}

// Ordenar productos
function sortProducts() {
    const sortValue = document.getElementById('sortSelect').value;
    
    switch(sortValue) {
        case 'price-asc':
            marketplaceState.filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            marketplaceState.filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'recent':
            marketplaceState.filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'popular':
            marketplaceState.filteredProducts.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
    }
    
    renderProducts();
}

// Cambiar vista
function setView(view) {
    marketplaceState.currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.view-btn').classList.add('active');
    
    renderProducts();
}

// Abrir modal de producto
async function openProductModal(productId) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    
    try {
        const response = await fetch(`/api/marketplace/products/${productId}`);
        const product = await response.json();
        
        modalBody.innerHTML = `
            <div class="product-detail">
                <img src="${product.images[0]}" alt="${product.title}" class="product-detail-image">
                <div class="product-detail-info">
                    <h2>${product.title}</h2>
                    <div class="product-detail-price">$${product.price}</div>
                    <div class="product-detail-meta">
                        <span class="product-detail-category">${product.category}</span>
                        <span class="product-detail-views">
                            <i class="fas fa-eye"></i> ${product.views} vistas
                        </span>
                    </div>
                    <p class="product-detail-description">${product.description}</p>
                    
                    <div class="product-detail-seller">
                        <h3>Vendedor</h3>
                        <div class="seller-detail">
                            <img src="${product.seller.avatar}" alt="${product.seller.name}">
                            <div>
                                <div class="seller-detail-name">
                                    ${product.seller.name}
                                    ${product.seller.verified ? '<span class="badge-verified"><i class="fas fa-check"></i> Verificado</span>' : ''}
                                    ${product.seller.logisticsProvider ? '<span class="badge-verified badge-logistics"><i class="fas fa-truck"></i> Logística</span>' : ''}
                                </div>
                                <div class="seller-detail-rating">
                                    <i class="fas fa-star"></i> ${product.seller.rating}/5
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="product-detail-actions">
                        <button class="btn-primary" onclick="contactSeller('${product.id}')">
                            <i class="fas fa-comment"></i> Contactar Vendedor
                        </button>
                        <button class="btn-secondary" onclick="favoriteProduct('${product.id}')">
                            <i class="fas fa-heart"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading product:', error);
    }
}

// Cerrar modal de producto
function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

// Contactar vendedor
async function contactSeller(productId) {
    closeProductModal();
    
    const product = marketplaceState.products.find(p => p.id === productId);
    if (!product) return;
    
    // Abrir chat
    await openChatWithUser(product.seller.id, product.seller.name);
}

// Abrir chat con usuario
async function openChatWithUser(userId, userName) {
    const chatModal = document.getElementById('chatModal');
    chatModal.classList.add('active');
    
    // Cargar o crear conversación
    await loadConversation(userId, userName);
}

// Cargar conversaciones
async function loadConversations() {
    try {
        const response = await fetch('/api/chat/conversations');
        if (response.ok) {
            marketplaceState.conversations = await response.json();
            renderConversations();
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// Renderizar conversaciones
function renderConversations() {
    const container = document.getElementById('chatConversations');
    
    container.innerHTML = marketplaceState.conversations.map(conv => `
        <div class="conversation-item" onclick="loadConversation('${conv.userId}', '${conv.userName}')">
            <div class="conversation-header">
                <strong>${conv.userName}</strong>
                <span class="conversation-time">${formatTime(conv.lastMessageTime)}</span>
            </div>
            <div class="conversation-preview">${conv.lastMessage}</div>
        </div>
    `).join('');
}

// Cargar conversación específica
async function loadConversation(userId, userName) {
    try {
        const response = await fetch(`/api/chat/conversation/${userId}`);
        if (response.ok) {
            const messages = await response.json();
            renderMessages(messages, userName);
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

// Renderizar mensajes
function renderMessages(messages, userName) {
    const container = document.getElementById('chatMessages');
    const currentUserId = marketplaceState.currentUser.id;
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.senderId === currentUserId ? 'sent' : 'received'}">
            <div class="message-content">${msg.content}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        </div>
    `).join('');
    
    // Scroll al final
    container.scrollTop = container.scrollHeight;
}

// Enviar mensaje
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                recipientId: currentConversationUserId,
                content: content
            })
        });
        
        if (response.ok) {
            input.value = '';
            // Recargar mensajes
            await loadConversation(currentConversationUserId, '');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Cerrar chat
function closeChat() {
    document.getElementById('chatModal').classList.remove('active');
}

// Abrir modal de nueva publicación
function openListingModal() {
    document.getElementById('listingModal').classList.add('active');
}

// Cerrar modal de publicación
function closeListingModal() {
    document.getElementById('listingModal').classList.remove('active');
}

// Enviar nueva publicación
document.getElementById('listingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/marketplace/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            closeListingModal();
            await loadProducts();
            showNotification('Publicación creada exitosamente', 'success');
        }
    } catch (error) {
        console.error('Error creating listing:', error);
        showNotification('Error al crear la publicación', 'error');
    }
});

// Mostrar/ocultar loading
function showLoading(show) {
    document.getElementById('loadingState').style.display = show ? 'block' : 'none';
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Implementar sistema de notificaciones
    alert(message);
}

// Formatear tiempo
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
}

// Inicializar event listeners
function initializeEventListeners() {
    // Búsqueda en tiempo real
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        marketplaceState.filteredProducts = marketplaceState.products.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query)
        );
        
        renderProducts();
    });
}

// Mostrar pantalla de registro de logística
function showLogisticsSignup() {
    window.location.href = '/dashboard.html?signup=logistics';
}

// Mostrar perfil
function showProfile() {
    window.location.href = '/dashboard.html';
}

// Mostrar notificaciones
function showNotifications() {
    // Implementar modal de notificaciones
    showNotification('No tienes notificaciones nuevas', 'info');
}

// Buscar productos
function searchProducts() {
    const query = document.getElementById('searchInput').value;
    // Ya se maneja en el event listener
}

// Favoritar producto
async function favoriteProduct(productId) {
    try {
        const response = await fetch(`/api/marketplace/products/${productId}/favorite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showNotification('Producto guardado en favoritos', 'success');
        }
    } catch (error) {
        console.error('Error favoriting product:', error);
    }
}

// Limpiar filtros
function clearFilters() {
    document.getElementById('searchInput').value = '';
    marketplaceState.filteredProducts = [...marketplaceState.products];
    renderProducts();
}

// Toggle filtros avanzados
function toggleFilters() {
    // Implementar modal de filtros avanzados
    showNotification('Filtros avanzados - Próximamente', 'info');
    }
