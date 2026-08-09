require('dotenv').config();

const express = require('express');
const cors = require('cors');

const supabase = require('../utils/supabase');

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE GLOBAL
// ============================================================

app.disable('x-powered-by');

app.use(cors({
  origin: '*',
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
    'Authorization'
  ]
}));

app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// ============================================================
// FUNCIÓN PARA CARGAR ROUTERS DE FORMA SEGURA
// ============================================================

function mountRouter(path, modulePath, name) {
  try {
    const router = require(modulePath);

    if (typeof router !== 'function') {
      console.warn(`⚠️ ${name}: módulo sin router Express válido`);
      return false;
    }

    app.use(path, router);

    console.log(`✅ ${name} cargado en ${path}`);
    return true;

  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    return false;
  }
}

// ============================================================
// RUTAS PRINCIPALES
// ============================================================

// Autenticación
mountRouter(
  '/api/auth',
  './auth',
  'Auth'
);

// Upload / Cloudinary
mountRouter(
  '/api/upload',
  './upload',
  'Upload'
);

// ============================================================
// RUTAS FUTURAS
// ============================================================
//
// IMPORTANTE:
// Estas rutas quedan reservadas para los módulos de la aplicación.
// Los módulos se incorporarán progresivamente sin crear nuevas
// Serverless Functions en Vercel.
//
// /api/admin
// /api/advertising
// /api/card
// /api/friends
// /api/logistics
// /api/notifications
// /api/orders
// /api/payments
// /api/products
// /api/qr
// /api/reels
// /api/wallet
//
// ============================================================

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
        database: 'Supabase',
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
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health check:', error);

    return res.status(500).json({
      success: false,
      message: 'Error verificando Supabase',
      supabase: 'Error',
      error: error.message
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
    status: 'online',
    version: '1.0.0'
  });
});

// ============================================================
// INFORMACIÓN DE LA API
// ============================================================

app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'Pase y Mire API',
    version: '1.0.0',
    status: 'online',
    services: {
      auth: '/api/auth',
      upload: '/api/upload',
      health: '/api/test'
    }
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
// MANEJO CENTRALIZADO DE ERRORES
// ============================================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message
  });
});

// ============================================================
// SERVIDOR LOCAL
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Pase y Mire API en puerto ${PORT}`);
  });
}

// ============================================================
// VERCEL / EXPRESS
// ============================================================

module.exports = app;
