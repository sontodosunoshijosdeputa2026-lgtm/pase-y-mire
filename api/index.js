require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('../db/connect');

const app = express();

// ============================================
// CONFIGURACIÓN
// ============================================

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET no está configurado');
}

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI no está configurado');
}

// ============================================
// BASE DE DATOS
// ============================================

connectDB();

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// ============================================
// RUTAS
// ============================================

// Autenticación MongoDB
const authRouter = require('./auth');
app.use('/api/auth', authRouter);

// Upload / Cloudinary
try {
  const uploadRouter = require('./upload');
  app.use('/api/upload', uploadRouter);
  console.log('✅ Ruta de upload cargada');
} catch (error) {
  console.log('⚠️ Upload no disponible:', error.message);
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/test', async (req, res) => {
  try {
    const mongoose = require('mongoose');

    const dbState = {
      0: 'desconectado',
      1: 'conectado',
      2: 'conectando',
      3: 'desconectando'
    };

    res.json({
      success: true,
      message: 'API Pase y Mire funcionando',
      database: {
        type: 'MongoDB',
        status: dbState[mongoose.connection.readyState] || 'desconocido'
      },
      mercadopago: {
        configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error health check:', error);

    res.status(500).json({
      success: false,
      error: 'Error verificando el sistema'
    });
  }
});

// ============================================
// 404
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// ============================================
// MANEJO DE ERRORES
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
// SERVIDOR
// ============================================

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
