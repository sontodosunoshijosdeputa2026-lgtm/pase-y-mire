require('dotenv').config();

const express = require('express');
const cors = require('cors');

const supabase = require('../utils/supabase');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// AUTH
app.use('/api/auth', require('./auth'));

// UPLOAD
try {
  app.use('/api/upload', require('./upload'));
} catch (error) {
  console.warn('Upload no disponible:', error.message);
}

// MARKETPLACE
try {
  app.use('/api/marketplace', require('./products'));
  console.log('Marketplace cargado');
} catch (error) {
  console.error('Error cargando marketplace:', error.message);
}

// HEALTH
app.get('/api/test', async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(503).json({
        success: false,
        supabase: 'Desconectado',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'API Pase y Mire funcionando',
      supabase: 'Conectado',
      database: 'Supabase',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Pase y Mire API',
    status: 'online'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT || 3000, () => {
    console.log('Pase y Mire API iniciada');
  });
}

module.exports = app;
