// ============================================
// SERVICIO DE AUTENTICACIÓN - TradeHub
// ============================================

const authService = {
    
    // ===== REGISTRO DE USUARIO =====
    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    password: userData.password,
                    phone: userData.phone,
                    idNumber: userData.idNumber
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user, token: data.token };
            } else {
                return { 
                    success: false, 
                    error: data.error || 'Error al registrar' 
                };
            }
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, error: 'Error de conexión con el servidor' };
        }
    },

    // ===== LOGIN =====
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user, token: data.token };
            } else {
                return { 
                    success: false, 
                    error: data.error || 'Credenciales inválidas' 
                };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, error: 'Error de conexión con el servidor' };
        }
    },

    // ===== VERIFICAR TOKEN =====
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
                const user = await response.json();
                localStorage.setItem('user', JSON.stringify(user));
                return user;
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return null;
            }
        } catch (error) {
            console.error('Error verificando token:', error);
            return null;
        }
    },

    // ===== OBTENER USUARIO ACTUAL =====
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    // ===== VERIFICAR SI ESTÁ LOGUEADO =====
    isLoggedIn() {
        const token = localStorage.getItem('token');
        return token !== null;
    },

    // ===== LOGOUT =====
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    },

    // ===== OBTENER TOKEN =====
    getToken() {
        return localStorage.getItem('token');
    },

    // ===== SOLICITAR VERIFICACIÓN =====
    async requestVerification(documents) {
        const token = this.getToken();
        if (!token) return { success: false, error: 'No autenticado' };

        try {
            const formData = new FormData();
            if (documents) {
                documents.forEach(doc => {
                    formData.append('documents', doc);
                });
            }

            const response = await fetch('/api/auth/request-verification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            return response.ok ? { success: true } : { success: false, error: data.error };
        } catch (error) {
            console.error('Error en verificación:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    // ===== REGISTRO COMO PROVEEDOR DE LOGÍSTICA =====
    async registerLogisticsProvider(providerData) {
        const token = this.getToken();
        if (!token) return { success: false, error: 'No autenticado' };

        try {
            const response = await fetch('/api/logistics/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(providerData)
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                return { 
                    success: true, 
                    message: data.message,
                    monthlyFee: data.monthlyFee,
                    commissionRate: data.commissionRate
                };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Error registrando logística:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    // ===== OBTENER PERFIL COMPLETO =====
    async getProfile() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                localStorage.setItem('user', JSON.stringify(user));
                return user;
            }
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
        }
        return null;
    }
};

// ============================================
// FUNCIONES GLOBALES PARA FORMULARIOS
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    
    if (!email || !password) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    const result = await authService.login(email, password);
    
    if (result.success) {
        console.log('Login exitoso:', result.user);
        window.location.href = '/marketplace.html';
    } else {
        alert(result.error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name').trim(),
        email: formData.get('email').trim(),
        password: formData.get('password'),
        phone: formData.get('phone').trim(),
        idNumber: formData.get('idNumber').trim()
    };
    
    // Validaciones
    if (!userData.name || !userData.email || !userData.password || !userData.phone || !userData.idNumber) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    if (userData.password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    if (userData.password !== formData.get('confirmPassword')) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    const result = await authService.register(userData);
    
    if (result.success) {
        console.log('Registro exitoso:', result.user);
        window.location.href = '/marketplace.html';
    } else {
        alert(result.error);
    }
}

// ============================================
// PROTECCIÓN DE PÁGINAS REQUIEREN LOGIN
// ============================================

async function requireAuth(redirectUrl = '/index.html') {
    const user = await authService.verifyToken();
    if (!user) {
        window.location.href = redirectUrl;
        return null;
    }
    return user;
}

// ============================================
// AUTO-VERIFICACIÓN AL CARGAR PÁGINA
// ============================================

window.addEventListener('load', async () => {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname;
    
    // Si está en index.html y ya tiene token, redirigir al marketplace
    if (token && (currentPage === '/' || currentPage === '/index.html')) {
        const user = await authService.verifyToken();
        if (user) {
            window.location.href = '/marketplace.html';
        }
    }
});

// ============================================
// EXPORTAR (para uso en módulos si es necesario)
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
                    }
