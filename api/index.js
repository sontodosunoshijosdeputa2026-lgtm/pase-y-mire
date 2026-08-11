require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const supabase = require('../utils/supabase');
const authRouter = require('../routes/auth');
const uploadRouter = require('../routes/upload');
const friendsRouter = require('./friends');
const logisticsRouter = require('./logistics');

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const allowedOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const isWildcardOrigin = allowedOrigins.includes('*');

// ============================================================
// SEGURIDAD
// ============================================================

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin Origin (health checks, herramientas,
      // llamadas servidor-servidor, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Desarrollo / compatibilidad inicial
      if (isWildcardOrigin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origen no permitido por CORS'));
    },

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept'
    ],

    credentials: true,

    maxAge: 86400
  })
);

// ============================================================
// RATE LIMITING
// ============================================================

// Límite general.
// Se mantiene deliberadamente moderado para no romper el MVP.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 300),

  standardHeaders: 'draft-7',
  legacyHeaders: false,

  message: {
    success: false,
    error: 'Demasiadas solicitudes. Intentá nuevamente más tarde.'
  },

  skip: () => {
    return process.env.NODE_ENV === 'test';
  }
});

app.use(globalLimiter);

// ============================================================
// RATE LIMITING — AUTH
// ============================================================

// Las rutas de autenticación necesitan un límite más estricto
// para reducir intentos automatizados.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),

  standardHeaders: 'draft-7',
  legacyHeaders: false,

  message: {
    success: false,
    error: 'Demasiados intentos de autenticación. Intentá nuevamente más tarde.'
  },

  skip: () => {
    return process.env.NODE_ENV === 'test';
  }
});

// ============================================================
// BODY PARSING
// ============================================================

// JSON normal.
// Los archivos no deberían viajar directamente como JSON.
// Para eso utilizamos el sistema de upload existente.
app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || '1mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URLENCODED_BODY_LIMIT || '1mb'
  })
);

// ============================================================
// API — AUTH
// ============================================================

app.use('/api/auth', authLimiter, authRouter);

// ============================================================
// API — UPLOAD
// ============================================================

app.use('/api/upload', uploadRouter);

// ============================================================
// API — FRIENDS
// ============================================================

app.use('/api/friends', friendsRouter);

// ============================================================
// API — LOGISTICS
// ============================================================

app.use('/api/logistics', logisticsRouter);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/test', async (req, res) => {
  try {
    const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
    const hasSupabaseKey = Boolean(process.env.SUPABASE_KEY);

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      return res.status(500).json({
        success: false,
        message: 'Faltan variables de entorno de Supabase',
        supabase: 'Configuración incompleta',
        details: {
          hasUrl: hasSupabaseUrl,
          hasKey: hasSupabaseKey
        }
      });
    }

    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Supabase:', error);

      return res.status(503).json({
        success: false,
        message: 'Error de conexión con Supabase',
        supabase: 'Desconectado',
        error: {
          message: error.message,
          code: error.code || '',
          details: error.details || '',
          hint: error.hint || ''
        }
      });
    }

    return res.json({
      success: true,
      message: 'API Pase y Mire funcionando',
      supabase: 'Conectado',
      database: 'Supabase',
      environment: NODE_ENV,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health check:', error);

    return res.status(500).json({
      success: false,
      message: 'Error verificando Supabase',
      supabase: 'Error',

      error:
        NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : error.message
    });
  }
});

// ============================================================
// RUTA PRINCIPAL
// ============================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Pase y Mire API',
    status: 'online'
  });
});

// ============================================================
// 404
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// ============================================================
// MANEJO DE ERRORES
// ============================================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Error específico de CORS
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({
      success: false,
      error: 'Origen no permitido'
    });
  }

  // Payload demasiado grande
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'El contenido enviado es demasiado grande'
    });
  }

  res.status(err.status || 500).json({
    success: false,

    error:
      NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message
  });
});

// ============================================================
// SERVIDOR LOCAL
// ============================================================

if (NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Pase y Mire API en puerto ${PORT}`);
    console.log(`🌎 Entorno: ${NODE_ENV}`);
  });
}

module.exports = app;
