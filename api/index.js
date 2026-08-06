// ============================================
// API COMPLETA - PyM (Pase y Mire)
// Con MongoDB Atlas
// ============================================

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connectDB = require('../db/connect');

// Importar modelos
const User = require('../models/User');
const LogisticsProvider = require('../models/LogisticsProvider');
const Offer = require('../models/Offer');
const Bid = require('../models/Bid');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Conectar a MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'tradehub-secret-key-2024';

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado - Token requerido' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API PyM funcionando con MongoDB',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// AUTENTICACIÓN
// ============================================

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, idNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Este email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      idNumber: idNumber || ''
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        logisticsProvider: user.logisticsProvider
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        logisticsProvider: user.logisticsProvider,
        providerService: user.providerService,
        providerVerified: user.providerVerified
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    verified: req.user.verified,
    logisticsProvider: req.user.logisticsProvider,
    providerService: req.user.providerService,
    providerVerified: req.user.providerVerified
  });
});

// Perfil de usuario
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// PRESTADORES LOGÍSTICOS
// ============================================

// Registrar prestador logístico
app.post('/api/logistics/register', authMiddleware, async (req, res) => {
  try {
    const { serviceType, vehicleType, coverageArea } = req.body;

    if (!serviceType) {
      return res.status(400).json({ error: 'Tipo de servicio es obligatorio' });
    }

    // Verificar si ya existe
    const existingProvider = await LogisticsProvider.findOne({ user: req.user._id });
    if (existingProvider) {
      return res.status(400).json({ error: 'Ya estás registrado como prestador' });
    }

    const provider = new LogisticsProvider({
      user: req.user._id,
      serviceType,
      vehicleType: vehicleType || '',
      coverageArea: coverageArea || '',
      monthlyFee: 10,
      commissionRate: 0.015
    });

    await provider.save();

    // Actualizar usuario
    req.user.logisticsProvider = true;
    req.user.providerService = serviceType;
    await req.user.save();

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Completá la verificación facial y el pago.',
      provider: {
        id: provider._id,
        serviceType: provider.serviceType,
        verified: provider.verified,
        paid: provider.paid
      }
    });
  } catch (error) {
    console.error('Error registrando prestador:', error);
    res.status(500).json({ error: 'Error al registrar prestador' });
  }
});

// Verificación facial (simulada)
app.post('/api/logistics/verify-face', authMiddleware, async (req, res) => {
  try {
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    
    if (!provider) {
      return res.status(404).json({ error: 'No estás registrado como prestador' });
    }

    provider.faceVerified = true;
    await provider.save();

    res.json({
      success: true,
      message: 'Verificación facial completada',
      nextStep: 'payment'
    });
  } catch (error) {
    console.error('Error en verificación facial:', error);
    res.status(500).json({ error: 'Error en verificación' });
  }
});

// Procesar pago (simulado)
app.post('/api/logistics/payment', authMiddleware, async (req, res) => {
  try {
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    
    if (!provider) {
      return res.status(404).json({ error: 'No estás registrado como prestador' });
    }

    if (!provider.faceVerified) {
      return res.status(400).json({ error: 'Primero completá la verificación facial' });
    }

    provider.paid = true;
    provider.verified = true;
    provider.active = true;
    provider.paymentDate = new Date();
    await provider.save();

    // Actualizar usuario
    req.user.providerVerified = true;
    req.user.providerPaid = true;
    await req.user.save();

    res.json({
      success: true,
      message: 'Pago procesado. ¡Ya podés ofrecer servicios!',
      provider: {
        verified: provider.verified,
        active: provider.active,
        serviceType: provider.serviceType
      }
    });
  } catch (error) {
    console.error('Error procesando pago:', error);
    res.status(500).json({ error: 'Error al procesar pago' });
  }
});

