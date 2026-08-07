const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'tradehub-secret-key-2024';

let mongoose;
let User, LogisticsProvider, Offer, Bid, Message, Conversation;

const connectDB = async () => {
  try {
    mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB conectado');
    User = require('../models/User');
    LogisticsProvider = require('../models/LogisticsProvider');
    Offer = require('../models/Offer');
    Bid = require('../models/Bid');
    Message = require('../models/Message');
    Conversation = require('../models/Conversation');
  } catch (error) {
    console.error('Error MongoDB:', error.message);
  }
};

connectDB();

let uploadRouter;
try {
  uploadRouter = require('./upload');
  app.use('/api/upload', uploadRouter);
} catch (error) {
  console.log('Cloudinary no disponible');
}

let sendWelcomeEmail;
try {
  const sendgrid = require('../utils/sendgrid');
  sendWelcomeEmail = sendgrid.sendWelcomeEmail;
} catch (error) {
  sendWelcomeEmail = async () => {};
}

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!User) return res.status(500).json({ error: 'DB no disponible' });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API PyM funcionando',
    mongodb: mongoose && mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, idNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' });
    }
    if (!User) return res.status(500).json({ error: 'DB no disponible' });
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name, email, password: hashedPassword,
      phone: phone || '', idNumber: idNumber || ''
    });
    await user.save();
    try { sendWelcomeEmail(user.email, user.name); } catch (e) {}
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Error registro:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    if (!User) return res.status(500).json({ error: 'DB no disponible' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar }
    });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({
    id: req.user._id, name: req.user.name, email: req.user.email,
    avatar: req.user.avatar, verified: req.user.verified
  });
});

