const express = require('express');

const supabase = require('../utils/supabase');
const { authMiddleware } = require('../utils/auth');

const router = express.Router();

// ============================================================
// ESTADOS VÁLIDOS
// ============================================================

const ALLOWED_STATUSES = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'ready_for_delivery',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded'
];

// ============================================================
// CREAR ORDEN
// POST /api/orders
// ============================================================

router.post('/', authMiddleware, async (req, res) => {
  try {
    const buyerId = req.user.id;

    const {
      productId,
      quantity = 1,
      deliveryRequired = false
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'El producto es obligatorio'
      });
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad debe ser un número entero mayor a 0'
      });
    }

    // --------------------------------------------------------
    // BUSCAR PRODUCTO
    // --------------------------------------------------------

    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        seller_id,
        title,
        price,
        status
      `)
      .eq('id', productId)
      .maybeSingle();

    if (productError) {
      console.error('❌ Error buscando producto:', productError);

      return res.status(500).json({
        success: false,
        error: 'Error consultando el producto'
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------

    if (product.status !== 'activo') {
      return res.status(409).json({
        success: false,
        error: 'El producto no está disponible'
      });
    }

    if (product.seller_id === buyerId) {
      return res.status(400).json({
        success: false,
        error: 'No podés comprar tu propio producto'
      });
    }

    const unitPrice = Number(product.price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(500).json({
        success: false,
        error: 'El precio del producto no es válido'
      });
    }

    // --------------------------------------------------------
    // CÁLCULO
    // --------------------------------------------------------

    const amount = unitPrice * parsedQuantity;

    // Por ahora la comisión queda en 0.
    // La política económica se implementará en Payments.
    const platformFee = 0;

    // --------------------------------------------------------
    // CREAR ORDEN
    // --------------------------------------------------------

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyerId,
        seller_id: product.seller_id,
        product_id: product.id,
        amount,
        platform_fee: platformFee,
        status: 'awaiting_payment',
        payment_status: 'pending',
        shipping_status: deliveryRequired
          ? 'pending'
          : 'not_required'
      })
      .select(`
        id,
        buyer_id,
        seller_id,
        product_id,
        amount,
        platform_fee,
        status,
        payment_id,
        payment_status,
        shipping_status,
        created_at,
        updated_at
      `)
      .single();

    if (orderError) {
      console.error('❌ Error creando orden:', orderError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo crear la orden'
      });
    }

    return res.status(201).json({
      success: true,
      order: {
        ...order,
        quantity: parsedQuantity,
        product: {
          id: product.id,
          title: product.title,
          price: unitPrice
        }
      }
    });

  } catch (error) {
    console.error('❌ Error POST /api/orders:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// LISTAR MIS ÓRDENES
// GET /api/orders
// ============================================================

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const role = req.query.role === 'seller'
      ? 'seller'
      : 'buyer';

    const status = req.query.status || null;

    let query = supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        product_id,
        amount,
        platform_fee,
        status,
        payment_id,
        payment_status,
        shipping_status,
        created_at,
        updated_at,
        products (
          id,
          title,
          price,
          images,
          status
        )
      `)
      .eq(
        role === 'seller'
          ? 'seller_id'
          : 'buyer_id',
        userId
      )
      .order('created_at', {
        ascending: false
      });

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Estado de orden inválido'
        });
      }

      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('❌ Error obteniendo órdenes:', error);

      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener las órdenes'
      });
    }

    return res.json({
      success: true,
      role,
      orders: orders || []
    });

  } catch (error) {
    console.error('❌ Error GET /api/orders:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// OBTENER ORDEN POR ID
// GET /api/orders/:id
// ============================================================

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        product_id,
        amount,
        platform_fee,
        status,
        payment_id,
        payment_status,
        shipping_status,
        created_at,
        updated_at,
        products (
          id,
          title,
          description,
          price,
          images,
          seller_id,
          status
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo orden:', error);

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

    // --------------------------------------------------------
    // SEGURIDAD
    // Solo comprador o vendedor pueden verla.
    // --------------------------------------------------------

    if (
      order.buyer_id !== userId &&
      order.seller_id !== userId
    ) {
      return res.status(403).json({
        success: false,
        error: 'No tenés permiso para ver esta orden'
      });
    }

    return res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('❌ Error GET /api/orders/:id:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================
// ACTUALIZAR ESTADO
// PATCH /api/orders/:id/status
// ============================================================

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'El estado es obligatorio'
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado de orden inválido'
      });
    }

    // --------------------------------------------------------
    // BUSCAR ORDEN
    // --------------------------------------------------------

    const { data: existingOrder, error: findError } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        status
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (findError) {
      console.error('❌ Error buscando orden:', findError);

      return res.status(500).json({
        success: false,
        error: 'Error consultando la orden'
      });
    }

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    // --------------------------------------------------------
    // AUTORIZACIÓN BÁSICA
    // --------------------------------------------------------

    const isBuyer = existingOrder.buyer_id === userId;
    const isSeller = existingOrder.seller_id === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: 'No tenés permiso para modificar esta orden'
      });
    }

    // --------------------------------------------------------
    // REGLAS BÁSICAS DE ESTADO
    // --------------------------------------------------------

    const currentStatus = existingOrder.status;

    const allowedTransitions = {
      pending: [
        'awaiting_payment',
        'cancelled'
      ],

      awaiting_payment: [
        'paid',
        'cancelled'
      ],

      paid: [
        'processing',
        'cancelled'
      ],

      processing: [
        'ready_for_delivery',
        'shipped',
        'cancelled'
      ],

      ready_for_delivery: [
        'shipped',
        'cancelled'
      ],

      shipped: [
        'delivered'
      ],

      delivered: [
        'completed'
      ],

      completed: [],

      cancelled: [],

      refunded: []
    };

    const possibleTransitions =
      allowedTransitions[currentStatus] || [];

    if (!possibleTransitions.includes(status)) {
      return res.status(409).json({
        success: false,
        error: `No se puede pasar de "${currentStatus}" a "${status}"`
      });
    }

    // El comprador no puede avanzar estados logísticos.
    if (
      isBuyer &&
      [
        'processing',
        'ready_for_delivery',
        'shipped'
      ].includes(status)
    ) {
      return res.status(403).json({
        success: false,
        error: 'El comprador no puede avanzar ese estado'
      });
    }

    // El vendedor no debería marcar el pedido como entregado.
    if (
      isSeller &&
      [
        'delivered',
        'completed'
      ].includes(status)
    ) {
      return res.status(403).json({
        success: false,
        error: 'El vendedor no puede completar esa etapa'
      });
    }

    // --------------------------------------------------------
    // ACTUALIZAR
    // --------------------------------------------------------

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status
      })
      .eq('id', orderId)
      .select(`
        id,
        buyer_id,
        seller_id,
        product_id,
        amount,
        platform_fee,
        status,
        payment_id,
        payment_status,
        shipping_status,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('❌ Error actualizando orden:', updateError);

      return res.status(500).json({
        success: false,
        error: 'No se pudo actualizar la orden'
      });
    }

    return res.json({
      success: true,
      order: updatedOrder
    });

  } catch (error) {
    console.error(
      '❌ Error PATCH /api/orders/:id/status:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
