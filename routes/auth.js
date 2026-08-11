require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');

const supabase = require('../utils/supabase');
const { createToken, authMiddleware } = require('../utils/auth');

const router = express.Router();

const USER_PUBLIC_FIELDS =
  'id,name,email,phone,id_number,avatar,verified,rating,posts,sales';

const USER_AUTH_FIELDS =
  'id,name,email,phone,id_number,avatar,verified,rating,posts,sales,password';

// ============================================================
// VALIDACIÓN
// ============================================================

function normalizeEmail(email) {
  return typeof email === 'string'
    ? email.trim().toLowerCase()
    : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// REGISTRO
// ============================================================

router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      idNumber
    } = req.body || {};

    const normalizedName =
      typeof name === 'string' ? name.trim() : '';

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, email y contraseña son obligatorios'
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'El email no es válido'
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const {
      data: existingUser,
      error: searchError
    } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (searchError) {
      console.error(
        'Error buscando usuario:',
        searchError
      );

      return res.status(500).json({
        success: false,
        error: 'Error consultando usuarios'
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_ROUNDS || 12)
    );

    const {
      data: user,
      error: insertError
    } = await supabase
      .from('users')
      .insert({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        phone:
          typeof phone === 'string'
            ? phone.trim()
            : '',
        id_number:
          typeof idNumber === 'string'
            ? idNumber.trim()
            : '',
        verified: false,
        rating: 5,
        posts: 0,
        sales: 0
      })
      .select(USER_PUBLIC_FIELDS)
      .single();

    if (insertError) {
      console.error(
        'Error creando usuario:',
        insertError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo crear el usuario'
      });
    }

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error('Error registro:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// LOGIN
// ============================================================

router.post('/login', async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body || {};

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son obligatorios'
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'El email no es válido'
      });
    }

    const {
      data: user,
      error
    } = await supabase
      .from('users')
      .select(USER_AUTH_FIELDS)
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error(
        'Error buscando usuario:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'Error consultando usuarios'
      });
    }

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      id_number: user.id_number,
      avatar: user.avatar,
      verified: user.verified,
      rating: user.rating,
      posts: user.posts,
      sales: user.sales
    };

    const token = createToken(publicUser);

    return res.json({
      success: true,
      token,
      user: publicUser
    });

  } catch (error) {
    console.error('Error login:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// VERIFICAR SESIÓN
// ============================================================

router.get(
  '/verify',
  authMiddleware,
  async (req, res) => {
    return res.json({
      success: true,
      user: req.user
    });
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
