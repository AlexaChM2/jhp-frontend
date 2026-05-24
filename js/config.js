// =============================================
// CONFIGURACIÓN DE API - TALLER MECÁNICO JHP
// =============================================

const API_BASE = "https://jhpapi-production.up.railway.app/api";

const API = {
    // AUTH
    AUTH: {
        LOGIN: `${API_BASE}/auth/login`,
        LOGOUT: `${API_BASE}/auth/logout`,
        REGISTER: `${API_BASE}/auth/register`,
        ME: `${API_BASE}/auth/me`,
        RECOVERY: `${API_BASE}/auth/recovery`,
    },

    // CATEGORÍAS
    CATEGORIAS: `${API_BASE}/categorias`,

    // MARCAS
    MARCAS: `${API_BASE}/marcas`,
    MARCAS_ACTIVAS: `${API_BASE}/marcas/activas`,

    // PRODUCTOS
    PRODUCTOS: `${API_BASE}/productos`,
    PRODUCTOS_SEARCH: `${API_BASE}/productos/search`,

    // INVENTARIO
    INVENTARIOS: `${API_BASE}/inventarios`,

    // CLIENTES
    CLIENTES: `${API_BASE}/clientes`,

    // EMPLEADOS
    EMPLEADOS: `${API_BASE}/empleados`,

    // PROVEEDORES
    PROVEEDORES: `${API_BASE}/proveedores`,

    // SERVICIOS
    SERVICIOS: `${API_BASE}/servicios`,

    // CITAS
    CITAS: `${API_BASE}/citas`,
    DETALLE_CITA_SERVICIOS: `${API_BASE}/detalle_cita_servicios`,

    // VENTAS
    VENTAS: `${API_BASE}/ventas`,
    DETALLE_VENTAS: `${API_BASE}/detalle_ventas`,

    // COMPRAS
    COMPRAS: `${API_BASE}/compras`,
    DETALLE_COMPRAS: `${API_BASE}/detalle_compras`,

    // COTIZACIONES
    COTIZACIONES: `${API_BASE}/cotizaciones`,
    DETALLE_COTIZACIONES: `${API_BASE}/detalle_cotizaciones`,

    // MANTENIMIENTO
    MANTENIMIENTO: `${API_BASE}/mantenimiento`,
    DETALLE_MANT_INSUMOS: `${API_BASE}/detalle_mantenimiento_insumos`,
    DETALLE_MANT_SERVICIOS: `${API_BASE}/detalle_mantenimiento_servicios`,

    // CONTROL CAJA
    CAJA: `${API_BASE}/control_caja`,

    // FUNCIONES ÚTILES
    headers() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        };
    },

    async get(url, params = {}) {
        const query = new URLSearchParams(params).toString();
        const fullUrl = query ? `${url}?${query}` : url;
        const res = await fetch(fullUrl, { headers: this.headers() });
        return res.json();
    },

    async post(url, data = {}) {
        const res = await fetch(url, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    async put(url, data = {}) {
        const res = await fetch(url, {
            method: 'PUT',
            headers: this.headers(),
            body: JSON.stringify(data),
        });
        return res.json();
    },

    async delete(url) {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: this.headers(),
        });
        return res.json();
    },
};

window.API = API;