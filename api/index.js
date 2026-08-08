const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'tradehub-secret-key-2024';

// Conexión a Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Router de upload (Cloudinary)
let uploadRouter;
try {
  uploadRouter = require('./upload');
  app.use('/api/upload', uploadRouter);
} catch (error) {
  console.log('Cloudinary no disponible');
}

// Email de bienvenida (SendGrid)
let sendWelcomeEmail;
try {
  const sendgrid = require('../utils/sendgrid');
  sendWelcomeEmail = sendgrid.sendWelcomeEmail;
} catch (error) {
  sendWelcomeEmail = async () => {};
}

// Middleware de autenticación
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Test de API - DIAGNÓSTICO DETALLADO
app.get('/api/test', async (req, res) => {
  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.json({
        success: false,
        message: 'Variables de entorno faltantes',
        supabase: 'Error',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }
    
    // Intentar conexión
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      return res.json({
        success: false,
        message: 'Error de conexión',
        supabase: 'Desconectado',
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      });
    }
    
    res.json({
      success: true,
      message: 'API PyM funcionando',
      supabase: 'Conectado',
      data: data
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Error inesperado',
      supabase: 'Error',
      error: error.message
    });
  }
});

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, idNumber } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' });
    }
    
    // Verificar si ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }
    
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insertar usuario
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ 
        name, 
        email, 
        password: hashedPassword, 
        phone: phone || '', 
        id_number: idNumber || '' 
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Enviar email de bienvenida (opcional)
    try { 
      await sendWelcomeEmail(user.email, user.name); 
    } catch (e) {
      console.log('Error enviando email:', e.message);
    }
    
    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      }
    });
  } catch (error) {
    console.error('Error registro:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    
    // Buscar usuario
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      }
    });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Verificar token
app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email
  });
});

module.exports = app;
