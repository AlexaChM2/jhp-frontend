// config.js - Este archivo SÍ va a Git
const API_CONFIG = {
    // Usar variable de entorno o fallback local
    baseURL: process.env.API_URL || 'https://jhpapi-production.up.railway.app/',
    
    // Configuración general
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
};

// Detectar entorno automáticamente
if (window.location.hostname !== 'localhost') {
    // En producción, usar el dominio actual
    API_CONFIG.baseURL = `https://${window.location.hostname}/api`;
}