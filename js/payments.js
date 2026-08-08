const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },

    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    currency: {
      type: String,
      default: 'ARS',
      uppercase: true,
      trim: true
    },

    provider: {
      type: String,
      enum: ['mercadopago', 'internal', 'bank_transfer'],
      required: true,
      default: 'mercadopago'
    },

    providerPaymentId: {
      type: String,
      default: null,
      index: true
    },

    externalReference: {
      type: String,
      default: null,
      index: true
    },

    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    status: {
      type: String,
      enum: [
        'created',
        'pending',
        'processing',
        'approved',
        'rejected',
        'cancelled',
        'refunded'
      ],
      default: 'created',
      index: true
    },

    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    approvedAt: {
      type: Date,
      default: null
    },

    rejectedAt: {
      type: Date,
      default: null
    },

    refundedAt: {
      type: Date,
      default: null
    },

    failureReason: {
      type: String,
      maxlength: 500,
      default: null
    }
  },
  {
    timestamps: true
  }
);

PaymentSchema.index({ order: 1, createdAt: -1 });
PaymentSchema.index({ payer: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

// Evita dos pagos aprobados para la misma orden.
PaymentSchema.index(
  { order: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'approved'
    }
  }
);

module.exports = mongoose.model('Payment', PaymentSchema);
