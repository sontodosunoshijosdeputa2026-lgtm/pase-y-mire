const jwt = require('jsonwebtoken');

// ⚠️ IMPORTANTE: Las variables deben estar configuradas en Vercel
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;

  // Login
  if (url === '/api/login' && method === 'POST') {
    // Validar que sea JSON
    if (req.headers['content-type'] !== 'application/json') {
      return res.status(400).json({ success: false, message: 'Content-Type debe ser application/json' });
    }

    let body = '';
    // Protección básica contra payloads gigantes (DoS)
    req.on('data', chunk => {
      if (body.length > 1e6) { // Límite de ~1MB
        req.destroy();
        return res.status(413).json({ success: false, message: 'Payload demasiado grande' });
      }
      body += chunk;
    });
    
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!JWT_SECRET || !ADMIN_USER || !ADMIN_PASS) {
          return res.status(500).json({ success: false, message: 'Error de configuración del servidor' });
        }
        
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '2h' });
          res.status(200).json({ success: true, token });
        } else {
          res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
      } catch (error) {
        res.status(400).json({ success: false, message: 'Error en el formato de la petición' });
      }
    });
    return;
  }

  // Verificar token y Datos del dashboard
  if ((url === '/api/verify' && method === 'GET') || (url === '/api/data' && method === 'GET')) {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      
      if (url === '/api/verify') {
        return res.status(200).json({ success: true, message: 'Token válido' });
      }
      
      // Si es /api/data
      return res.status(200).json({
        success: true,
        data: {
          visitas: 1247,
          usuarios: 89,
          posts: 34,
          mensaje: 'Bienvenido al espacio más libre'
        }
      });
    } catch {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
  }

  // Si llega aquí, es una ruta que no existe
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
};
