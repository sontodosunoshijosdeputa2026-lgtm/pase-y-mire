// Sistema de autenticación completo
const authService = {
    // Registro de usuario
    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            } else {
                const error = await response.json();
                return { success: false, error: error.message };
            }
        } catch (error) {
            return { success: false, error: 'Error de conexión' };
        }
    },

    // Login
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            } else {
                const error = await response.json();
                return { success: false, error: error.message };
            }
        } catch (error) {
            return { success: false, error: 'Error de conexión' };
        }
    },

    // Logout
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    },

    // Verificar token
    async verifyToken() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        }
        return null;
    },

    // Solicitar verificación de perfil
    async requestVerification documents) {
        try {
            const formData = new FormData();
            documents.forEach(doc => {
                formData.append('documents', doc);
            });
            
            const response = await fetch('/api/auth/request-verification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            return response.ok;
        } catch (error) {
            console.error('Verification request failed:', error);
            return false;
        }
    },

    // Registro como proveedor de logística
    async registerLogisticsProvider(providerData) {
        try {
            const response = await fetch('/api/logistics/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(providerData)
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, paymentUrl: data.paymentUrl };
            } else {
                const error = await response.json();
                return { success: false, error: error.message };
            }
        } catch (error) {
            return { success: false, error: 'Error de conexión' };
        }
    },

    // Verificar estado de pago
    async checkPaymentStatus() {
        try {
            const response = await fetch('/api/logistics/payment-status', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Payment status check failed:', error);
        }
        return null;
    }
};

// Funciones globales para los formularios
async function handleLogin(e) {
    e.preventDefault();
    
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    const result = await authService.login(email, password);
    
    if (result.success) {
        window.location.href = '/marketplace.html';
    } else {
        alert(result.error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        idNumber: formData.get('idNumber')
    };
    
    const result = await authService.register(userData);
    
    if (result.success) {
        window.location.href = '/marketplace.html';
    } else {
        alert(result.error);
    }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
                  }
