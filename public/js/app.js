const API_URL = '/api';

async function loadDashboardData() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/data`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('visitas').textContent = data.data.visitas;
      document.getElementById('usuarios').textContent = data.data.usuarios;
      document.getElementById('posts').textContent = data.data.posts;
      document.getElementById('mensaje').textContent = data.data.mensaje;
      document.getElementById('userName').textContent = 'Admin';
    }
  } catch {
    console.error('Error cargando datos');
  }
}

// Cargar datos al iniciar dashboard
if (window.location.pathname.includes('dashboard')) {
  loadDashboardData();
}
  
