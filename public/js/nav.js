// Crear navbar
function createNavbar() {
  const navbar = document.createElement('nav');
  navbar.className = 'navbar';
  navbar.innerHTML = `
    <div class="nav-brand">Pase y Mire</div>
    <div class="nav-user">
      <span id="userName">Usuario</span>
      <button id="logoutBtn" class="btn-small" onclick="handleLogout()">Salir</button>
    </div>
  `;
  document.body.insertBefore(navbar, document.body.firstChild);
}

// Crear sidebar
function createSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  const menuItems = [
    { href: 'dashboard.html', text: '📊 Dashboard', icon: '📊' },
    { href: 'marketplace.html', text: ' Marketplace', icon: '🛒' },
    { href: 'orders.html', text: ' Pedidos', icon: '' },
    { href: 'wallet.html', text: '💳 Billetera', icon: '💳' },
    { href: 'logistics.html', text: ' Logística', icon: '🚚' },
    { href: 'advertising.html', text: '📢 Publicidad', icon: '📢' },
    { href: 'reels.html', text: '🎬 Reels', icon: '🎬' },
    { href: 'prestadores.html', text: ' Prestadores', icon: '' },
    { href: 'admin.html', text: '⚙️ Admin', icon: '⚙️' }
  ];
  
  let menuHTML = '';
  menuItems.forEach(item => {
    const isActive = currentPage === item.href ? 'active' : '';
    menuHTML += `<a href="/${item.href}" class="${isActive}">${item.text}</a>`;
  });
  
  sidebar.innerHTML = menuHTML;
  document.body.appendChild(sidebar);
  
  // Agregar clase main-content al contenido existente
  const mainContent = document.querySelector('main') || document.body;
  if (!mainContent.classList.contains('main-content')) {
    mainContent.classList.add('main-content');
  }
}

// Inicializar navegación
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  // Si hay token, mostrar navbar y sidebar
  if (token && user) {
    const userData = JSON.parse(user);
    createNavbar();
    createSidebar();
    
    // Actualizar nombre de usuario
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = userData.name;
    }
    
    // Configurar logout
    window.handleLogout = function() {
      if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    };
  }
});