app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    console.error('Error perfil:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, idNumber } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (idNumber) user.idNumber = idNumber;
    await user.save();
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Error actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/logistics/register', authMiddleware, async (req, res) => {
  try {
    const { serviceType, vehicleType, coverageArea } = req.body;
    if (!serviceType) return res.status(400).json({ error: 'Tipo de servicio obligatorio' });
    if (!LogisticsProvider) return res.status(500).json({ error: 'DB no disponible' });
    const existing = await LogisticsProvider.findOne({ user: req.user._id });
    if (existing) return res.status(400).json({ error: 'Ya registrado como prestador' });
    const provider = new LogisticsProvider({
      user: req.user._id, serviceType,
      vehicleType: vehicleType || '', coverageArea: coverageArea || '',
      monthlyFee: 10, commissionRate: 0.015
    });
    await provider.save();
    req.user.logisticsProvider = true;
    req.user.providerService = serviceType;
    await req.user.save();
    res.status(201).json({
      success: true, message: 'Registro exitoso',
      provider: { id: provider._id, serviceType: provider.serviceType }
    });
  } catch (error) {
    console.error('Error registrar prestador:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/logistics/verify-face', authMiddleware, async (req, res) => {
  try {
    if (!LogisticsProvider) return res.status(500).json({ error: 'DB no disponible' });
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ error: 'No registrado como prestador' });
    provider.faceVerified = true;
    await provider.save();
    res.json({ success: true, message: 'Verificación facial completada' });
  } catch (error) {
    console.error('Error verificación:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/logistics/payment', authMiddleware, async (req, res) => {
  try {
    if (!LogisticsProvider) return res.status(500).json({ error: 'DB no disponible' });
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ error: 'No registrado como prestador' });
    if (!provider.faceVerified) {
      return res.status(400).json({ error: 'Primero verificá tu identidad' });
    }
    provider.paid = true;
    provider.verified = true;
    provider.active = true;
    provider.paymentDate = new Date();
    await provider.save();
    req.user.providerVerified = true;
    await req.user.save();
    res.json({ success: true, message: 'Pago procesado' });
  } catch (error) {
    console.error('Error pago:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/logistics/status', authMiddleware, async (req, res) => {
  try {
    if (!LogisticsProvider) return res.json({ registered: false });
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    if (!provider) return res.json({ registered: false });
    res.json({ registered: true, provider });
  } catch (error) {
    console.error('Error estado:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/offers', authMiddleware, async (req, res) => {
  try {
    const { serviceType, title, description, fromLocation, toLocation, basePrice } = req.body;
    if (!serviceType || !title || !description || !fromLocation || !toLocation || !basePrice) {
      return res.status(400).json({ error: 'Campos obligatorios' });
    }
    if (!Offer) return res.status(500).json({ error: 'DB no disponible' });
    const offer = new Offer({
      client: req.user._id, serviceType, title, description,
      fromLocation, toLocation, basePrice: parseFloat(basePrice)
    });
    await offer.save();
    res.status(201).json({ success: true, offer: { id: offer._id, title: offer.title } });
  } catch (error) {
    console.error('Error oferta:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/offers/available', authMiddleware, async (req, res) => {
  try {
    if (!LogisticsProvider || !Offer) return res.status(500).json({ error: 'DB no disponible' });
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    if (!provider || !provider.active) {
      return res.status(403).json({ error: 'No tenés acceso' });
    }
    const offers = await Offer.find({
      serviceType: provider.serviceType, status: 'open',
      expiresAt: { $gt: new Date() }
    }).populate('client', 'name avatar rating').sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, count: offers.length, offers });
  } catch (error) {
    console.error('Error ofertas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/offers/my-offers', authMiddleware, async (req, res) => {
  try {
    if (!Offer) return res.status(500).json({ error: 'DB no disponible' });
    const offers = await Offer.find({ client: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, offers });
  } catch (error) {
    console.error('Error mis ofertas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/bids', authMiddleware, async (req, res) => {
  try {
    const { offerId, amount, message, estimatedTime } = req.body;
    if (!offerId || !amount) return res.status(400).json({ error: 'Campos obligatorios' });
    if (!LogisticsProvider || !Offer || !Bid) return res.status(500).json({ error: 'DB no disponible' });
    const provider = await LogisticsProvider.findOne({ user: req.user._id });
    if (!provider || !provider.active) return res.status(403).json({ error: 'No podés pujar' });
    const offer = await Offer.findById(offerId);
    if (!offer || offer.status !== 'open') return res.status(404).json({ error: 'Oferta no disponible' });
    const existingBid = await Bid.findOne({ offer: offerId, provider: provider._id });
    if (existingBid) return res.status(400).json({ error: 'Ya enviaste una puja' });
    const bid = new Bid({
      offer: offerId, provider: provider._id,
      amount: parseFloat(amount), message: message || '', estimatedTime: estimatedTime || ''
    });
    await bid.save();
    res.status(201).json({ success: true, bid: { id: bid._id, amount: bid.amount } });
  } catch (error) {
    console.error('Error puja:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/bids/:offerId', authMiddleware, async (req, res) => {
  try {
    if (!Offer || !Bid) return res.status(500).json({ error: 'DB no disponible' });
    const offer = await Offer.findById(req.params.offerId);
    if (!offer) return res.status(404).json({ error: 'Oferta no encontrada' });
    if (offer.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No tenés acceso' });
    }
    const bids = await Bid.find({ offer: req.params.offerId })
      .populate('provider', 'serviceType rating completedServices').sort({ amount: 1 });
    res.json({ success: true, bids });
  } catch (error) {
    console.error('Error pujas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/bids/:bidId/accept', authMiddleware, async (req, res) => {
  try {
    if (!Bid || !Offer || !Conversation) return res.status(500).json({ error: 'DB no disponible' });
    const bid = await Bid.findById(req.params.bidId).populate('offer');
    if (!bid) return res.status(404).json({ error: 'Puja no encontrada' });
    const offer = bid.offer;
    if (offer.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No tenés permiso' });
    }
    bid.status = 'accepted';
    await bid.save();
    offer.status = 'in_progress';
    offer.acceptedProvider = bid.provider;
    offer.acceptedBid = bid._id;
    await offer.save();
    await Bid.updateMany({ offer: offer._id, _id: { $ne: bid._id } }, { status: 'rejected' });
    const conversation = new Conversation({
      participants: [req.user._id, bid.provider.user],
      relatedOffer: offer._id
    });
    await conversation.save();
    res.json({ success: true, conversationId: conversation._id });
  } catch (error) {
    console.error('Error aceptar puja:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/chat/conversations', authMiddleware, async (req, res) => {
  try {
    if (!Conversation) return res.status(500).json({ error: 'DB no disponible' });
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name avatar').populate('lastMessage').sort({ lastMessageAt: -1 });
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Error conversaciones:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/chat/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    if (!Conversation || !Message) return res.status(500).json({ error: 'DB no disponible' });
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'No tenés acceso' });
    }
    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate('sender', 'name avatar').sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error mensajes:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/chat/send', authMiddleware, async (req, res) => {
  try {
    const { conversationId, content, type } = req.body;
    if (!conversationId || !content) return res.status(400).json({ error: 'Campos obligatorios' });
    if (!Conversation || !Message) return res.status(500).json({ error: 'DB no disponible' });
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'No tenés acceso' });
    }
    const message = new Message({
      conversation: conversationId, sender: req.user._id,
      content, type: type || 'text'
    });
    await message.save();
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    res.status(201).json({ success: true, message: { id: message._id, content: message.content } });
  } catch (error) {
    console.error('Error enviar mensaje:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/marketplace/products', async (req, res) => {
  try {
    res.json({ success: true, products: [] });
  } catch (error) {
    console.error('Error productos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

const { createPaymentPreference, getPaymentInfo } = require('../utils/mercadopago');

app.post('/api/payment/create-preference', authMiddleware, async (req, res) => {
  try {
    const { type, amount, description } = req.body;
    if (!type || !amount) return res.status(400).json({ error: 'Campos obligatorios' });
    let title = type === 'logistics_provider' ? 'Acreditación Prestador PyM' : 'Pago PyM';
    const result = await createPaymentPreference(title, description || title, amount, 1);
    if (!result.success) return res.status(500).json({ error: 'Error creando preferencia' });
    res.json({ success: true, preferenceId: result.preferenceId, initPoint: result.initPoint });
  } catch (error) {
    console.error('Error preferencia:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/payment/status/:paymentId', authMiddleware, async (req, res) => {
  try {
    const result = await getPaymentInfo(req.params.paymentId);
    if (!result.success) return res.status(500).json({ error: 'Error consultando pago' });
    res.json({ success: true, status: result.status });
  } catch (error) {
    console.error('Error estado pago:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const paymentInfo = await getPaymentInfo(data.id);
      if (paymentInfo.success && paymentInfo.status === 'approved') {
        console.log('Pago aprobado:', data.id);
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error webhook:', error);
    res.sendStatus(500);
  }
});

module.exports = app;
