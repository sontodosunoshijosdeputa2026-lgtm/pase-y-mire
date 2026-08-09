// Configuración
const API_URL = window.location.origin + '/api';

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    // Usuario logueado
    updateUI(JSON.parse(user));
  }
});

// Login
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      updateUI(data.user);
      window.location.href = '/dashboard.html';
    } else {
      alert(data.error || 'Error al iniciar sesión');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión');
  }
}

// Registro
async function handleRegister(event) {
  event.preventDefault();
  
  const formData = {
    name: document.getElementById('registerName').value,
    email: document.getElementById('registerEmail').value,
    phone: document.getElementById('registerPhone').value,
    idNumber: document.getElementById('registerIdNumber').value,
    password: document.getElementById('registerPassword').value
  };
  
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  
  if (formData.password !== confirmPassword) {
    alert('Las contraseñas no coinciden');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      updateUI(data.user);
      window.location.href = '/dashboard.html';
    } else {
      alert(data.error || 'Error al registrarse');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión');
  }
}

// Logout
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// Actualizar UI
function updateUI(user) {
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  
  if (userNameEl) userNameEl.textContent = user.name;
  if (userEmailEl) userEmailEl.textContent = user.email;
}

// Proteger ruta
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
  }
}
