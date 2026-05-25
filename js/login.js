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
                correo: correo,
                password: password
            })
        });

        const result = await response.json();
        console.log('Respuesta login:', result);

        if (!response.ok) {
            throw new Error(result.message || 'Credenciales incorrectas');
        }

        if (result.success && result.data && result.data.token) {
            localStorage.setItem('token', result.data.token);
            
            if (typeof inicializarSistema === 'function') {
                inicializarSistema(result.data.usuario);
            } else {
                localStorage.setItem('user', JSON.stringify(result.data.usuario));
            }
            
            showSuccess('¡Inicio de sesión exitoso!');
            
            setTimeout(() => {
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('main-system-section').classList.remove('hidden');
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
// RECUPERACIÓN DE CONTRASEÑA (ACTUALIZADA - CON MENSAJE DE CORREO ENVIADO)
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
            body: JSON.stringify({ correo: correo })
        });

        const result = await response.json();
        console.log('Respuesta recuperación:', result);

        if (!response.ok) {
            throw new Error(result.message || 'Error al enviar instrucciones');
        }

        // Mostrar mensaje de éxito - correo enviado
        Swal.fire({
            icon: 'success',
            title: '¡Correo enviado!',
            html: `
                <div class="text-start">
                    <p>Hemos enviado las instrucciones de recuperación a:</p>
                    <p><strong>${correo}</strong></p>
                    <hr>
                    <p><i class="fas fa-envelope"></i> Revisa tu bandeja de entrada y la carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>.</p>
                    <p class="text-muted">El enlace expirará en 24 horas.</p>
                </div>
            `,
            confirmButtonText: 'Entendido',
            width: '500px'
        });
        
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
// FUNCIONES PARA EL SISTEMA CON ROLES
// ==========================================

// Configuración de menús por rol
const MENU_CONFIG = {
    Administrador: [
        { nombre: "Panel", vista: "views/panel.html", icono: "fa-tachometer-alt" },
        { nombre: "Ventas", vista: "views/ventas.html", icono: "fa-shopping-cart" },
        { nombre: "Compras", vista: "views/compras.html", icono: "fa-truck" },
        { nombre: "Registros", vista: "views/catalogos.html", icono: "fa-database" },
        { nombre: "Productos", vista: "views/productos.html", icono: "fa-motorcycle" },
        { nombre: "Categoria", vista: "views/categorias.html", icono: "fa-layer-group" },
        { nombre: "Cotizaciones", vista: "views/cotizaciones.html", icono: "fa-file-invoice" },
        { nombre: "Reportes", vista: "views/reportes.html", icono: "fa-chart-bar" },
        { nombre: "Agendas/citas", vista: "views/cita.html", icono: "fa-calendar-alt" },
        { nombre: "Servicios", vista: "views/servicios.html", icono: "fa-wrench" },
        { nombre: "Mantenimiento", vista: "views/mantenimiento_preventivo.html", icono: "fa-tools" },
        { nombre: "Registro Servicios", vista: "views/servicios_catalogo.html", icono: "fa-clipboard-list" }
    ],
    
    Empleado: [
        { nombre: "Panel", vista: "views/panel.html", icono: "fa-tachometer-alt" },
        { nombre: "Ventas", vista: "views/ventas.html", icono: "fa-shopping-cart" },
        { nombre: "Compras", vista: "views/compras.html", icono: "fa-truck" },
        { nombre: "Productos", vista: "views/productos.html", icono: "fa-motorcycle" },
        { nombre: "Categoria", vista: "views/categorias.html", icono: "fa-layer-group" },
        { nombre: "Cotizaciones", vista: "views/cotizaciones.html", icono: "fa-file-invoice" },
        { nombre: "Reportes", vista: "views/reportes.html", icono: "fa-chart-bar" },
        { nombre: "Agendas/citas", vista: "views/cita.html", icono: "fa-calendar-alt" },
        { nombre: "Servicios", vista: "views/servicios.html", icono: "fa-wrench" },
        { nombre: "Mantenimiento", vista: "views/mantenimiento_preventivo.html", icono: "fa-tools" },
        { nombre: "Registro Servicios", vista: "views/servicios_catalogo.html", icono: "fa-clipboard-list" }
    ],
    
    Vendedor: [
        { nombre: "Panel", vista: "views/panel.html", icono: "fa-tachometer-alt" },
        { nombre: "Ventas", vista: "views/ventas.html", icono: "fa-shopping-cart" },
        { nombre: "Productos", vista: "views/productos.html", icono: "fa-motorcycle" },
        { nombre: "Cotizaciones", vista: "views/cotizaciones.html", icono: "fa-file-invoice" },
        { nombre: "Agendas/citas", vista: "views/cita.html", icono: "fa-calendar-alt" },
        { nombre: "Servicios", vista: "views/servicios.html", icono: "fa-wrench" }
    ],
    
    Cliente: [
        { nombre: "Mi Perfil", vista: "views/cliente/perfil.html", icono: "fa-user-circle" },
        { nombre: "Mis Citas", vista: "views/cliente/citas.html", icono: "fa-calendar-check" },
        { nombre: "Mis Servicios", vista: "views/cliente/servicios.html", icono: "fa-tools" }
    ],
    
    Mecanico: [
        { nombre: "Panel", vista: "views/panel.html", icono: "fa-tachometer-alt" },
        { nombre: "Servicios", vista: "views/servicios.html", icono: "fa-wrench" },
        { nombre: "Mantenimiento", vista: "views/mantenimiento_preventivo.html", icono: "fa-tools" },
        { nombre: "Agendas/citas", vista: "views/cita.html", icono: "fa-calendar-alt" }
    ]
};

// Función para cargar el menú según el rol del usuario
function cargarMenuPorRol(rol) {
    const menuContainer = document.getElementById('menu-dinamico');
    if (!menuContainer) return;
    
    const menuItems = MENU_CONFIG[rol] || MENU_CONFIG.Cliente;
    
    let menuHTML = '<h2>MENÚ</h2>';
    
    menuItems.forEach(item => {
        menuHTML += `
            <li onclick="cargarVistaConPermiso('${item.vista}')">
                <i class="fas ${item.icono}"></i> ${item.nombre}
            </li>
        `;
    });
    
    menuContainer.innerHTML = menuHTML;
}

// Función para actualizar la información del usuario en el header
function actualizarInfoUsuario(user) {
    const userNameSpan = document.getElementById('user-name');
    const userRoleSpan = document.getElementById('user-role');
    
    if (userNameSpan) {
        userNameSpan.textContent = user.nombre || user.name || 'Usuario';
    }
    
    if (userRoleSpan) {
        let roleClass = 'bg-secondary';
        if (user.rol === 'Administrador') roleClass = 'bg-danger';
        else if (user.rol === 'Empleado') roleClass = 'bg-primary';
        else if (user.rol === 'Vendedor') roleClass = 'bg-info';
        else if (user.rol === 'Cliente') roleClass = 'bg-success';
        else if (user.rol === 'Mecanico') roleClass = 'bg-warning';
        
        userRoleSpan.className = `badge ${roleClass} ms-2`;
        userRoleSpan.textContent = user.rol || 'Cliente';
    }
}

// Función para verificar si el usuario tiene acceso a una vista
function tieneAccesoAVista(vista, rol) {
    const menuItems = MENU_CONFIG[rol] || MENU_CONFIG.Cliente;
    return menuItems.some(item => item.vista === vista);
}

// Función para cargar vista con verificación de permisos
function cargarVistaConPermiso(vista) {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        cerrarSesion();
        return;
    }
    
    const user = JSON.parse(userStr);
    const rol = user.rol || 'Cliente';
    
    if (tieneAccesoAVista(vista, rol)) {
        if (typeof cargarVista === 'function') {
            cargarVista(vista);
        }
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Acceso Denegado',
            text: 'No tienes permiso para acceder a esta sección',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

// Inicializar el sistema después del login
function inicializarSistema(user) {
    localStorage.setItem('user', JSON.stringify(user));
    cargarMenuPorRol(user.rol);
    actualizarInfoUsuario(user);
    
    let vistaInicial = 'views/panel.html';
    if (user.rol === 'Cliente') {
        vistaInicial = 'views/cliente/perfil.html';
    }
    
    if (typeof cargarVista === 'function') {
        cargarVista(vistaInicial);
    }
}

// Función global para cerrar sesión
window.cerrarSesion = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.getElementById('main-system-section').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    showLogin();
};

// Exponer funciones globalmente
window.cargarVistaConPermiso = cargarVistaConPermiso;
window.inicializarSistema = inicializarSistema;

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

// Verificar si ya hay sesión activa al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('main-system-section').classList.remove('hidden');
            inicializarSistema(user);
        } catch(e) {
            console.error('Error al restaurar sesión:', e);
            cerrarSesion();
        }
    }
});