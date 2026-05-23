// ========== CONFIGURACIÓN DE API ==========
// Cambia esta URL por la de tu API en Railway
const API_BASE_URL = "https://jhpapi-production.up.railway.app/";

// URLs de endpoints
const API_URLS = {
    // Citas
    CITAS: `${API_BASE_URL}/citas`,
    
    // Clientes
    CLIENTES: `${API_BASE_URL}/clientes`,
    
    // Empleados
    EMPLEADOS: `${API_BASE_URL}/empleados`,
    
    // Productos
    PRODUCTOS: `${API_BASE_URL}/producto`,
    
    // Categorías
    CATEGORIAS: `${API_BASE_URL}/categorias`,
    
    // Ventas
    VENTAS: `${API_BASE_URL}/ventas`,
    
    // Compras
    COMPRAS: `${API_BASE_URL}/compras`,
    
    // Cotizaciones
    COTIZACIONES: `${API_BASE_URL}/cotizaciones`,
    
    // Reportes
    //REPORTES: `${API_BASE_URL}/reportes-detallados`,
    
    // Caja
    CAJA: `${API_BASE_URL}/control_caja`
};

// Exportar para uso global
window.API_URLS = API_URLS;
window.API_BASE_URL = API_BASE_URL;