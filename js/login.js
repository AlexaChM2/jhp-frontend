// login.js
window.API_AUTH = window.API_AUTH || "https://jhpapi-production.up.railway.app/api/auth";

function ejecutarLogin(event) {
    event.preventDefault();

    const correoInput = document.getElementById('correo');
    const passwordInput = document.getElementById('password');

    if (!correoInput || !passwordInput) return;

    const correo = correoInput.value.trim();
    const password = passwordInput.value;

    if (!correo || !password) {
        Swal.fire({ 
            icon: 'warning', 
            title: 'Atención', 
            text: 'Por favor, llena todos los campos.' 
        });
        return;
    }

    fetch(`${window.API_AUTH}/login`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ 
            correo: correo, 
            password: password 
        })
    })
    .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
    .then(({ status, ok, data }) => {
        if (ok && data.success) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('usuario_nombre', data.data.usuario.nombre);
            localStorage.setItem('usuario_rol', data.data.usuario.rol);
            localStorage.setItem('usuario_tipo', data.data.usuario.tipo);
            localStorage.setItem('usuario_id', data.data.usuario.id);
            localStorage.setItem('usuario_correo', data.data.usuario.correo);

            const usuarioInfo = document.querySelector('.usuario-info');
            if (usuarioInfo) {
                usuarioInfo.innerHTML = `${data.data.usuario.nombre} <button class="btn btn-sm btn-light ms-3" onclick="cerrarSesion()">Salir</button>`;
            }

            Swal.fire({
                icon: 'success',
                title: '¡Sesión Iniciada!',
                text: data.message || 'Bienvenido al sistema',
                timer: 1500,
                showConfirmButton: false
            });

            setTimeout(() => {
                mostrarSistemaPrincipal(data.data.usuario);
            }, 500);

        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error de acceso',
                text: data.message || 'Credenciales inválidas'
            });
        }
    })
    .catch(err => {
        console.error("Error en login:", err);
        Swal.fire({ 
            icon: 'error', 
            title: 'Error de conexión', 
            text: 'No hay conexión con el servidor.' 
        });
    });
}

function mostrarSistemaPrincipal(usuario) {
    const authSection = document.getElementById('auth-section');
    if (authSection) authSection.classList.add('hidden');

    const mainSystem = document.getElementById('main-system-section');
    if (mainSystem) mainSystem.classList.remove('hidden');

    // Cargar el panel usando la función de app.js
    if (typeof window.cargarVista === 'function') {
        window.cargarVista('views/panel.html');
    } else {
        console.error('cargarVista no está disponible');
    }
}

function verificarSesionActiva() {
    const token = localStorage.getItem('token');
    const usuarioNombre = localStorage.getItem('usuario_nombre');
    const usuarioRol = localStorage.getItem('usuario_rol');
    const usuarioTipo = localStorage.getItem('usuario_tipo');

    if (token && usuarioNombre) {
        const usuario = { nombre: usuarioNombre, rol: usuarioRol, tipo: usuarioTipo };
        const usuarioInfo = document.querySelector('.usuario-info');
        if (usuarioInfo) {
            usuarioInfo.innerHTML = `${usuarioNombre} <button class="btn btn-sm btn-light ms-3" onclick="cerrarSesion()">Salir</button>`;
        }
        mostrarSistemaPrincipal(usuario);
    }
}

function cerrarSesion() {
    const token = localStorage.getItem('token');

    Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Serás redirigido al inicio de sesión',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            if (token) {
                fetch(`${window.API_AUTH}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }).catch(err => console.log('Error al cerrar sesión:', err));
            }

            localStorage.clear();

            const mainSystem = document.getElementById('main-system-section');
            if (mainSystem) mainSystem.classList.add('hidden');

            const authSection = document.getElementById('auth-section');
            if (authSection) authSection.classList.remove('hidden');

            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.reset();

            Swal.fire({
                icon: 'success',
                title: 'Sesión cerrada',
                timer: 1500
            });
        }
    });
}

// Inicialización
document.addEventListener("DOMContentLoaded", function() {
    verificarSesionActiva();

    const formulario = document.getElementById('loginForm');
    if (formulario) {
        formulario.addEventListener('submit', ejecutarLogin);
    }

    // Navegación entre vistas de login
    document.getElementById('linkToRegister')?.addEventListener('click', () => {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-register').classList.remove('hidden');
    });

    document.getElementById('linkToLoginFromReg')?.addEventListener('click', () => {
        document.getElementById('view-register').classList.add('hidden');
        document.getElementById('view-login').classList.remove('hidden');
    });

    document.getElementById('btnForgot')?.addEventListener('click', () => {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-recovery').classList.remove('hidden');
    });

    document.getElementById('linkToLoginFromRec')?.addEventListener('click', () => {
        document.getElementById('view-recovery').classList.add('hidden');
        document.getElementById('view-login').classList.remove('hidden');
    });
});

// Exponer globalmente
window.cerrarSesion = cerrarSesion;