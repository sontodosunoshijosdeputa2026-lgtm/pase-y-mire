const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET no está configurado');
}

// Generar token
function generateToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET no configurado');
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );
}

// ============================================
// REGISTRO
// ============================================

router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      idNumber
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, email y contraseña son obligatorios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || '',
      idNumber: idNumber || ''
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        verified: user.verified
      }
    });

  } catch (error) {
    console.error('Error registro:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================
// LOGIN
// ============================================

router.post('/login', async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son obligatorios'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        verified: user.verified,
        logisticsProvider: user.logisticsProvider,
        providerService: user.providerService,
        rating: user.rating
      }
    });

  } catch (error) {
    console.error('Error login:', error);

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================
// VERIFICAR TOKEN / PERFIL
// ============================================

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado'
      });
    }

    const token = authHeader.substring(7);

    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'JWT_SECRET no configurado'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        verified: user.verified,
        logisticsProvider: user.logisticsProvider,
        providerService: user.providerService,
        rating: user.rating,
        sales: user.sales
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
});

module.exports = router;
