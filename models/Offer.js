const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['moto', 'remis', 'flete', 'pasajes'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  fromLocation: {
    type: String,
    required: true
  },
  toLocation: {
    type: String,
    required: true
  },
  basePrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  acceptedProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LogisticsProvider'
  },
  acceptedBid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
  }
}, {
  timestamps: true
});

// Índice para buscar ofertas abiertas por tipo de servicio
offerSchema.index({ serviceType: 1, status: 1 });

module.exports = mongoose.model('Offer', offerSchema);
