const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 6
  },
  phone: {
    type: String,
    default: ''
  },
  idNumber: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: null
  },
  verified: {
    type: Boolean,
    default: false
  },
  logisticsProvider: {
    type: Boolean,
    default: false
  },
  providerService: {
    type: String,
    enum: ['moto', 'remis', 'flete', 'pasajes', null],
    default: null
  },
  providerVerified: {
    type: Boolean,
    default: false
  },
  providerPaid: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  posts: {
    type: Number,
    default: 0
  },
  sales: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// No devolver la contraseña en las consultas
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
