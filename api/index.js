const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave-default';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';

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
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '2h' });
          res.status(200).json({ success: true, token });
        } else {
          res.status(401).json({ success: false, message: 'Credenciales invalidas' });
        }
      } catch {
        res.status(400).json({ success: false, message: 'Error en la peticion' });
      }
    });
    return;
  }

  // Verificar token
  if (url === '/api/verify' && method === 'GET') {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    try {
      jwt.verify(token, JWT_SECRET);
      res.status(200).json({ success: true, message: 'Token valido' });
    } catch {
      res.status(401).json({ success: false, message: 'Token invalido' });
    }
    return;
  }

  // Datos del dashboard
  if (url === '/api/data' && method === 'GET') {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    try {
      jwt.verify(token, JWT_SECRET);
      res.status(200).json({
        success: true,
        data: {
          visitas: 1247,
          usuarios: 89,
          posts: 34,
          mensaje: 'Bienvenido al espacio mas libre'
        }
      });
    } catch {
      res.status(401).json({ success: false, message: 'No autorizado' });
    }
    return;
  }

  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
};
               
