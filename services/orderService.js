const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

async function createOrder({ buyerId, items, shippingAddress = null, deliveryRequired = false }) {
  if (!buyerId) {
    throw new Error('El comprador es obligatorio');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La orden debe contener productos');
  }

  const productIds = items.map(item => item.product);

  const products = await Product.find({
    _id: { $in: productIds }
  });

  if (products.length !== productIds.length) {
    throw new Error('Uno o más productos no existen');
  }

  const normalizedItems = [];
  let subtotal = 0;

  for (const item of items) {
    if (!mongoose.Types.ObjectId.isValid(item.product)) {
      throw new Error('Producto inválido');
    }

    const product = products.find(
      p => p._id.toString() === item.product.toString()
    );

    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const quantity = Number(item.quantity || 1);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Cantidad inválida');
    }

    const unitPrice = Number(product.price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Precio de producto inválido');
    }

    const itemSubtotal = unitPrice * quantity;

    normalizedItems.push({
      product: product._id,
      seller: product.seller || product.user,
      title: product.title || product.name || 'Producto',
      quantity,
      unitPrice,
      subtotal: itemSubtotal
    });

    subtotal += itemSubtotal;
  }

  const shippingCost = 0;

  // Marketplace: 0% de comisión.
  const marketplaceCommission = 0;

  const total = subtotal + shippingCost;

  return Order.create({
    buyer: buyerId,
    items: normalizedItems,
    subtotal,
    shippingCost,
    total,
    marketplaceCommission,
    shippingAddress,
    deliveryRequired,
    status: 'awaiting_payment',
    paymentStatus: 'pending'
  });
}

async function getOrderById(orderId) {
  return Order.findById(orderId)
    .populate('buyer', 'name email')
    .populate('items.product')
    .populate('items.seller', 'name email')
    .populate('payment')
    .populate('transaction')
    .populate('logisticsRequest');
}

async function updateOrderStatus(orderId, status) {
  const allowedStatuses = [
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

  if (!allowedStatuses.includes(status)) {
    throw new Error('Estado de orden inválido');
  }

  return Order.findByIdAndUpdate(
    orderId,
    { status },
    { new: true, runValidators: true }
  );
}

module.exports = {
  createOrder,
  getOrderById,
  updateOrderStatus
};
