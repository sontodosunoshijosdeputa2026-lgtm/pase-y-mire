const API_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

async function login(username, password) {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      window.location.href = 'dashboard.html';
    } else {
      showError(data.message || 'Error al iniciar sesion');
    }
  } catch {
    showError('Error de conexion');
  }
}

async function verifyToken() {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

function logout() {
  removeToken();
  window.location.href = 'index.html';
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (el) el.textContent = msg;
}

// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    login(username, password);
  });
}

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

// Proteger dashboard
if (window.location.pathname.includes('dashboard')) {
  verifyToken().then(ok => {
    if (!ok) {
      removeToken();
      window.location.href = 'index.html';
    }
  });
}
  
