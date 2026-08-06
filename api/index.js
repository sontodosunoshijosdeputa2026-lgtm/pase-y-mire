const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// Base de datos en memoria (simulada)
let users = [];
let products = [];
let conversations = [];
let messages = [];

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-secreto-super-seguro-123');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// ============ AUTENTICACIÓN ============

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone, idNumber } = req.body;
        
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
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
            rating: 5.0,
            posts: 0,
            sales: 0,
            messages: 0
        };
        
        users.push(user);
        
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'tu-secreto-super-seguro-123',
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
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'tu-secreto-super-seguro-123',
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
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        logisticsProvider: user.logisticsProvider
    });
});

// ============ USUARIO ============

app.get('/api/user/profile', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// ============ MARKETPLACE ============

app.get('/api/marketplace/products', (req, res) => {
    const productsWithSeller = products.map(product => {
        const seller = users.find(u => u.id === product.sellerId);
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

app.post('/api/marketplace/products', authMiddleware, (req, res) => {
    try {
        const { title, category, price, description, images } = req.body;
        
        const product = {
            id: Date.now().toString(),
            title,
            category,
            price: parseFloat(price),
            description,
            sellerId: req.user.id,
            images: images || ['/assets/default-product.jpg'],
            views: 0,
            favorites: 0,
            createdAt: new Date(),
            status: 'active'
        };
        
        products.push(product);
        
        const user = users.find(u => u.id === req.user.id);
        if (user) {
            user.posts = (user.posts || 0) + 1;
        }
        
        res.json({ success: true, product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

app.get('/api/marketplace/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const seller = users.find(u => u.id === product.sellerId);
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

// ============ CHAT ============

app.get('/api/chat/conversations', authMiddleware, (req, res) => {
    const userConversations = conversations.filter(
        c => c.participant1 === req.user.id || c.participant2 === req.user.id
    );
    
    const result = userConversations.map(conv => {
        const otherUserId = conv.participant1 === req.user.id ? 
            conv.participant2 : conv.participant1;
        const otherUser = users.find(u => u.id === otherUserId);
        const lastMessage = messages
            .filter(m => m.conversationId === conv.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        return {
            userId: otherUserId,
            userName: otherUser?.name,
            lastMessage: lastMessage?.content || '',
            lastMessageTime: lastMessage?.timestamp || conv.createdAt
        };
    });
    
    res.json(result);
});

app.get('/api/chat/conversation/:userId', authMiddleware, (req, res) => {
    const otherUserId = req.params.userId;
    
    let conversation = conversations.find(
        c => (c.participant1 === req.user.id && c.participant2 === otherUserId) ||
             (c.participant1 === otherUserId && c.participant2 === req.user.id)
    );
    
    if (!conversation) {
        conversation = {
            id: Date.now().toString(),
            participant1: req.user.id,
            participant2: otherUserId,
            createdAt: new Date()
        };
        conversations.push(conversation);
    }
    
    const msgs = messages
        .filter(m => m.conversationId === conversation.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json(msgs);
});

app.post('/api/chat/send', authMiddleware, (req, res) => {
    try {
        const { recipientId, content } = req.body;
        
        let conversation = conversations.find(
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
            conversations.push(conversation);
        }
        
        const message = {
            id: Date.now().toString(),
            conversationId: conversation.id,
            senderId: req.user.id,
            content,
            timestamp: new Date(),
            read: false
        };
        
        messages.push(message);
        
        res.json({ success: true, message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

// ============ LOGÍSTICA ============

app.post('/api/logistics/register', authMiddleware, (req, res) => {
    try {
        const { serviceType, vehicleType, coverageArea } = req.body;
        
        const user = users.find(u => u.id === req.user.id);
        if (user) {
            user.logisticsProvider = true;
            user.verified = true;
        }
        
        res.json({ 
            success: true, 
            message: 'Registro como proveedor de logística exitoso',
            monthlyFee: 10,
            commissionRate: 0.015
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar proveedor' });
    }
});

// ============ EXPORTAR PARA VERCEL ============

module.exports = app;
