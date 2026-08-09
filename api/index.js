require('dotenv').config();

const express = require('express');
const cors = require('cors');

const supabase = require('../utils/supabase');

const app = express();

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

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
// AUTENTICACIÓN
// ============================================================

const authRouter = require('../routes/auth');

app.use('/api/auth', authRouter);

// ============================================================
// UPLOAD / CLOUDINARY
// ============================================================

try {
  const uploadRouter = require('../routes/upload');

  app.use('/api/upload', uploadRouter);

  console.log('✅ Upload cargado');
} catch (error) {
  console.log('⚠️ Upload no disponible:', error.message);
}

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
    status: 'online'
  });
});

// ============================================================
// 404
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// ============================================================
// MANEJO DE ERRORES
// ============================================================

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

// ============================================================
// SERVIDOR LOCAL
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Pase y Mire API en puerto ${PORT}`);
  });
}

module.exports = app;
