const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de multer para uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Base de datos simulada (reemplazar con MongoDB/PostgreSQL)
const db = {
    users: [],
    products: [],
    conversations: [],
    messages: [],
    logisticsProviders: []
};

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Registro
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone, idNumber } = req.body;
        
        // Verificar si el usuario existe
        const existingUser = db.users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        // Hash de contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Crear usuario
        const user = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            phone,
            idNumber,
            verified: false,
            logisticsProvider: false,
            createdAt: new Date(),
            avatar: null,
            rating: 0,
            posts: 0,
            sales: 0,
            messages: 0
        };
        
        db.users.push(user);
        
        // Generar token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                verified: user.verified,
                logisticsProvider: user.logisticsProvider
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = db.users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        
        // Generar token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                verified: user.verified,
                logisticsProvider: user.logisticsProvider,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Verificar token
app.get('/api/auth/verify', authMiddleware, (req, res) => {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        logisticsProvider: user.logisticsProvider,
        avatar: user.avatar
    });
});

// ==================== RUTAS DE MARKETPLACE ====================

// Obtener productos
app.get('/api/marketplace/products', (req, res) => {
    const productsWithSeller = db.products.map(product => {
        const seller = db.users.find(u => u.id === product.sellerId);
        return {
            ...product,
            seller: {
                id: seller?.id,
                name: seller?.name,
                avatar: seller?.avatar,
                verified: seller?.verified,
                logisticsProvider: seller?.logisticsProvider,
                rating: seller?.rating
            }
        };
    });
    
    res.json(productsWithSeller);
});

// Crear producto
app.post('/api/marketplace/products', authMiddleware, upload.array('images', 5), (req, res) => {
    try {
        const { title, category, price, description } = req.body;
        
        const product = {
            id: Date.now().toString(),
            title,
            category,
            price: parseFloat(price),
            description,
            sellerId: req.user.id,
            images: req.files.map(f => `/uploads/${f.filename}`),
            views: 0,
            favorites: 0,
            createdAt: new Date(),
            status: 'active'
        };
        
        db.products.push(product);
        
        // Actualizar contador de posts del usuario
        const user = db.users.find(u => u.id === req.user.id);
        if (user) {
            user.posts = (user.posts || 0) + 1;
        }
        
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// Obtener producto por ID
app.get('/api/marketplace/products/:id', (req, res) => {
    const product = db.products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const seller = db.users.find(u => u.id === product.sellerId);
    
    // Incrementar vistas
    product.views = (product.views || 0) + 1;
    
    res.json({
        ...product,
        seller: {
            id: seller?.id,
            name: seller?.name,
            avatar: seller?.avatar,
            verified: seller?.verified,
            logisticsProvider: seller?.logisticsProvider,
            rating: seller?.rating
        }
    });
});

// ==================== RUTAS DE CHAT ====================

// Obtener conversaciones
app.get('/api/chat/conversations', authMiddleware, (req, res) => {
    const userConversations = db.conversations.filter(
        c => c.participant1 === req.user.id || c.participant2 === req.user.id
    );
    
    const conversationsWithDetails = userConversations.map(conv => {
        const otherUserId = conv.participant1 === req.user.id ? 
            conv.participant2 : conv.participant1;
        const otherUser = db.users.find(u => u.id === otherUserId);
        const lastMessage = db.messages
            .filter(m => m.conversationId === conv.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        return {
            userId: otherUserId,
            userName: otherUser?.name,
            lastMessage: lastMessage?.content || '',
            lastMessageTime: lastMessage?.timestamp || conv.createdAt
        };
    });
    
    res.json(conversationsWithDetails);
});

// Obtener conversación específica
app.get('/api/chat/conversation/:userId', authMiddleware, (req, res) => {
    const otherUserId = req.params.userId;
    
    let conversation = db.conversations.find(
        c => (c.participant1 === req.user.id && c.participant2 === otherUserId) ||
             (c.participant1 === otherUserId && c.participant2 === req.user.id)
    );
    
    if (!conversation) {
        // Crear nueva conversación
        conversation = {
            id: Date.now().toString(),
            participant1: req.user.id,
            participant2: otherUserId,
            createdAt: new Date()
        };
        db.conversations.push(conversation);
    }
    
    const messages = db.messages
        .filter(m => m.conversationId === conversation.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json(messages);
});

// Enviar mensaje
app.post('/api/chat/send', authMiddleware, (req, res) => {
    try {
        const { recipientId, content } = req.body;
        
        // Encontrar o crear conversación
        let conversation = db.conversations.find(
            c => (c.participant1 === req.user.id && c.participant2 === recipientId) ||
                 (c.participant1 === recipientId && c.participant2 === req.user.id)
        );
        
        if (!conversation) {
            conversation = {
                id: Date.now().toString(),
                participant1: req.user.id,
                participant2: recipientId,
                createdAt: new Date()
            };
            db.conversations.push(conversation);
        }
        
        const message = {
            id: Date.now().toString(),
            conversationId: conversation.id,
            senderId: req.user.id,
            content,
            timestamp: new Date(),
            read: false
        };
        
        db.messages.push(message);
        
        // Actualizar contador de mensajes
        const user = db.users.find(u => u.id === req.user.id);
        if (user) {
            user.messages = (user.messages || 0) + 1;
        }
        
        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

// ==================== RUTAS DE LOGÍSTICA ====================

// Registro como proveedor de logística
app.post('/api/logistics/register', authMiddleware, (req, res) => {
    try {
        const { serviceType, vehicleType, coverageArea } = req.body;
        
        const provider = {
            userId: req.user.id,
            serviceType, // 'moto', 'remis', 'flete', 'larga-distancia'
            vehicleType,
            coverageArea,
            monthlyFee: 10,
            commissionRate: 0.015, // 1.5%
            verified: false,
            active: false,
            registeredAt: new Date()
        };
        
        db.logisticsProviders.push(provider);
        
        // Actualizar usuario
        const user = db.users.find(u => u.id === req.user.id);
        if (user) {
            user.logisticsProvider = true;
        }
        
        // Aquí se integraría con Stripe/PayPal para el pago
        const paymentUrl = '/api/payment/create-session';
        
        res.json({ success: true, paymentUrl });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar proveedor' });
    }
});

// Verificar estado de pago
app.get('/api/logistics/payment-status', authMiddleware, (req, res) => {
    const provider = db.logisticsProviders.find(p => p.userId === req.user.id);
    
    if (!provider) {
        return res.json({ hasProvider: false });
    }
    
    res.json({
        hasProvider: true,
        active: provider.active,
        verified: provider.verified,
        serviceType: provider.serviceType
    });
});

// ==================== RUTAS DE USUARIO ====================

// Obtener perfil de usuario
app.get('/api/user/profile', authMiddleware, (req, res) => {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // No enviar contraseña
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// Actualizar perfil
app.put('/api/user/profile', authMiddleware, (req, res) => {
    try {
        const user = db.users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        Object.assign(user, req.body);
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
