const express = require('express');
const bcrypt = require('bcryptjs');

const supabase = require('../utils/supabase');
const {
  authMiddleware,
  createToken
} = require('../utils/auth');

const router = express.Router();

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

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        phone: phone || '',
        id_number: idNumber || ''
      })
      .select('id,name,email,phone,id_number,avatar,verified,rating')
      .single();

    if (error) {
      console.error('Registro:', error);

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
    console.error('Registro:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    delete user.password;

    const token = createToken(user);

    return res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Login:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno'
    });
  }
});

router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