// Obtener estado del prestador
app.get('/api/logistics/status', authMiddleware, async (req, res) => {
  try {
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    
    if (!provider) {
      return res.json({ registered: false });
    }

    res.json({
      registered: true,
      provider: {
        id: provider._id,
        serviceType: provider.serviceType,
        verified: provider.verified,
        faceVerified: provider.faceVerified,
        paid: provider.paid,
        active: provider.active,
        rating: provider.rating,
        completedServices: provider.completedServices
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ============================================
// OFERTAS DE SERVICIO
// ============================================

// Crear oferta (cliente)
app.post('/api/offers', authMiddleware, async (req, res) => {
  try {
    const { serviceType, title, description, fromLocation, toLocation, basePrice } = req.body;

    if (!serviceType || !title || !description || !fromLocation || !toLocation || !basePrice) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const offer = new Offer({
      client: req.user._id,
      serviceType,
      title,
      description,
      fromLocation,
      toLocation,
      basePrice: parseFloat(basePrice)
    });

    await offer.save();

    res.status(201).json({
      success: true,
      offer: {
        id: offer._id,
        title: offer.title,
        serviceType: offer.serviceType,
        basePrice: offer.basePrice
      }
    });
  } catch (error) {
    console.error('Error creando oferta:', error);
    res.status(500).json({ error: 'Error al crear oferta' });
  }
});

// Obtener ofertas abiertas (para prestadores)
app.get('/api/offers/available', authMiddleware, async (req, res) => {
  try {
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    
    if (!provider || !provider.active) {
      return res.status(403).json({ error: 'No tenés acceso a ofertas' });
    }

    const offers = await Offer.find({
      serviceType: provider.serviceType,
      status: 'open',
      expiresAt: { $gt: new Date() }
    })
    .populate('client', 'name avatar rating')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      count: offers.length,
      offers: offers.map(offer => ({
        id: offer._id,
        title: offer.title,
        description: offer.description,
        fromLocation: offer.fromLocation,
        toLocation: offer.toLocation,
        basePrice: offer.basePrice,
        client: {
          name: offer.client.name,
          avatar: offer.client.avatar,
          rating: offer.client.rating
        },
        createdAt: offer.createdAt,
        expiresAt: offer.expiresAt
      }))
    });
  } catch (error) {
    console.error('Error obteniendo ofertas:', error);
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
});

// Obtener mis ofertas (como cliente)
app.get('/api/offers/my-offers', authMiddleware, async (req, res) => {
  try {
    const offers = await Offer.find({ client: req.user._id })
      .sort({ createdAt: -1 })
      .populate('acceptedProvider');

    res.json({
      success: true,
      offers
    });
  } catch (error) {
    console.error('Error obteniendo mis ofertas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ============================================
// PUJAS (BIDS)
// ============================================

// Enviar puja (prestador)
app.post('/api/bids', authMiddleware, async (req, res) => {
  try {
    const { offerId, amount, message, estimatedTime } = req.body;

    if (!offerId || !amount) {
      return res.status(400).json({ error: 'Oferta y monto son obligatorios' });
    }

    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    if (!provider || !provider.active) {
      return res.status(403).json({ error: 'No podés pujar' });
    }

    const offer = await Offer.findById(offerId);
    if (!offer || offer.status !== 'open') {
      return res.status(404).json({ error: 'Oferta no disponible' });
    }

    // Verificar que no haya pujado antes
    const existingBid = await Bid.findOne({ offer: offerId, provider: provider._id });
    if (existingBid) {
      return res.status(400).json({ error: 'Ya enviaste una puja para esta oferta' });
    }

    const bid = new Bid({
      offer: offerId,
      provider: provider._id,
      amount: parseFloat(amount),
      message: message || '',
      estimatedTime: estimatedTime || ''
    });

    await bid.save();

    res.status(201).json({
      success: true,
      message: 'Puja enviada exitosamente',
      bid: {
        id: bid._id,
        amount: bid.amount,
        message: bid.message
      }
    });
  } catch (error) {
    console.error('Error enviando puja:', error);
    res.status(500).json({ error: 'Error al enviar puja' });
  }
});

// Obtener pujas de una oferta (cliente)
app.get('/api/bids/:offerId', authMiddleware, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId);
    
    if (!offer) {
      return res.status(404).json({ error: 'Oferta no encontrada' });
    }

    if (offer.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No tenés acceso a estas pujas' });
    }

    const bids = await Bid.find({ offer: req.params.offerId })
      .populate('provider', 'serviceType rating completedServices')
      .sort({ amount: 1 });

    res.json({
      success: true,
      bids: bids.map(bid => ({
        id: bid._id,
        amount: bid.amount,
        message: bid.message,
        estimatedTime: bid.estimatedTime,
        provider: {
          serviceType: bid.provider.serviceType,
          rating: bid.provider.rating,
          completedServices: bid.provider.completedServices
        },
        createdAt: bid.createdAt
      }))
    });
  } catch (error) {
    console.error('Error obteniendo pujas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Aceptar puja (cliente)
app.post('/api/bids/:bidId/accept', authMiddleware, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('offer');
    
    if (!bid) {
      return res.status(404).json({ error: 'Puja no encontrada' });
    }

    const offer = bid.offer;
    if (offer.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No tenés permiso' });
    }

    // Aceptar puja
    bid.status = 'accepted';
    await bid.save();

    // Actualizar oferta
    offer.status = 'in_progress';
    offer.acceptedProvider = bid.provider;
    offer.acceptedBid = bid._id;
    await offer.save();

    // Rechazar otras pujas
    await Bid.updateMany(
      { offer: offer._id, _id: { $ne: bid._id } },
      { status: 'rejected' }
    );

    // Crear conversación de chat
    const conversation = new Conversation({
      participants: [req.user._id, bid.provider.user],
      relatedOffer: offer._id
    });
    await conversation.save();

    res.json({
      success: true,
      message: 'Puja aceptada. Se creó el chat con el prestador.',
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('Error aceptando puja:', error);
    res.status(500).json({ error: 'Error al aceptar puja' });
  }
});

// ============================================
// CHAT
// ============================================

// Obtener conversaciones
app.get('/api/chat/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'name avatar')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv._id,
        participants: conv.participants.filter(p => p._id.toString() !== req.user._id.toString()),
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt
      }))
    });
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener mensajes de una conversación
app.get('/api/chat/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'No tenés acceso' });
    }

    const messages = await Message.find({
      conversation: req.params.conversationId
    })
    .populate('sender', 'name avatar')
    .sort({ createdAt: 1 });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Enviar mensaje
app.post('/api/chat/send', authMiddleware, async (req, res) => {
  try {
    const { conversationId, content, type } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: 'Conversación y contenido son obligatorios' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'No tenés acceso' });
    }

    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      content,
      type: type || 'text'
    });

    await message.save();

    // Actualizar última mensaje de la conversación
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json({
      success: true,
      message: {
        id: message._id,
        content: message.content,
        sender: req.user._id,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// ============================================
// MARKETPLACE (Productos)
// ============================================

app.get('/api/marketplace/products', async (req, res) => {
  try {
    // Por ahora retornamos array vacío (se puede expandir después)
    res.json({ success: true, products: [] });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ============================================
// EXPORTAR PARA VERCEL
// ============================================
module.exports = app;
