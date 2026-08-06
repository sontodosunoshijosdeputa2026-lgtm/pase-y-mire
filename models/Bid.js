const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LogisticsProvider',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  message: {
    type: String,
    default: ''
  },
  estimatedTime: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

bidSchema.index({ offer: 1, provider: 1 });

module.exports = mongoose.model('Bid', bidSchema);
