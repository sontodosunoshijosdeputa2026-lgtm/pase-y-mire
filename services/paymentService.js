const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

function generateIdempotencyKey() {
  return crypto.randomUUID();
}

async function createPayment({ orderId, payerId, receiverId, provider = 'mercadopago' }) {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Orden no encontrada');
  }

  if (order.buyer.toString() !== payerId.toString()) {
    throw new Error('El comprador no coincide con la orden');
  }

  if (order.paymentStatus === 'approved') {
    throw new Error('La orden ya está pagada');
  }

  const idempotencyKey = generateIdempotencyKey();

  const payment = await Payment.create({
    order: order._id,
    payer: payerId,
    receiver: receiverId,
    amount: order.total,
    currency: 'ARS',
    provider,
    idempotencyKey,
    status: 'created',
    externalReference: order.orderNumber
  });

  return payment;
}

async function markPaymentProcessing(paymentId) {
  return Payment.findByIdAndUpdate(
    paymentId,
    { status: 'processing' },
    { new: true, runValidators: true }
  );
}

async function markPaymentApproved(paymentId, providerPaymentId, metadata = {}) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error('Pago no encontrado');
  }

  if (payment.status === 'approved') {
    return payment;
  }

  payment.status = 'approved';
  payment.providerPaymentId = providerPaymentId || payment.providerPaymentId;
  payment.metadata = metadata;
  payment.approvedAt = new Date();

  await payment.save();

  await Order.findByIdAndUpdate(payment.order, {
    paymentStatus: 'approved',
    status: 'paid',
    payment: payment._id
  });

  return payment;
}

async function markPaymentRejected(paymentId, reason = null) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error('Pago no encontrado');
  }

  payment.status = 'rejected';
  payment.failureReason = reason;

  await payment.save();

  await Order.findByIdAndUpdate(payment.order, {
    paymentStatus: 'rejected'
  });

  return payment;
}

module.exports = {
  createPayment,
  markPaymentProcessing,
  markPaymentApproved,
  markPaymentRejected
};
