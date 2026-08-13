const express = require('express');
const db = require('../utils/db');
const { authenticateToken } = require('../utils/jwt');

const router = express.Router();

// Generar número de orden
const generateOrderNumber = () => {
  return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
};

// ============================================================
// CREAR ORDEN
// ============================================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items, delivery_address, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La orden debe contener al menos un producto'
      });
    }

    if (!delivery_address) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de entrega es requerida'
      });
    }

    let totalAmount = 0;

    // Validar y calcular total
    for (const item of items) {
      const product = await db.get(
        'SELECT price, stock FROM products WHERE id = ?',
        [item.product_id]
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Producto ${item.product_id} no encontrado`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Stock insuficiente para el producto ${item.product_id}`
        });
      }

      totalAmount += product.price * item.quantity;
    }

    // Crear orden
    const orderNumber = generateOrderNumber();
    const orderResult = await db.run(
      `INSERT INTO orders (order_number, user_id, total_amount, delivery_address, notes, status, payment_status)
       VALUES (?, ?, ?, ?, ?, 'pending', 'unpaid')`,
      [orderNumber, req.user.id, totalAmount, delivery_address, notes || null]
    );

    // Agregar ítems a la orden
    for (const item of items) {
      const product = await db.get(
        'SELECT price FROM products WHERE id = ?',
        [item.product_id]
      );

      await db.run(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderResult.id, item.product_id, item.quantity, product.price, product.price * item.quantity]
      );

      // Reducir stock
      await db.run(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Crear envío
    await db.run(
      `INSERT INTO shipments (order_id, status)
       VALUES (?, 'pending')`,
      [orderResult.id]
    );

    // Obtener orden completa
    const order = await db.get(
      'SELECT * FROM orders WHERE id = ?',
      [orderResult.id]
    );

    const orderItems = await db.all(
      `SELECT oi.*, p.name, p.image_url FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderResult.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      order: { ...order, items: orderItems }
    });

  } catch (error) {
    console.error('❌ Error creando orden:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al crear la orden'
    });
  }
});

// ============================================================
// OBTENER ÓRDENES DEL USUARIO
// ============================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orders = await db.all(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Agregar items a cada orden
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.all(
          `SELECT oi.*, p.name, p.image_url FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`,
          [order.id]
        );
        return { ...order, items };
      })
    );

    return res.json({
      success: true,
      count: ordersWithItems.length,
      orders: ordersWithItems
    });

  } catch (error) {
    console.error('❌ Error obteniendo órdenes:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener las órdenes'
    });
  }
});

// ============================================================
// OBTENER ORDEN POR ID
// ============================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.get(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    const items = await db.all(
      `SELECT oi.*, p.name, p.image_url, p.price FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [id]
    );

    const shipment = await db.get(
      'SELECT * FROM shipments WHERE order_id = ?',
      [id]
    );

    return res.json({
      success: true,
      order: { ...order, items, shipment }
    });

  } catch (error) {
    console.error('❌ Error obteniendo orden:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener la orden'
    });
  }
});

// ============================================================
// ACTUALIZAR ESTADO DE ORDEN
// ============================================================
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const order = await db.get(
      'SELECT user_id FROM orders WHERE id = ?',
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    // Solo el usuario o admin pueden actualizar
    if (req.user.id !== order.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para actualizar esta orden'
      });
    }

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (payment_status) {
      updates.push('payment_status = ?');
      values.push(payment_status);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updatedOrder = await db.get(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'Orden actualizada',
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ Error actualizando orden:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar la orden'
    });
  }
});

// ============================================================
// CANCELAR ORDEN
// ============================================================
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.get(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden cancelar órdenes pendientes'
      });
    }

    // Devolver stock
    const items = await db.all(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [id]
    );

    for (const item of items) {
      await db.run(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Cancelar orden
    await db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['cancelled', id]
    );

    return res.json({
      success: true,
      message: 'Orden cancelada'
    });

  } catch (error) {
    console.error('❌ Error cancelando orden:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al cancelar la orden'
    });
  }
});

module.exports = router;
