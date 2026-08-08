require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');

const supabase = require('../utils/supabase');
const { createToken, authMiddleware } = require('../utils/auth');

const router = express.Router();

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

    // Verificar usuario existente
    const { data: existingUser, error: searchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (searchError) {
      console.error('Error buscando usuario:', searchError);

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || '',
        id_number: idNumber || '',
        verified: false,
        rating: 5,
        posts: 0,
        sales: 0
      })
      .select('id,name,email,phone,id_number,avatar,verified,rating,posts,sales')
      .single();

    if (insertError) {
      console.error('Error creando usuario:', insertError);

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
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son obligatorios'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Error buscando usuario:', error);

      return res.status(500).json({
        success: false,
        error: 'Error consultando usuarios'
      });
    }

    if (!user) {
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

    const token = createToken(user);

    delete user.password;

    return res.json({
      success: true,
      token,
      user
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

router.get('/verify', authMiddleware, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
