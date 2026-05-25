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
    if (document.getElementById('loginForm')) document.getElementById('loginForm').reset();
}

function showRegister() {
    viewLogin.classList.add('hidden');
    viewRegister.classList.remove('hidden');
    viewRecovery.classList.add('hidden');
    hideMessages();
    if (document.getElementById('registerForm')) document.getElementById('registerForm').reset();
}

function showRecovery() {
    viewLogin.classList.add('hidden');
    viewRegister.classList.add('hidden');
    viewRecovery.classList.remove('hidden');
    hideMessages();
    if (document.getElementById('recoveryForm')) document.getElementById('recoveryForm').reset();
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
    if (password.length < 6) {
        showError('La contraseña debe tener mínimo 6 caracteres');
        return;
    }

    if (password !== passwordConfirmation) {
        showError('Las contraseñas no coinciden');
        return;
    }

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
                const errorMessages = Object.values(result.errors).flat();
                throw new Error(errorMessages.join(', '));
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
// INICIO DE SESIÓN (CORREGIDO - usa 'correo' no 'email')
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
        // Tu backend espera 'correo' (no 'email') y 'password'
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                correo: correo,   // ← CAMPO CORRECTO: 'correo'
                password: password
            })
        });

        const result = await response.json();
        console.log('Respuesta login:', result);

        if (!response.ok) {
            throw new Error(result.message || 'Credenciales incorrectas');
        }

        if (result.success && result.data && result.data.token) {
            // Guardar token y datos del usuario
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('user', JSON.stringify(result.data.usuario));
            
            showSuccess('¡Inicio de sesión exitoso!');
            
            setTimeout(() => {
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('main-system-section').classList.remove('hidden');
                if (typeof cargarVista === 'function') cargarVista('views/panel.html');
            }, 1500);
        } else {
            throw new Error(result.message || 'No se recibió token de autenticación');
        }

    } catch (error) {
        console.error('Error en login:', error);
        showError(error.message || 'Error al conectar con el servidor');
    }
}

// ==========================================
// RECUPERACIÓN DE CONTRASEÑA (CORREGIDO - usa 'correo')
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
        // Tu backend espera 'correo' (no 'email')
        const response = await fetch(`${API_BASE}/password-reset/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ correo: correo })  // ← CAMPO CORRECTO: 'correo'
        });

        const result = await response.json();
        console.log('Respuesta recuperación:', result);

        if (!response.ok) {
            throw new Error(result.message || 'Error al enviar instrucciones');
        }

        showSuccess(result.message || 'Se han enviado las instrucciones a tu correo electrónico');
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

// Función global para cerrar sesión
window.cerrarSesion = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.getElementById('main-system-section').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    showLogin();
};

// Verificar si ya hay sesión activa al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (token) {
        // Opcional: validar token con el backend
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-system-section').classList.remove('hidden');
        if (typeof cargarVista === 'function') cargarVista('views/panel.html');
    }
});