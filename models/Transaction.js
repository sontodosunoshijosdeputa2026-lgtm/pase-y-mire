const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    // Usuario que origina la operación
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Usuario que recibe la operación
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Billeteras involucradas
    fromWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      default: null
    },

    toWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      default: null
    },

    // Tipo de operación
    type: {
      type: String,
      enum: [
        'deposit',
        'withdrawal',
        'transfer',
        'payment',
        'purchase',
        'sale',
        'logistics',
        'commission',
        'refund',
        'adjustment'
      ],
      required: true
    },

    // Importe
    amount: {
      type: Number,
      required: true,
      min: 0
    },

    // Comisión aplicada
    commission: {
      type: Number,
      default: 0,
      min: 0
    },

    // Moneda
    currency: {
      type: String,
      default: 'ARS',
      uppercase: true,
      trim: true
    },

    // Estado de la operación
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded'
      ],
      default: 'pending'
    },

    // Referencias externas
    externalReference: {
      type: String,
      default: null,
      index: true
    },

    provider: {
      type: String,
      enum: [
        'internal',
        'mercadopago',
        'bank_transfer',
        'cash'
      ],
      default: 'internal'
    },

    // Identificador para evitar operaciones duplicadas
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    // Referencia a la operación comercial
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },

    // Referencia a logística
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      default: null
    },

    // Descripción visible
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Índices para búsquedas e historial
TransactionSchema.index({ fromUser: 1, createdAt: -1 });
TransactionSchema.index({ toUser: 1, createdAt: -1 });
TransactionSchema.index({ fromWallet: 1, createdAt: -1 });
TransactionSchema.index({ toWallet: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
