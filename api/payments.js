const express = require('express');

const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

// ============================================================
// CREAR PAGO
// POST /api/payments
// ============================================================

router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, method = 'pending' } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'El orderId es obligatorio'
      });
    }

    // --------------------------------------------------------
    // BUSCAR ORDEN
    // --------------------------------------------------------

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        amount,
        platform_fee,
        status,
        payment_id,
        payment_status
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error('❌ Error buscando orden:', orderError);

      return res.status(500).json({
        success: false,
        error: 'Error consultando la orden'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    if (order.buyer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tenés permiso para pagar esta orden'
      });
    }

    if (
      order.payment_status === 'paid' ||
      order.status === 'paid'
    ) {
      return res.status(409).json({
        success: false,
        error: 'La orden ya está pagada'
      });
    }

    if (
      order.status === 'cancelled' ||
      order.status === 'refunded'
    ) {
      return res.status(409).json({
        success: false,
        error: 'La orden no permite pagos'
      });
    }

    // --------------------------------------------------------
    // VALIDAR MÉTODO
    // --------------------------------------------------------

    const allowedMethods = [
      'pending',
      'wallet',
      'mercadopago',
      'card'
    ];

    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Método de pago inválido'
      });
    }

    // --------------------------------------------------------
    // CREAR REGISTRO DE PAGO
    // --------------------------------------------------------
    //
    // IMPORTANTE:
    // La integración real con Mercado Pago se conectará
    // posteriormente. Acá dejamos preparado el flujo.
    //

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        user_id: userId,
        amount: order.amount,
        method,
        status: 'pending'
      })
      .select('*')
      .single();

    if (paymentError) {
      console.error('❌ Error creando pago:', paymentError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo crear el pago'
      });
    }

    // --------------------------------------------------------
    // VINCULAR PAGO CON ORDEN
    // --------------------------------------------------------

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_id: payment.id,
        payment_status: 'pending'
      })
      .eq('id', order.id)
      .select(`
        id,
        buyer_id,
        seller_id,
        amount,
        platform_fee,
        status,
        payment_id,
        payment_status
      `)
      .single();

    if (updateError) {
      console.error(
        '❌ Error vinculando pago con orden:',
        updateError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo vincular el pago con la orden'
      });
    }

    return res.status(201).json({
      success: true,
      payment,
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ Error POST /api/payments:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// OBTENER PAGO
// GET /api/payments/:id
// ============================================================

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          id,
          buyer_id,
          seller_id,
          amount,
          status,
          payment_status
        )
      `)
      .eq('id', paymentId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo pago:', error);

      return res.status(500).json({
        success: false,
        error: 'Error consultando el pago'
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    const order = payment.orders;

    if (
      !order ||
      (
        order.buyer_id !== userId &&
        order.seller_id !== userId
      )
    ) {
      return res.status(403).json({
        success: false,
        error: 'No tenés permiso para ver este pago'
      });
    }

    return res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('❌ Error GET /api/payments/:id:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// CONFIRMAR PAGO
// PATCH /api/payments/:id/confirm
// ============================================================

router.patch('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        order_id,
        user_id,
        amount,
        method,
        status
      `)
      .eq('id', paymentId)
      .maybeSingle();

    if (paymentError) {
      console.error('❌ Error buscando pago:', paymentError);

      return res.status(500).json({
        success: false,
        error: 'Error consultando el pago'
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    if (payment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tenés permiso para confirmar este pago'
      });
    }

    if (payment.status === 'paid') {
      return res.json({
        success: true,
        message: 'El pago ya estaba confirmado',
        payment
      });
    }

    if (payment.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: 'El pago no está pendiente'
      });
    }

    // --------------------------------------------------------
    // CONFIRMAR PAGO
    // --------------------------------------------------------

    const { data: updatedPayment, error: updatePaymentError } =
      await supabase
        .from('payments')
        .update({
          status: 'paid'
        })
        .eq('id', paymentId)
        .eq('status', 'pending')
        .select('*')
        .single();

    if (updatePaymentError) {
      console.error(
        '❌ Error confirmando pago:',
        updatePaymentError
      );

      return res.status(500).json({
        success: false,
        error: 'No se pudo confirmar el pago'
      });
    }

    // --------------------------------------------------------
    // ACTUALIZAR ORDEN
    // --------------------------------------------------------

    const { data: updatedOrder, error: orderUpdateError } =
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'paid'
        })
        .eq('id', payment.order_id)
        .select(`
          id,
          buyer_id,
          seller_id,
          amount,
          platform_fee,
          status,
          payment_id,
          payment_status
        `)
        .single();

    if (orderUpdateError) {
      console.error(
        '❌ Error actualizando orden después del pago:',
        orderUpdateError
      );

      return res.status(500).json({
        success: false,
        error: 'El pago fue registrado pero no se pudo actualizar la orden'
      });
    }

    return res.json({
      success: true,
      payment: updatedPayment,
      order: updatedOrder
    });

  } catch (error) {
    console.error(
      '❌ Error PATCH /api/payments/:id/confirm:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// CANCELAR PAGO
// PATCH /api/payments/:id/cancel
// ============================================================

router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        id,
        order_id,
        user_id,
        status
      `)
      .eq('id', paymentId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error buscando pago:', error);

      return res.status(500).json({
        success: false,
        error: 'Error consultando el pago'
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    if (payment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tenés permiso para cancelar este pago'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: 'Solo se pueden cancelar pagos pendientes'
      });
    }

    const { data: updatedPayment, error: updateError } =
      await supabase
        .from('payments')
        .update({
          status: 'cancelled'
        })
        .eq('id', paymentId)
        .select('*')
        .single();

    if (updateError) {
      console.error('❌ Error cancelando pago:', updateError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo cancelar el pago'
      });
    }

    return res.json({
      success: true,
      payment: updatedPayment
    });

  } catch (error) {
    console.error('❌ Error PATCH /api/payments/:id/cancel:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
