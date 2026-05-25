// Configuración de menús por rol
const MENU_CONFIG = {
    // Administrador: ve todo
    Administrador: [
        { nombre: "Panel", vista: "views/panel.html", icono: "fa-tachometer-alt" },
        { nombre: "Ventas", vista: "views/ventas.html", icono: "fa-shopping-cart" },
        { nombre: "Compras", vista: "views/compras.html", icono: "fa-truck" },
        { nombre: "Registros", vista: "views/catalogos.html", icono: "fa-database", requiereAcceso: true },
        { nombre: "Productos", vista: "views/productos.html", icono: "fa-motorcycle" },
        { nombre: "Categoria", vista: "views/categorias.html", icono: "fa-layer-group" },
        { nombre: "Cotizaciones", vista: "views/cotizaciones.html", icono: "fa-file-invoice" },
        { nombre: "Reportes", vista: "views/reportes.html", icono: "fa-chart-bar" },
        { nombre: "Agendas/citas", vista: "views/cita.html", icono: "fa-calendar-alt" },
        { nombre: "Servicios", vista: "views/servicios.html", icono: "fa-wrench" },
        { nombre: "Mantenimiento", vista: "views/mantenimiento_preventivo.html", icono: "fa-tools" },
        { nombre: "Registro Servicios", vista: "views/servicios_catalogo.html", icono: "fa-clipboard-list" }
    ],
    
    // Empleado: no ve "Registros" (catalogos)
    Empleado: [
        { nombre: "Panel", vista: "views/panel.html", icono: "fa-tachometer-alt" },
        { nombre: "Ventas", vista: "views/ventas.html", icono: "fa-shopping-cart" },
        { nombre: "Compras", vista: "views/compras.html", icono: "fa-truck" },
        // "Registros" NO incluido
        { nombre: "Productos", vista: "views/productos.html", icono: "fa-motorcycle" },
        { nombre: "Categoria", vista: "views/categorias.html", icono: "fa-layer-group" },
        { nombre: "Cotizaciones", vista: "views/cotizaciones.html", icono: "fa-file-invoice" },
        { nombre: "Reportes", vista: "views/reportes.html", icono: "fa-chart-bar" },
        { nombre: "Agendas/citas", vista: "views/cita.html", icono: "fa-calendar-alt" },
        { nombre: "Servicios", vista: "views/servicios.html", icono: "fa-wrench" },
        { nombre: "Mantenimiento", vista: "views/mantenimiento_preventivo.html", icono: "fa-tools" },
        { nombre: "Registro Servicios", vista: "views/servicios_catalogo.html", icono: "fa-clipboard-list" }
    ],
    
    // Vendedor: vista limitada
    Vendedor: [
        { nombre: "Panel", vista: "views/panel.html", icono: "fa-tachometer-alt" },
        { nombre: "Ventas", vista: "views/ventas.html", icono: "fa-shopping-cart" },
        { nombre: "Productos", vista: "views/productos.html", icono: "fa-motorcycle" },
        { nombre: "Cotizaciones", vista: "views/cotizaciones.html", icono: "fa-file-invoice" },
        { nombre: "Agendas/citas", vista: "views/cita.html", icono: "fa-calendar-alt" },
        { nombre: "Servicios", vista: "views/servicios.html", icono: "fa-wrench" }
    ],
    
    // Cliente: solo perfil, citas y servicios
    Cliente: [
        { nombre: "Mi Perfil", vista: "views/cliente/perfil.html", icono: "fa-user-circle" },
        { nombre: "Mis Citas", vista: "views/cliente/citas.html", icono: "fa-calendar-check" },
        { nombre: "Mis Servicios", vista: "views/cliente/servicios.html", icono: "fa-tools" }
    ],
    
    // Mecánico: vistas específicas
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
    
    // Obtener el menú según el rol, si no existe usar el de Cliente por defecto
    const menuItems = MENU_CONFIG[rol] || MENU_CONFIG.Cliente;
    
    let menuHTML = '<h2>MENÚ</h2>';
    
    menuItems.forEach(item => {
        menuHTML += `
            <li onclick="cargarVista('${item.vista}')">
                <i class="fas ${item.icono}"></i> ${item.nombre}
            </li>
        `;
    });
    
    menuContainer.innerHTML = menuHTML;
}

// Función para actualizar la información del usuario en el header
function actualizarInfoUsuario() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
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
        } catch(e) {
            console.error('Error al parsear usuario:', e);
        }
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
    // Guardar usuario en localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    // Cargar menú según el rol
    cargarMenuPorRol(user.rol);
    
    // Actualizar información del usuario en el header
    actualizarInfoUsuario();
    
    // Cargar la vista inicial según el rol
    let vistaInicial = 'views/panel.html';
    if (user.rol === 'Cliente') {
        vistaInicial = 'views/cliente/perfil.html';
    }
    
    if (typeof cargarVista === 'function') {
        cargarVista(vistaInicial);
    }
}