const express = require('express');
const crypto = require('crypto');

const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function generateQrToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizeWallet(wallet) {
  if (!wallet) return null;

  return {
    id: wallet.id,
    user_id: wallet.user_id,
    qr_token: wallet.qr_token,
    balance: wallet.balance,
    card_last4: wallet.card_last4,
    card_active: wallet.card_active,
    created_at: wallet.created_at,
    updated_at: wallet.updated_at
  };
}

// ============================================================
// OBTENER QR DEL USUARIO
// GET /api/qr
// ============================================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select(`
        id,
        user_id,
        qr_token,
        balance,
        card_last4,
        card_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo QR:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudo consultar el QR'
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
      qr: {
        token: wallet.qr_token || null,
        available: Boolean(wallet.qr_token)
      },
      wallet: sanitizeWallet(wallet)
    });

  } catch (error) {
    console.error('❌ Error GET /api/qr:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// GENERAR / REGENERAR QR
// POST /api/qr
// ============================================================

router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error: findError } = await supabase
      .from('wallets')
      .select(`
        id,
        user_id,
        qr_token,
        balance,
        card_last4,
        card_active,
        created_at,
        updated_at
      `)
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

    // --------------------------------------------------------
    // GENERAR TOKEN ÚNICO
    // --------------------------------------------------------

    let qrToken = null;
    let lastError = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateQrToken();

      const { data: existing, error: checkError } =
        await supabase
          .from('wallets')
          .select('id')
          .eq('qr_token', candidate)
          .maybeSingle();

      if (checkError) {
        lastError = checkError;
        continue;
      }

      if (!existing) {
        qrToken = candidate;
        break;
      }
    }

    if (!qrToken) {
      console.error(
        '❌ No se pudo generar token QR:',
        lastError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo generar el QR'
      });
    }

    // --------------------------------------------------------
    // GUARDAR TOKEN
    // --------------------------------------------------------

    const { data: updatedWallet, error: updateError } =
      await supabase
        .from('wallets')
        .update({
          qr_token: qrToken
        })
        .eq('id', wallet.id)
        .eq('user_id', userId)
        .select(`
          id,
          user_id,
          qr_token,
          balance,
          card_last4,
          card_active,
          created_at,
          updated_at
        `)
        .single();

    if (updateError) {
      console.error(
        '❌ Error guardando QR:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo guardar el QR'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'QR generado correctamente',
      qr: {
        token: updatedWallet.qr_token,
        available: true
      },
      wallet: sanitizeWallet(updatedWallet)
    });

  } catch (error) {
    console.error('❌ Error POST /api/qr:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// REGENERAR QR
// DELETE /api/qr
// ============================================================

router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: wallet, error: findError } = await supabase
      .from('wallets')
      .select('id, user_id')
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

    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        qr_token: null
      })
      .eq('id', wallet.id)
      .eq('user_id', userId);

    if (updateError) {
      console.error(
        '❌ Error eliminando QR:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo invalidar el QR'
      });
    }

    return res.json({
      success: true,
      message: 'QR invalidado correctamente'
    });

  } catch (error) {
    console.error('❌ Error DELETE /api/qr:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// BUSCAR WALLET POR QR
// POST /api/qr/resolve
// ============================================================

router.post('/resolve', authMiddleware, async (req, res) => {
  try {
    const token = String(
      req.body.token || ''
    ).trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'El token QR es obligatorio'
      });
    }

    if (token.length < 32 || token.length > 128) {
      return res.status(400).json({
        success: false,
        error: 'Token QR inválido'
      });
    }

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select(`
        id,
        user_id,
        qr_token,
        card_last4,
        card_active
      `)
      .eq('qr_token', token)
      .maybeSingle();

    if (error) {
      console.error(
        '❌ Error resolviendo QR:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo resolver el QR'
      });
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'QR no encontrado o inválido'
      });
    }

    if (wallet.user_id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'No podés utilizar tu propio QR como destinatario'
      });
    }

    // --------------------------------------------------------
    // BUSCAR INFORMACIÓN PÚBLICA DEL USUARIO
    // --------------------------------------------------------

    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        avatar,
        verified,
        rating
      `)
      .eq('id', wallet.user_id)
      .maybeSingle();

    if (userError) {
      console.error(
        '❌ Error obteniendo destinatario:',
        userError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo obtener el destinatario'
      });
    }

    return res.json({
      success: true,
      recipient: user
        ? {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            verified: user.verified,
            rating: user.rating
          }
        : {
            id: wallet.user_id
          },
      wallet: {
        user_id: wallet.user_id,
        card_last4: wallet.card_last4,
        card_active: wallet.card_active
      }
    });

  } catch (error) {
    console.error(
      '❌ Error POST /api/qr/resolve:',
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
