const API_URL = '/api';

// Productos de ejemplo iniciales
const productosIniciales = [
  {
    id: 1,
    titulo: "Cámara Filmadora Bolex",
    descripcion: "Cámara vintage 1974. Excelente estado.",
    precio: 180000,
    distancia: 0.8,
    tipo: "patrocinado",
    imagen: "📷",
    vendedor: "VintageCam"
  },
  {
    id: 2,
    titulo: "Tocadiscos Dual 1970",
    descripcion: "Restaurado a nuevo. Funciona perfecto.",
    precio: 250000,
    distancia: 2.4,
    tipo: "organico",
    imagen: "🎵",
    vendedor: "AudioRetro"
  },
  {
    id: 3,
    titulo: "Mueble Retro Restaurado",
    descripcion: "Madera maciza. Hecho a mano.",
    precio: 95000,
    distancia: 1.1,
    tipo: "organico",
    imagen: "🪑",
    vendedor: "carpinteria_vintage"
  },
  {
    id: 4,
    titulo: "Bicicleta Urbana 2022",
    descripcion: "Poco uso. Frenos nuevos.",
    precio: 145000,
    distancia: 3.2,
    tipo: "organico",
    imagen: "🚲",
    vendedor: "BiciLocal"
  },
  {
    id: 5,
    titulo: "Notebook Gamer Ryzen 5",
    descripcion: "16GB RAM · RTX 3050 · Estado 9/10",
    precio: 520000,
    distancia: 0.5,
    tipo: "patrocinado",
    imagen: "💻",
    vendedor: "TechCerca"
  },
  {
    id: 6,
    titulo: "Silla Ergonómica Oficina",
    descripcion: "Ajustable, excelente estado.",
    precio: 78000,
    distancia: 4.0,
    tipo: "organico",
    imagen: "💺",
    vendedor: "OficinaOK"
  }
];

// Cargar productos (localStorage + iniciales)
function getProductos() {
  const guardados = localStorage.getItem('pym_productos');
  if (guardados) {
    return JSON.parse(guardados);
  }
  localStorage.setItem('pym_productos', JSON.stringify(productosIniciales));
  return productosIniciales;
}

function saveProductos(lista) {
  localStorage.setItem('pym_productos', JSON.stringify(lista));
}

function formatPrecio(num) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(num);
}

function crearCard(producto) {
  const badge = producto.tipo === 'patrocinado'
    ? `<span class="badge patrocinado">Patrocinado · ${producto.distancia} km</span>`
    : `<span class="badge organico">Orgánico · ${producto.distancia} km</span>`;

  return `
    <article class="product-card" data-tipo="${producto.tipo}">
      <div class="product-image">${producto.imagen || '📦'}</div>
      <div class="product-info">
        ${badge}
        <h3>${producto.titulo}</h3>
        <p class="desc">${producto.descripcion}</p>
        <div class="product-footer">
          <span class="precio">${formatPrecio(producto.precio)}</span>
          <span class="vendedor">@${producto.vendedor}</span>
        </div>
      </div>
    </article>
  `;
}

function renderProductos(filtro = 'all') {
  const grid = document.getElementById('productsGrid');
  let lista = getProductos();

  if (filtro === 'patrocinado') {
    lista = lista.filter(p => p.tipo === 'patrocinado');
  } else if (filtro === 'organico') {
    lista = lista.filter(p => p.tipo === 'organico');
  } else if (filtro === 'cerca') {
    lista = [...lista].sort((a, b) => a.distancia - b.distancia);
  }

  grid.innerHTML = lista.length
    ? lista.map(crearCard).join('')
    : '<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;">No hay productos todavía.</p>';
}

// Filtros
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProductos(btn.dataset.filter);
  });
});

// Modal
const modal = document.getElementById('modalPublish');
const btnPublish = document.getElementById('btnPublish');
const btnClose = document.getElementById('btnCloseModal');

btnPublish?.addEventListener('click', () => {
  modal.classList.add('open');
});

btnClose?.addEventListener('click', () => {
  modal.classList.remove('open');
});

modal?.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('open');
});

// Publicar producto
document.getElementById('publishForm')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const nuevo = {
    id: Date.now(),
    titulo: document.getElementById('titulo').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    precio: Number(document.getElementById('precio').value),
    distancia: Number(document.getElementById('distancia').value),
    tipo: document.getElementById('tipo').value,
    imagen: '📦',
    vendedor: document.getElementById('vendedor').value.trim()
  };

  const lista = getProductos();
  lista.unshift(nuevo); // lo pone primero
  saveProductos(lista);

  // Limpiar y cerrar
  e.target.reset();
  modal.classList.remove('open');
  renderProductos();
});

// Proteger la página
if (window.location.pathname.includes('marketplace')) {
  verifyToken().then(ok => {
    if (!ok) {
      removeToken();
      window.location.href = 'index.html';
    } else {
      renderProductos();
    }
  });
      }
