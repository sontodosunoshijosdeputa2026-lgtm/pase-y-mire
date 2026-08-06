const API_URL = '/api';

// Productos de ejemplo (después los sacamos de la base de datos)
const productos = [
  {
    id: 1,
    titulo: "Cámara Filmadora Bolex",
    descripcion: "Cámara vintage 1974. Redirección al perfil ($0,01 CPC)",
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
      <div class="product-image">${producto.imagen}</div>
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
  let lista = productos;

  if (filtro === 'patrocinado') {
    lista = productos.filter(p => p.tipo === 'patrocinado');
  } else if (filtro === 'organico') {
    lista = productos.filter(p => p.tipo === 'organico');
  } else if (filtro === 'cerca') {
    lista = [...productos].sort((a, b) => a.distancia - b.distancia);
  }

  grid.innerHTML = lista.map(crearCard).join('');
}

// Filtros
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProductos(btn.dataset.filter);
  });
});

// Botón publicar (por ahora solo aviso)
document.getElementById('btnPublish')?.addEventListener('click', () => {
  alert('Próximamente: formulario para publicar productos');
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
