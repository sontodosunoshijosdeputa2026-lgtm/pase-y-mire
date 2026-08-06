<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PyM - Pase y Mire | El Espacio más Libre</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .auth-box {
            background: white;
            border-radius: 1.5rem;
            padding: 2rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            width: 100%;
            max-width: 450px;
            position: relative;
            overflow: hidden;
        }

        .auth-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
        }

        .brand-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .logo-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            margin-bottom: 1rem;
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .logo-text {
            color: white;
            font-size: 1.8rem;
            font-weight: 900;
            letter-spacing: -1px;
        }

        .brand-name {
            font-size: 1.75rem;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.25rem;
        }

        .brand-slogan {
            color: #6b7280;
            font-size: 0.95rem;
            font-style: italic;
            font-weight: 500;
        }

        .brand-slogan::before {
            content: '✨ ';
        }

        .auth-tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            background: #f3f4f6;
            padding: 0.25rem;
            border-radius: 0.75rem;
        }

        .auth-tab {
            flex: 1;
            padding: 0.75rem;
            border: none;
            background: transparent;
            color: #6b7280;
            font-weight: 600;
            cursor: pointer;
            border-radius: 0.5rem;
            transition: all 0.3s;
            font-size: 0.95rem;
        }

        .auth-tab.active {
            background: white;
            color: #667eea;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .auth-form {
            display: none;
        }

        .auth-form.active {
            display: block;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #374151;
            font-size: 0.9rem;
        }

        .form-group input {
            width: 100%;
            padding: 0.875rem;
            border: 2px solid #e5e7eb;
            border-radius: 0.75rem;
            font-size: 1rem;
            transition: all 0.3s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .btn-primary {
            width: 100%;
            padding: 0.875rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }

        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .btn-secondary {
            width: 100%;
            padding: 0.875rem;
            background: #f3f4f6;
            color: #9ca3af;
            border: none;
            border-radius: 0.75rem;
            font-weight: 600;
            cursor: not-allowed;
            font-size: 0.95rem;
        }

        .form-divider {
            text-align: center;
            margin: 1.5rem 0;
            color: #9ca3af;
            position: relative;
            font-size: 0.9rem;
        }

        .form-divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #e5e7eb;
        }

        .form-divider span {
            background: white;
            padding: 0 1rem;
            position: relative;
        }

        .security-badges {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-top: 1.5rem;
            color: #6b7280;
            font-size: 0.8rem;
        }

        .security-badges i {
            color: #10b981;
            margin-right: 0.25rem;
        }

        .info-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #f59e0b;
            padding: 0.875rem;
            margin-bottom: 1rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            color: #92400e;
        }

        .error-message {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 0.875rem;
            margin-bottom: 1rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            color: #991b1b;
            display: none;
        }

        .error-message.show {
            display: block;
            animation: shake 0.5s;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .success-message {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 0.875rem;
            margin-bottom: 1rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            color: #065f46;
            display: none;
        }

        .success-message.show {
            display: block;
        }

        .brand-footer {
            text-align: center;
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
        }

        .brand-footer-text {
            font-size: 0.75rem;
            color: #9ca3af;
        }

        .brand-footer-text strong {
            color: #667eea;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-right: 0.5rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="auth-box">
        <!-- Brand Header -->
        <div class="brand-header">
            <div class="logo-container">
                <span class="logo-text">PyM</span>
            </div>
            <h1 class="brand-name">Pase y Mire</h1>
            <p class="brand-slogan">El Espacio más Libre</p>
        </div>
        
        <!-- Tabs -->
        <div class="auth-tabs">
            <button class="auth-tab active" onclick="showTab('login')">Iniciar Sesión</button>
            <button class="auth-tab" onclick="showTab('register')">Registrarse</button>
        </div>
        
        <!-- Error Message -->
        <div class="error-message" id="errorMessage"></div>
        <div class="success-message" id="successMessage"></div>
        
        <!-- Login Form -->
        <form id="loginForm" class="auth-form active" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label><i class="fas fa-envelope"></i> Email</label>
                <input type="email" name="email" required placeholder="tu@email.com" autocomplete="email">
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-lock"></i> Contraseña</label>
                <input type="password" name="password" required placeholder="••••••••" autocomplete="current-password">
            </div>
            
            <button type="submit" class="btn-primary" id="loginBtn">
                <i class="fas fa-sign-in-alt"></i> Ingresar
            </button>
        </form>
        
        <!-- Register Form -->
        <form id="registerForm" class="auth-form" onsubmit="handleRegister(event)">
            <div class="info-box">
                <i class="fas fa-info-circle"></i> 
                <strong>Bienvenido a PyM</strong> - Tu cuenta se creará al instante.
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-user"></i> Nombre Completo</label>
                <input type="text" name="name" required placeholder="Juan Pérez" autocomplete="name">
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-envelope"></i> Email</label>
                <input type="email" name="email" required placeholder="tu@email.com" autocomplete="email">
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-phone"></i> Teléfono</label>
                <input type="tel" name="phone" required placeholder="+54 11 1234-5678" autocomplete="tel">
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-id-card"></i> DNI/CUIT</label>
                <input type="text" name="idNumber" required placeholder="12345678" autocomplete="off">
            </div>
            
            <div class="form-group">
                <label><i class="fas fa-lock"></i> Contraseña</label>
                <input type="password" name="password" minlength="6" required placeholder="Mínimo 6 caracteres" autocomplete="new-password">
            </div>
            
            <button type="submit" class="btn-primary" id="registerBtn">
                <i class="fas fa-user-plus"></i> Crear Cuenta
            </button>
        </form>
        
        <div class="form-divider">
            <span>o</span>
        </div>
        
        <button class="btn-secondary" disabled>
            <i class="fab fa-google"></i> Google (Próximamente)
        </button>
        
        <div class="security-badges">
            <span><i class="fas fa-shield-alt"></i> Seguro</span>
            <span><i class="fas fa-lock"></i> Encriptado</span>
            <span><i class="fas fa-check-circle"></i> Verificado</span>
        </div>

        <div class="brand-footer">
            <p class="brand-footer-text">
                <strong>PyM</strong> · Pase y Mire · El Espacio más Libre
            </p>
        </div>
    </div>
    
    <script>
        function showTab(tab) {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            hideMessages();
            
            if (tab === 'login') {
                document.querySelectorAll('.auth-tab')[0].classList.add('active');
                document.getElementById('loginForm').classList.add('active');
            } else {
                document.querySelectorAll('.auth-tab')[1].classList.add('active');
                document.getElementById('registerForm').classList.add('active');
            }
        }
        
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
            setTimeout(() => errorDiv.classList.remove('show'), 5000);
        }
        
        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.classList.add('show');
        }
        
        function hideMessages() {
            document.getElementById('errorMessage').classList.remove('show');
            document.getElementById('successMessage').classList.remove('show');
        }
        
        function setLoading(buttonId, loading) {
            const btn = document.getElementById(buttonId);
            if (loading) {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading"></span> Procesando...';
            } else {
                btn.disabled = false;
                btn.innerHTML = buttonId === 'loginBtn' 
                    ? '<i class="fas fa-sign-in-alt"></i> Ingresar'
                    : '<i class="fas fa-user-plus"></i> Crear Cuenta';
            }
        }
        
        async function handleLogin(e) {
            e.preventDefault();
            hideMessages();
            setLoading('loginBtn', true);
            
            const formData = new FormData(e.target);
            const email = formData.get('email');
            const password = formData.get('password');
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showSuccess('¡Login exitoso! Redirigiendo...');
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setTimeout(() => {
                        window.location.href = '/marketplace.html';
                    }, 1000);
                } else {
                    showError(data.error || 'Error al iniciar sesión');
                }
            } catch (error) {
                showError('Error de conexión. Inténtalo más tarde.');
            } finally {
                setLoading('loginBtn', false);
            }
        }
        
        async function handleRegister(e) {
            e.preventDefault();
            hideMessages();
            setLoading('registerBtn', true);
            
            const formData = new FormData(e.target);
            const userData = {
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                phone: formData.get('phone'),
                idNumber: formData.get('idNumber')
            };
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showSuccess('¡Cuenta creada! Revisá tu email y redirigiendo...');
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setTimeout(() => {
                        window.location.href = '/marketplace.html';
                    }, 2000);
                } else {
                    showError(data.error || 'Error al registrar');
                }
            } catch (error) {
                showError('Error de conexión. Inténtalo más tarde.');
            } finally {
                setLoading('registerBtn', false);
            }
        }
        
        window.addEventListener('load', async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await fetch('/api/auth/verify', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        window.location.href = '/marketplace.html';
                    }
                } catch (error) {
                    console.error('Error verificando token:', error);
                }
            }
        });
    </script>
</body>
</html>
