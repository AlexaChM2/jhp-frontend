// API Base URL
const API_BASE = "https://jhpapi-production.up.railway.app/api";

// Elementos del DOM
const viewLogin = document.getElementById('view-login');
const viewRegister = document.getElementById('view-register');
const viewRecovery = document.getElementById('view-recovery');
const errorBox = document.getElementById('error-box');
const successBox = document.getElementById('success-box');

// Mostrar mensajes
function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
    setTimeout(() => {
        errorBox.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    successBox.textContent = message;
    successBox.style.display = 'block';
    setTimeout(() => {
        successBox.style.display = 'none';
    }, 5000);
}

function hideMessages() {
    errorBox.style.display = 'none';
    successBox.style.display = 'none';
}

// Cambiar entre vistas
function showLogin() {
    viewLogin.classList.remove('hidden');
    viewRegister.classList.add('hidden');
    viewRecovery.classList.add('hidden');
    hideMessages();
    document.getElementById('loginForm').reset();
}

function showRegister() {
    viewLogin.classList.add('hidden');
    viewRegister.classList.remove('hidden');
    viewRecovery.classList.add('hidden');
    hideMessages();
    document.getElementById('registerForm').reset();
}

function showRecovery() {
    viewLogin.classList.add('hidden');
    viewRegister.classList.add('hidden');
    viewRecovery.classList.remove('hidden');
    hideMessages();
    document.getElementById('recoveryForm').reset();
}

// ==========================================
// REGISTRO DE CLIENTES
// ==========================================
async function registrarCliente(event) {
    event.preventDefault();
    hideMessages();

    const nombre = document.getElementById('regNombre').value.trim();
    const apaterno = document.getElementById('regApaterno').value.trim();
    const amaterno = document.getElementById('regAmaterno').value.trim() || '';
    const correo = document.getElementById('regCorreo').value.trim();
    const telefono = document.getElementById('regTelefono').value.trim() || '';
    const direccion = document.getElementById('regDireccion').value.trim() || '';
    const password = document.getElementById('regPassword').value;
    const passwordConfirmation = document.getElementById('regPassword_confirmation').value;

    // Validaciones
    if (!nombre || !apaterno || !correo || !password || !passwordConfirmation) {
        showError('Los campos marcados con * son obligatorios');
        return;
    }

    // Validar formato de correo
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(correo)) {
        showError('Ingrese un correo electrónico válido');
        return;
    }

    // Validar teléfono si se proporcionó
    if (telefono && !/^\d{10}$/.test(telefono)) {
        showError('El teléfono debe tener exactamente 10 dígitos');
        return;
    }

    // Validar contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
        showError('La contraseña debe tener: 1 mayúscula, 1 minúscula, 1 número y mínimo 6 caracteres');
        return;
    }

    if (password !== passwordConfirmation) {
        showError('Las contraseñas no coinciden');
        return;
    }

    // Datos para enviar a la API de clientes
    const data = {
        cli_nombre: nombre,
        cli_apaterno: apaterno,
        cli_amaterno: amaterno,
        cli_correo: correo,
        cli_telefono: telefono,
        cli_direccion: direccion,
        cli_password: password,
        cli_password_confirmation: passwordConfirmation,
        cli_estado: 'Activo'
    };

    try {
        const response = await fetch(`${API_BASE}/clientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.errors) {
                const firstError = Object.values(result.errors)[0];
                throw new Error(firstError[0]);
            }
            throw new Error(result.message || 'Error al registrar usuario');
        }

        showSuccess('¡Registro exitoso! Ahora puedes iniciar sesión');
        document.getElementById('registerForm').reset();
        
        setTimeout(() => {
            showLogin();
        }, 2000);

    } catch (error) {
        console.error('Error en registro:', error);
        showError(error.message || 'Error al conectar con el servidor');
    }
}

// ==========================================
// INICIO DE SESIÓN
// ==========================================
async function iniciarSesion(event) {
    event.preventDefault();
    hideMessages();

    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;

    if (!correo || !password) {
        showError('Por favor ingrese correo y contraseña');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: correo,
                password: password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Credenciales incorrectas');
        }

        if (result.token) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            showSuccess('¡Inicio de sesión exitoso!');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            throw new Error('No se recibió token de autenticación');
        }

    } catch (error) {
        console.error('Error en login:', error);
        showError(error.message || 'Error al conectar con el servidor');
    }
}

// ==========================================
// RECUPERACIÓN DE CONTRASEÑA
// ==========================================
async function recuperarPassword(event) {
    event.preventDefault();
    hideMessages();

    const correo = document.getElementById('recoverCorreo').value.trim();

    if (!correo) {
        showError('Por favor ingrese su correo electrónico');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/password-reset/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email: correo })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error al enviar instrucciones');
        }

        showSuccess('Se han enviado las instrucciones a tu correo electrónico');
        document.getElementById('recoveryForm').reset();
        
        setTimeout(() => {
            showLogin();
        }, 3000);

    } catch (error) {
        console.error('Error en recuperación:', error);
        showError(error.message || 'Error al conectar con el servidor');
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
document.getElementById('loginForm').addEventListener('submit', iniciarSesion);
document.getElementById('registerForm').addEventListener('submit', registrarCliente);
document.getElementById('recoveryForm').addEventListener('submit', recuperarPassword);

document.getElementById('btnForgot').addEventListener('click', showRecovery);
document.getElementById('linkToRegister').addEventListener('click', showRegister);
document.getElementById('linkToLoginFromReg').addEventListener('click', showLogin);
document.getElementById('linkToLoginFromRec').addEventListener('click', showLogin);