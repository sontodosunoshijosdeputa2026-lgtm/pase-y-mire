const API_URL = '/api';

async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'No se pudo iniciar sesión');
  }

  saveSession(data);

  return data;
}

async function register({
  name,
  email,
  password,
  phone,
  idNumber
}) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      email,
      password,
      phone,
      idNumber
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'No se pudo crear la cuenta');
  }

  saveSession(data);

  return data;
}

function saveSession(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}

function getToken() {
  return localStorage.getItem('token');
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

async function verifySession() {
  const token = getToken();

  if (!token) return null;

  const response = await fetch(`${API_URL}/auth/verify`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    logout();
    return null;
  }

  const data = await response.json();

  if (data.user) {
    localStorage.setItem(
      'user',
      JSON.stringify(data.user)
    );
  }

  return data.user;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/';
    return false;
  }

  return true;
}

window.PyMAuth = {
  login,
  register,
  logout,
  verifySession,
  requireAuth,
  getToken,
  getCurrentUser
};
