const express = require('express');
const crypto = require('crypto');

const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function generateCardNumber() {
  const randomPart = crypto.randomBytes(8).toString('hex');

  let digits = '';

  for (const char of randomPart) {
    digits += parseInt(char, 16).toString().padStart(2, '0');
  }

  digits = digits.replace(/\D/g, '');

  while (digits.length < 16) {
    digits += Math.floor(Math.random() * 10);
  }

  return digits.slice(0, 16);
}

function generateExpiry() {
  const now = new Date();

  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = String(
    (now.getUTCFullYear() + 5) % 100
  ).padStart(2, '0');

  return `${month}/${year}`;
}

function maskCard(number) {
  if (!number) {
    return null;
  }

  const last4 = number.slice(-4);

  return `•••• •••• •••• ${last4}`;
}

function sanitizeWallet(wallet) {
  if (!wallet) {
    return null;
  }

  return {
    id: wallet.id,
    user_id: wallet.user_id,
    balance: wallet.balance,
    card_last4: wallet.card_last4,
    card_holder: wallet.card_holder,
    card_expiry: wallet.card_expiry,
    card_active: wallet.card_active,
    card_masked: maskCard(wallet.card_number),
    created_at: wallet.created_at,
    updated_at: wallet.updated_at
  };
}

// ============================================================
// OBTENER TARJETA
// GET /api/card
// ============================================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select(`
        id,
        user_id,
        balance,
        card_number,
        card_last4,
        card_holder,
        card_expiry,
        card_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo tarjeta:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudo consultar la tarjeta'
      });
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet no encontrada'
      });
    }

    return res.json({
      success: true,
      card: sanitizeWallet(wallet)
    });

  } catch (error) {
    console.error('❌ Error GET /api/card:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// CREAR / ACTIVAR TARJETA VIRTUAL
// POST /api/card
// ============================================================

router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select(`
        id,
        user_id,
        balance,
        card_number,
        card_last4,
        card_holder,
        card_expiry,
        card_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (walletError) {
      console.error(
        '❌ Error buscando wallet:',
        walletError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo consultar la wallet'
      });
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet no encontrada'
      });
    }

    // --------------------------------------------------------
    // YA EXISTE
    // --------------------------------------------------------

    if (wallet.card_number) {
      return res.status(409).json({
        success: false,
        error: 'La tarjeta virtual ya existe',
        card: sanitizeWallet(wallet)
      });
    }

    // --------------------------------------------------------
    // GENERAR TARJETA
    // --------------------------------------------------------

    const cardNumber = generateCardNumber();
    const cardLast4 = cardNumber.slice(-4);
    const cardExpiry = generateExpiry();

    const { data: updatedWallet, error: updateError } =
      await supabase
        .from('wallets')
        .update({
          card_number: cardNumber,
          card_last4: cardLast4,
          card_holder: req.user.name,
          card_expiry: cardExpiry,
          card_active: true
        })
        .eq('id', wallet.id)
        .eq('user_id', userId)
        .select(`
          id,
          user_id,
          balance,
          card_number,
          card_last4,
          card_holder,
          card_expiry,
          card_active,
          created_at,
          updated_at
        `)
        .single();

    if (updateError) {
      console.error(
        '❌ Error creando tarjeta:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo crear la tarjeta virtual'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Tarjeta virtual creada',
      card: sanitizeWallet(updatedWallet)
    });

  } catch (error) {
    console.error('❌ Error POST /api/card:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// ACTIVAR TARJETA
// PATCH /api/card/activate
// ============================================================

router.patch('/activate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error: findError } = await supabase
      .from('wallets')
      .select(`
        id,
        user_id,
        card_number,
        card_last4,
        card_holder,
        card_expiry,
        card_active,
        balance,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) {
      console.error(
        '❌ Error buscando tarjeta:',
        findError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo consultar la tarjeta'
      });
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet no encontrada'
      });
    }

    if (!wallet.card_number) {
      return res.status(404).json({
        success: false,
        error: 'Todavía no existe una tarjeta virtual'
      });
    }

    if (wallet.card_active) {
      return res.json({
        success: true,
        message: 'La tarjeta ya está activa',
        card: sanitizeWallet(wallet)
      });
    }

    const { data: updatedWallet, error: updateError } =
      await supabase
        .from('wallets')
        .update({
          card_active: true
        })
        .eq('id', wallet.id)
        .eq('user_id', userId)
        .select(`
          id,
          user_id,
          balance,
          card_number,
          card_last4,
          card_holder,
          card_expiry,
          card_active,
          created_at,
          updated_at
        `)
        .single();

    if (updateError) {
      console.error(
        '❌ Error activando tarjeta:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo activar la tarjeta'
      });
    }

    return res.json({
      success: true,
      message: 'Tarjeta activada',
      card: sanitizeWallet(updatedWallet)
    });

  } catch (error) {
    console.error(
      '❌ Error PATCH /api/card/activate:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// DESACTIVAR TARJETA
// PATCH /api/card/deactivate
// ============================================================

router.patch('/deactivate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error: findError } = await supabase
      .from('wallets')
      .select(`
        id,
        user_id,
        balance,
        card_number,
        card_last4,
        card_holder,
        card_expiry,
        card_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) {
      console.error(
        '❌ Error buscando tarjeta:',
        findError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo consultar la tarjeta'
      });
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet no encontrada'
      });
    }

    if (!wallet.card_number) {
      return res.status(404).json({
        success: false,
        error: 'Todavía no existe una tarjeta virtual'
      });
    }

    if (!wallet.card_active) {
      return res.json({
        success: true,
        message: 'La tarjeta ya estaba desactivada',
        card: sanitizeWallet(wallet)
      });
    }

    const { data: updatedWallet, error: updateError } =
      await supabase
        .from('wallets')
        .update({
          card_active: false
        })
        .eq('id', wallet.id)
        .eq('user_id', userId)
        .select(`
          id,
          user_id,
          balance,
          card_number,
          card_last4,
          card_holder,
          card_expiry,
          card_active,
          created_at,
          updated_at
        `)
        .single();

    if (updateError) {
      console.error(
        '❌ Error desactivando tarjeta:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo desactivar la tarjeta'
      });
    }

    return res.json({
      success: true,
      message: 'Tarjeta desactivada',
      card: sanitizeWallet(updatedWallet)
    });

  } catch (error) {
    console.error(
      '❌ Error PATCH /api/card/deactivate:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// ACTUALIZAR TITULAR
// PATCH /api/card/holder
// ============================================================

router.patch('/holder', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const holder = String(req.body.holder || '').trim();

    if (!holder) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del titular es obligatorio'
      });
    }

    if (holder.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del titular es demasiado largo'
      });
    }

    const { data: wallet, error: findError } = await supabase
      .from('wallets')
      .select('id, card_number')
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) {
      console.error(
        '❌ Error buscando wallet:',
        findError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo consultar la wallet'
      });
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet no encontrada'
      });
    }

    if (!wallet.card_number) {
      return res.status(404).json({
        success: false,
        error: 'Todavía no existe una tarjeta virtual'
      });
    }

    const { data: updatedWallet, error: updateError } =
      await supabase
        .from('wallets')
        .update({
          card_holder: holder
        })
        .eq('id', wallet.id)
        .eq('user_id', userId)
        .select(`
          id,
          user_id,
          balance,
          card_number,
          card_last4,
          card_holder,
          card_expiry,
          card_active,
          created_at,
          updated_at
        `)
        .single();

    if (updateError) {
      console.error(
        '❌ Error actualizando titular:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo actualizar el titular'
      });
    }

    return res.json({
      success: true,
      message: 'Titular actualizado',
      card: sanitizeWallet(updatedWallet)
    });

  } catch (error) {
    console.error(
      '❌ Error PATCH /api/card/holder:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
