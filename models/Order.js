const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: items => Array.isArray(items) && items.length > 0,
        message: 'La orden debe contener al menos un producto'
      }
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    shippingCost: {
      type: Number,
      default: 0,
      min: 0
    },

    total: {
      type: Number,
      required: true,
      min: 0
    },

    marketplaceCommission: {
      type: Number,
      default: 0,
      min: 0
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null
    },

    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null
    },

    logisticsRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      default: null
    },

    status: {
      type: String,
      enum: [
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
      ],
      default: 'pending',
      index: true
    },

    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'processing',
        'approved',
        'rejected',
        'refunded'
      ],
      default: 'pending'
    },

    deliveryRequired: {
      type: Boolean,
      default: false
    },

    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      city: String,
      province: String,
      postalCode: String,
      notes: String
    },

    notes: {
      type: String,
      maxlength: 1000,
      trim: true
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    cancellationReason: {
      type: String,
      maxlength: 500,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Genera un número interno de orden.
// La unicidad final la garantiza MongoDB mediante el índice unique.
OrderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();

    this.orderNumber = `PYM-${timestamp}-${random}`;
  }

  next();
});

OrderSchema.index({ buyer: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
