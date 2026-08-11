const jwt = require('jsonwebtoken');
const supabase = require('./supabase');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ Falta JWT_SECRET');
}

async function authMiddleware(req, res, next) {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Configuración de autenticación incompleta'
      });
    }

    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida'
      });
    }

    const token = header.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(
        'id,name,email,phone,id_number,avatar,verified,rating,posts,sales'
      )
      .eq('id', decoded.id)
      .maybeSingle();

    if (error) {
      console.error('❌ Error verificando usuario:', error);

      return res.status(500).json({
        success: false,
        error: 'Error verificando autenticación'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Sesión expirada'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    console.error('❌ Error en autenticación:', error);

    return res.status(401).json({
      success: false,
      error: 'Sesión inválida o expirada'
    });
  }
}

function createToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no configurado');
  }

  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar token');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

module.exports = {
  authMiddleware,
  createToken
};
