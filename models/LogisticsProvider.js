const mongoose = require('mongoose');

const logisticsProviderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  serviceType: {
    type: String,
    enum: ['moto', 'remis', 'flete', 'pasajes'],
    required: true
  },
  vehicleType: {
    type: String,
    default: ''
  },
  coverageArea: {
    type: String,
    default: ''
  },
  monthlyFee: {
    type: Number,
    default: 10
  },
  commissionRate: {
    type: Number,
    default: 0.015
  },
  verified: {
    type: Boolean,
    default: false
  },
  faceVerified: {
    type: Boolean,
    default: false
  },
  paid: {
    type: Boolean,
    default: false
  },
  paymentDate: {
    type: Date
  },
  active: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 5.0
  },
  completedServices: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LogisticsProvider', logisticsProviderSchema);
