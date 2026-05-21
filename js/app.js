window.cargarVista = function(vista) {
    console.log('📂 cargarVista:', vista);
    
    fetch(vista)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(html => {
            const container = document.getElementById('contenido');
            if (!container) {
                console.error('Contenedor #contenido no encontrado');
                return;
            }
            
            // Limpiar scripts anteriores
            document.querySelectorAll('.script-dinamico').forEach(s => s.remove());

            // Insertar HTML
            container.innerHTML = html;

            // Cargar scripts 
            const scripts = container.querySelectorAll('script');
            let scriptsCargados = 0;
            const totalScripts = scripts.length;

            // Si no hay scripts, cargar directamente
            if (totalScripts === 0) {
                inicializarVista(vista);
                return;
            }

            scripts.forEach(oldScript => {
                if (oldScript.src || (oldScript.textContent && oldScript.textContent.trim())) {
                    const newScript = document.createElement('script');
                    newScript.classList.add('script-dinamico');
                    
                    if (oldScript.src) {
                        newScript.src = oldScript.src.includes('?') 
                            ? oldScript.src 
                            : oldScript.src + '?t=' + Date.now();
                        newScript.onload = () => {
                            scriptsCargados++;
                            if (scriptsCargados >= totalScripts) {
                                inicializarVista(vista);
                            }
                        };
                        newScript.onerror = () => {
                            scriptsCargados++;
                            console.warn('Error cargando:', oldScript.src.split('/').pop());
                            if (scriptsCargados >= totalScripts) {
                                inicializarVista(vista);
                            }
                        };
                    } else {
                        newScript.textContent = oldScript.textContent;
                        scriptsCargados++;
                    }
                    document.body.appendChild(newScript);
                } else {
                    scriptsCargados++;
                }
            });

        })
        .catch(error => {
            console.error('❌ Error al cargar vista:', error);
            const container = document.getElementById('contenido');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger m-4">
                        <h4><i class="fas fa-exclamation-triangle"></i> Error</h4>
                        <p>No se pudo cargar: <strong>${vista}</strong></p>
                        <p class="text-muted">${error.message}</p>
                        <button class="btn btn-outline-danger me-2" onclick="window.cargarVista('views/panel.html')">
                            <i class="fas fa-arrow-left"></i> Panel
                        </button>
                        <button class="btn btn-outline-primary" onclick="location.reload()">
                            <i class="fas fa-sync"></i> Recargar
                        </button>
                    </div>`;
            }
        });
};

function inicializarVista(vista) {
    console.log('🚀 Inicializando vista:', vista);
    
    // ⚠️ IMPORTANTE: Emitir evento para que los scripts lo capturen
    const event = new CustomEvent('vista-cargada', { 
        detail: { vista: vista },
        bubbles: true 
    });
    document.dispatchEvent(event);
    console.log('📢 Evento vista-cargada emitido');

    // Configuración de vistas
    const configVistas = {
        'panel.html': { fn: 'inicializarPanel', fallback: 'verificarEstadoCaja' },
        'ventas.html': { fn: 'listarVentas' },
        'compras.html': { fn: 'listarCompras' },
        'catalogos.html': { fn: 'cargarSeccion', args: ['Clientes'] },
        'productos.html': { fn: 'inicializarModulo', fallback: 'listarProductos' },
        'categorias.html': { fn: 'listarCategorias' },
        'servicios.html': { fn: 'inicializarServicios', fallback: 'listarServicios' },
        'proveedores.html': { fn: 'listarProveedores' }
    };

    // Para reportes, citas y cotizaciones NO hacemos nada aquí
    // porque sus propios scripts tienen auto-inicialización
    if (vista.includes('reporte') || vista.includes('Reporte') ||
        vista.includes('cita') || vista.includes('Cita') ||
        vista.includes('cotizacion') || vista.includes('Cotizacion')) {
        console.log('⏩ Vista con auto-inicialización, esperando script...');
        return;
    }

    // Para otras vistas
    let configurada = false;
    for (const [key, config] of Object.entries(configVistas)) {
        if (vista.includes(key)) {
            configurada = true;
            ejecutarConReintentos(config.fn, config.fallback || null, config.args || []);
            break;
        }
    }

    if (!configurada) {
        console.log('📌 Vista sin inicialización automática:', vista);
    }
}

function ejecutarConReintentos(funcionPrincipal, funcionFallback, args = [], intentos = 0) {
    const maxIntentos = 15;
    const delay = 500;

    if (typeof window[funcionPrincipal] === 'function') {
        console.log(`✅ Ejecutando: ${funcionPrincipal}`);
        window[funcionPrincipal](...args);
        return;
    }

    if (funcionFallback && typeof window[funcionFallback] === 'function') {
        console.log(`✅ Ejecutando fallback: ${funcionFallback}`);
        window[funcionFallback](...args);
        return;
    }

    if (intentos < maxIntentos) {
        if (intentos === 0 || intentos % 3 === 0) {
            console.log(`⏳ Esperando ${funcionPrincipal}... (intento ${intentos + 1}/${maxIntentos})`);
        }
        setTimeout(() => {
            ejecutarConReintentos(funcionPrincipal, funcionFallback, args, intentos + 1);
        }, delay);
    } else {
        console.warn(`⚠️ No se encontró: ${funcionPrincipal} después de ${maxIntentos} intentos`);
    }
}

// Cerrar listas desplegables al hacer clic fuera
document.addEventListener('click', function(e) {
    const idsBuscadores = [
        'busCliCot', 'busProdCot', 'buscarCliente', 'buscarProducto',
        'buscarProveedor', 'buscarProductoCompra', 'busCliCita', 'busEmpCita',
        'busCliCotizacion'
    ];
    
    const listas = document.querySelectorAll('.list-group[id^="res"]');
    listas.forEach(lista => {
        if (!lista.contains(e.target) && !idsBuscadores.includes(e.target.id)) {
            lista.style.display = 'none';
        }
    });
});

console.log('✅ app.js - Listo');