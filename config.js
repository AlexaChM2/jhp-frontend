// ========== CONFIGURACIÓN DE API ==========
// Cambia esta URL por la de tu API en Railway
const API_BASE_URL = "https://jhpapi-production.up.railway.app/";

// URLs de endpoints
const API_URLS = {
   // Auth
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    
    // Citas
    CITAS: `${API_BASE_URL}/citas`,
    
    // Clientes
    CLIENTES: `${API_BASE_URL}/clientes`,
    
    // Productos
    PRODUCTOS: `${API_BASE_URL}/productos`,
    
    // Marcas
    MARCAS: `${API_BASE_URL}/marcas`,
    MARCAS_ACTIVAS: `${API_BASE_URL}/marcas/activas`,
    
    // Ventas
    VENTAS: `${API_BASE_URL}/ventas`,
    DETALLE_VENTAS: `${API_BASE_URL}/detalle_ventas`,
    
    // Inventario
    INVENTARIOS: `${API_BASE_URL}/inventarios`,
    
    // Mantenimiento
    MANTENIMIENTO: `${API_BASE_URL}/mantenimiento`,
    DETALLE_MANT_INSUMOS: `${API_BASE_URL}/detalle_mantenimiento_insumos`,
    DETALLE_MANT_SERVICIOS: `${API_BASE_URL}/detalle_mantenimiento_servicios`,
    
    // Categorías
    CATEGORIAS: `${API_BASE_URL}/categorias`,
    
    // Proveedores
    PROVEEDORES: `${API_BASE_URL}/proveedores`,
    
    // Empleados
    EMPLEADOS: `${API_BASE_URL}/empleados`,
};