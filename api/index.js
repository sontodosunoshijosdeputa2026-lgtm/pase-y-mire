require('dotenv').config();

const express = require('express');
const cors = require('cors');

const supabase = require('../utils/supabase');

const authRouter = require('./auth');

const app = express();

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

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/test', async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(503).json({
        success: false,
        message: 'API funcionando, pero Supabase no responde',
        database: {
          type: 'Supabase',
          status: 'desconectado'
        },
        error: {
          message: error.message,
          code: error.code || null,
          details: error.details || null
        }
      });
    }

    return res.json({
      success: true,
      message: 'API Pase y Mire funcionando',
      database: {
        type: 'Supabase',
        status: 'conectado'
      },
      services: {
        mercadopago: Boolean(
          process.env.MERCADOPAGO_ACCESS_TOKEN
        ),
        cloudinary: Boolean(
          process.env.CLOUDINARY_CLOUD_NAME
        ),
        sendgrid: Boolean(
          process.env.SENDGRID_API_KEY
        )
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check:', error);

    return res.status(500).json({
      success: false,
      error: 'Error verificando el sistema'
    });
  }
});

// ============================================
// AUTH
// ============================================

app.use('/api/auth', authRouter);

// ============================================
// UPLOAD
// ============================================

try {
  const uploadRouter = require('./upload');

  app.use('/api/upload', uploadRouter);

  console.log('✅ Upload disponible');
} catch (error) {
  console.log(
    '⚠️ Upload no disponible:',
    error.message
  );
}

// ============================================
// 404
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// ============================================
// ERRORES
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message
  });
});

// ============================================
// LOCAL
// ============================================

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(
      `🚀 API Pase y Mire: puerto ${PORT}`
    );
  });
}

module.exports = app;
