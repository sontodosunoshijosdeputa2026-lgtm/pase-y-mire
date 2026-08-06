const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: [100, 'El título no puede superar los 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    maxlength: [2000, 'La descripción no puede superar los 2000 caracteres']
  },
  price: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  category: {
    type: String,
    enum: ['electrónica', 'hogar', 'moda', 'deportes', 'autos', 'inmuebles', 'servicios', 'otros'],
    default: 'otros'
  },
  images: [{
    type: String, // URLs de Cloudinary
    required: true
  }],
  reels: [{
    type: String // URLs de videos en Cloudinary
  }],
  condition: {
    type: String,
    enum: ['nuevo', 'como nuevo', 'usado', 'reacondicionado'],
    default: 'usado'
  },
  location: {
    city: String,
    province: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  status: {
    type: String,
    enum: ['activo', 'vendido', 'pausado', 'eliminado'],
    default: 'activo'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para búsquedas rápidas
ProductSchema.index({ title: 'text', description: 'text' });
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ seller: 1, status: 1 });

// Middleware para actualizar updatedAt
ProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', ProductSchema);
