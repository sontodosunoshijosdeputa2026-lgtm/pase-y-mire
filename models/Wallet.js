const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  virtualCard: {
    cardNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    cardHolder: String,
    expiryDate: String,
    cvv: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  preferredPaymentMethod: {
    type: String,
    enum: ['mercadopago', 'transferencia', 'efectivo'],
    default: 'mercadopago'
  },
  mercadopagoAccount: {
    customerId: String,
    cardId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para generar número de tarjeta virtual automáticamente
WalletSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isNew && !this.virtualCard.cardNumber) {
    // Generar número de tarjeta virtual (formato: 4-4-4-4)
    const generateCardNumber = () => {
      const groups = [];
      for (let i = 0; i < 4; i++) {
        groups.push(Math.floor(1000 + Math.random() * 9000));
      }
      return groups.join('-');
    };
    this.virtualCard.cardNumber = generateCardNumber();
    this.virtualCard.cardHolder = 'USUARIO PYM';
    // Fecha de expiración: 5 años desde ahora
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 5);
    this.virtualCard.expiryDate = expiry.toISOString().slice(0, 7).replace('-', '/');
    // CVV de 3 dígitos
    this.virtualCard.cvv = Math.floor(100 + Math.random() * 900);
  }
  next();
});

module.exports = mongoose.model('Wallet', WalletSchema);
