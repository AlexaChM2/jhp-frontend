var API_VENTAS_PANEL = "https://jhpapi-production.up.railway.app/api/ventas";
var API_CAJA_PANEL = "https://jhpapi-production.up.railway.app/api/caja";
var API_CITAS_PANEL = "https://jhpapi-production.up.railway.app/api/citas";
var API_PRODUCTOS_PANEL = "https://jhpapi-production.up.railway.app/api/producto";

let calendarioPanel = null;
var mapaRefacciones = null;
var marcadoresRefacciones = [];

// ========== SISTEMA DE NOTIFICACIONES CON BOOTSTRAP ==========

var notificaciones = [];
var ultimoStockCheck = null;
var dropdownNotificaciones = null;

function verificarStockBajoPanel() {
    fetch(API_PRODUCTOS_PANEL)
        .then(function(res) { return res.json(); })
        .then(function(response) {
            var data = response.success ? response.data : response;
            var productos = Array.isArray(data) ? data : [];
            
            var bajos = productos.filter(function(p) { 
                return p.pro_stock <= 5 && p.pro_stock > 0; 
            });
            var agotados = productos.filter(function(p) { 
                return p.pro_stock <= 0; 
            });
            var total = bajos.length + agotados.length;

            // Alerta tradicional (para mantener compatibilidad)
            var alertaEl = document.getElementById("alertaStockPanel");
            if (alertaEl) {
                if (total === 0) {
                    alertaEl.style.display = "none";
                } else {
                    var mensaje = '';
                    if (agotados.length > 0) mensaje += agotados.length + ' producto(s) agotado(s)';
                    if (bajos.length > 0) {
                        if (mensaje) mensaje += ' | ';
                        mensaje += bajos.length + ' con stock bajo';
                    }
                    alertaEl.style.display = "block";
                    var textoEl = document.getElementById("stockAlertaTexto");
                    if (textoEl) textoEl.textContent = mensaje;
                }
            }
            
            // Crear notificaciones
            crearNotificaciones(agotados, bajos);
            actualizarContadorNotificaciones();
            
            // Animar campana si hay notificaciones nuevas
            if (total > 0 && notificacionesNuevas()) {
                animarCampana();
            }
            
            ultimoStockCheck = new Date();
        })
        .catch(function() {});
}

function notificacionesNuevas() {
    if (!ultimoStockCheck) return true;
    var noLeidas = notificaciones.filter(function(n) { return !n.leido; }).length;
    return noLeidas > 0;
}

function animarCampana() {
    var btn = document.getElementById("btnNotificaciones");
    if (btn) {
        btn.classList.add('animate__animated', 'animate__headShake');
        setTimeout(function() {
            btn.classList.remove('animate__animated', 'animate__headShake');
        }, 500);
    }
}

function crearNotificaciones(agotados, bajos) {
    notificaciones = [];
    
    agotados.forEach(function(producto) {
        notificaciones.push({
            id: producto.id_producto,
            nombre: producto.pro_nombre,
            stock: producto.pro_stock,
            codigo: producto.pro_codigo,
            tipo: 'agotado',
            mensaje: '¡AGOTADO! ' + producto.pro_nombre,
            prioridad: 1,
            timestamp: new Date(),
            leido: false
        });
    });
    
    bajos.forEach(function(producto) {
        notificaciones.push({
            id: producto.id_producto,
            nombre: producto.pro_nombre,
            stock: producto.pro_stock,
            codigo: producto.pro_codigo,
            tipo: 'bajo',
            mensaje: 'Stock bajo: ' + producto.pro_nombre + ' (' + producto.pro_stock + ' uds)',
            prioridad: 2,
            timestamp: new Date(),
            leido: false
        });
    });
    
    notificaciones.sort(function(a, b) {
        if (a.prioridad !== b.prioridad) {
            return a.prioridad - b.prioridad;
        }
        return b.timestamp - a.timestamp;
    });
}

function actualizarContadorNotificaciones() {
    var noLeidas = notificaciones.filter(function(n) { return !n.leido; }).length;
    var contadorSpan = document.getElementById("contadorNotificaciones");
    var btn = document.getElementById("btnNotificaciones");
    
    if (contadorSpan) {
        if (noLeidas > 0) {
            contadorSpan.textContent = noLeidas > 99 ? '99+' : noLeidas;
            contadorSpan.style.display = 'inline-block';
            if (btn) {
                btn.classList.add('text-warning');
            }
        } else {
            contadorSpan.style.display = 'none';
            if (btn) {
                btn.classList.remove('text-warning');
            }
        }
    }
}

function cargarListaNotificaciones() {
    var lista = document.getElementById("listaNotificaciones");
    if (!lista) return;
    
    if (notificaciones.length === 0) {
        lista.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-check-circle fa-2x mb-2"></i>
                <p class="mb-0">¡Todo en orden!</p>
                <small class="text-muted">No hay productos con stock bajo</small>
            </div>
        `;
        return;
    }
    
    var html = '<div class="list-group list-group-flush">';
    notificaciones.forEach(function(notif, index) {
        var bgClass = notif.tipo === 'agotado' ? 'bg-danger bg-opacity-10' : 'bg-warning bg-opacity-10';
        var icono = notif.tipo === 'agotado' ? 'fa-circle-exclamation text-danger' : 'fa-triangle-exclamation text-warning';
        var leidoClass = notif.leido ? 'opacity-50' : '';
        
        html += `
            <div class="list-group-item list-group-item-action ${bgClass} ${leidoClass}" style="cursor: pointer;" onclick="marcarNotificacionComoLeida(${index})">
                <div class="d-flex align-items-start">
                    <div class="me-3">
                        <i class="fas ${icono} fa-lg"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <strong class="${notif.tipo === 'agotado' ? 'text-danger' : 'text-warning'}">
                                ${notif.tipo === 'agotado' ? 'AGOTADO' : 'STOCK BAJO'}
                            </strong>
                            <small class="text-muted">${formatTimeNotificacion(notif.timestamp)}</small>
                        </div>
                        <p class="mb-0 small">${notif.nombre}</p>
                        <small class="text-muted">Código: ${notif.codigo || 'N/A'} | Stock: ${notif.stock}</small>
                    </div>
                    ${!notif.leido ? '<span class="badge bg-danger rounded-pill ms-2" style="width: 8px; height: 8px; padding: 0;"></span>' : ''}
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    lista.innerHTML = html;
}

function marcarNotificacionComoLeida(index) {
    if (notificaciones[index]) {
        notificaciones[index].leido = true;
        actualizarContadorNotificaciones();
        cargarListaNotificaciones();
    }
}

function marcarTodasNotificacionesComoLeidas() {
    notificaciones.forEach(function(notif) {
        notif.leido = true;
    });
    actualizarContadorNotificaciones();
    cargarListaNotificaciones();
}

function formatTimeNotificacion(date) {
    var now = new Date();
    var diff = Math.floor((now - new Date(date)) / 1000);
    
    if (diff < 60) return 'Hace ' + diff + ' seg';
    if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + ' min';
    if (diff < 86400) return 'Hace ' + Math.floor(diff / 3600) + ' h';
    return 'Hace ' + Math.floor(diff / 86400) + ' días';
}

// ========== INICIALIZAR NOTIFICACIONES ==========
function inicializarNotificacionesBs() {
    // Inicializar dropdown de Bootstrap
    var dropdownElement = document.getElementById('btnNotificaciones');
    if (dropdownElement && typeof bootstrap !== 'undefined') {
        dropdownNotificaciones = new bootstrap.Dropdown(dropdownElement, {
            autoClose: true
        });
    }
    
    // Evento cuando se abre el dropdown
    document.getElementById('btnNotificaciones').addEventListener('shown.bs.dropdown', function () {
        cargarListaNotificaciones();
    });
    
    // Cerrar con botón X
    var cerrarBtn = document.getElementById("cerrarNotificacionesBs");
    if (cerrarBtn) {
        cerrarBtn.addEventListener('click', function() {
            if (dropdownNotificaciones) {
                dropdownNotificaciones.hide();
            }
        });
    }
    
    // Botón ver todos
    var verTodoBtn = document.getElementById("btnVerTodoBs");
    if (verTodoBtn) {
        verTodoBtn.addEventListener('click', function() {
            if (typeof window.cargarVista === 'function') {
                window.cargarVista('views/inventario.html');
            }
            if (dropdownNotificaciones) {
                dropdownNotificaciones.hide();
            }
        });
    }
}

// Reemplazar la función inicializarPanel
function inicializarPanelConNotificaciones() {
    inicializarPanel();
    inicializarNotificacionesBs();
    // Verificar stock cada 30 segundos
    setInterval(verificarStockBajoPanel, 30000);
}

// Exponer función global
window.marcarNotificacionComoLeida = marcarNotificacionComoLeida;
window.marcarTodasNotificacionesComoLeidas = marcarTodasNotificacionesComoLeidas;

// Reemplazar la inicialización automática
if (document.getElementById("calendario") || document.getElementById("estado-badge") || document.getElementById("mapaRefaccionarias")) {
    document.addEventListener('DOMContentLoaded', function() {
        inicializarPanelConNotificaciones();
    });
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarPanelConNotificaciones);
    } else {
        inicializarPanelConNotificaciones();
    }
}

// ========== INICIALIZAR ==========
function inicializarPanel() {
    console.log('=== INICIALIZANDO PANEL ===');
    verificarEstadoCaja();
    cargarVentasHoy();
    cargarCitasPanel();
    verificarStockBajoPanel();
    inicializarCalendario();
    setTimeout(buscarRefaccionarias, 1500);
}

// ========== CAJA CON ENDPOINTS SIMPLES ==========

function verificarEstadoCaja() {
    console.log('Verificando estado de caja...');
    
    fetch(API_CAJA_PANEL + '/estado')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            console.log('Estado caja:', data);
            
            var badge = document.getElementById("estado-badge");
            var btn = document.getElementById("btn-caja");
            var montoTexto = document.getElementById("monto-apertura-texto");
            var montoVal = document.getElementById("monto-inicial-val");
            
            if (data.caja_abierta === true) {
                if (badge) { 
                    badge.textContent = "Abierta"; 
                    badge.className = "badge bg-success mb-3"; 
                }
                if (btn) { 
                    btn.innerHTML = '<i class="fas fa-door-closed"></i> Cerrar Caja'; 
                    btn.onclick = confirmarCerrarCaja; 
                }
                if (montoTexto) montoTexto.style.display = "block";
                if (montoVal && data.monto_inicial) {
                    montoVal.textContent = '$' + parseFloat(data.monto_inicial).toFixed(2);
                }
            } else {
                if (badge) { 
                    badge.textContent = "Cerrada"; 
                    badge.className = "badge bg-danger mb-3"; 
                }
                if (btn) { 
                    btn.innerHTML = '<i class="fas fa-door-open"></i> Abrir Caja'; 
                    btn.onclick = abrirModalCaja; 
                }
                if (montoTexto) montoTexto.style.display = "none";
            }
        })
        .catch(function(error) {
            console.error('Error al verificar caja:', error);
            var badge = document.getElementById("estado-badge");
            if (badge) {
                badge.textContent = "Error";
                badge.className = "badge bg-secondary mb-3";
            }
        });
}

function abrirModalCaja() {
    document.getElementById("modal-caja").style.display = "flex";
    var inputMonto = document.getElementById("monto_inicial");
    if (inputMonto) inputMonto.value = "";
}

function cerrarModal() {
    document.getElementById("modal-caja").style.display = "none";
}

function confirmarAbrirCaja() {
    var monto = parseFloat(document.getElementById("monto_inicial").value) || 0;
    
    console.log('Abriendo caja con monto:', monto);
    
    if (monto <= 0) {
        Swal.fire("Error", "Ingresa un monto inicial válido", "warning");
        return;
    }
    
    Swal.fire({
        title: 'Abriendo caja...',
        text: 'Monto: $' + monto.toFixed(2),
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    fetch(API_CAJA_PANEL + '/abrir', {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ 
            monto: monto, 
            empleado_id: 1 
        })
    })
    .then(function(res) { 
        console.log('Status:', res.status);
        return res.json(); 
    })
    .then(function(data) {
        console.log('Respuesta:', data);
        
        if (data.success === true) {
            Swal.fire({ 
                icon: 'success', 
                title: 'Caja Abierta', 
                text: 'Monto: $' + monto.toFixed(2),
                timer: 1500, 
                showConfirmButton: false 
            });
            cerrarModal();
            verificarEstadoCaja();
            cargarVentasHoy();
        } else {
            Swal.fire("Error", data.message || "No se pudo abrir la caja", "error");
        }
    })
    .catch(function(error) {
        console.error('Error:', error);
        Swal.fire("Error", "Error al conectar: " + error.message, "error");
    });
}

function confirmarCerrarCaja() {
    Swal.fire({
        title: '¿Cerrar caja?',
        text: '¿Estás seguro de cerrar la caja?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#17791f',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, cerrar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Cerrando caja...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            fetch(API_CAJA_PANEL + '/cerrar', {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                console.log('Cierre respuesta:', data);
                
                if (data.success === true) {
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'Caja Cerrada', 
                        html: '<strong>Ventas del día:</strong> $' + (data.ventas || '0.00') + '<br>' +
                              '<strong>Total final:</strong> $' + (data.total || '0.00'),
                        timer: 2000,
                        showConfirmButton: false 
                    });
                    verificarEstadoCaja();
                    cargarVentasHoy();
                } else {
                    Swal.fire("Error", data.message || "No se pudo cerrar la caja", "error");
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                Swal.fire("Error", "Error al conectar: " + error.message, "error");
            });
        }
    });
}

// ========== VENTAS HOY ==========
function cargarVentasHoy() {
    fetch(API_VENTAS_PANEL)
        .then(function(res) { return res.json(); })
        .then(function(response) {
            var ventas = response.success ? (response.data?.data || response.data) : response;
            var datos = Array.isArray(ventas) ? ventas : [];
            var hoy = new Date().toLocaleDateString('es-MX');
            var ventasHoy = datos.filter(function(v) {
                return v.ven_fecha && new Date(v.ven_fecha).toLocaleDateString('es-MX') === hoy;
            });
            var total = ventasHoy.reduce(function(s, v) { return s + parseFloat(v.ven_total || 0); }, 0);
            
            var montoEl = document.getElementById("ventas-monto");
            var actualizadoEl = document.getElementById("ventas-actualizado");
            
            if (montoEl) montoEl.textContent = '$' + total.toFixed(2);
            if (actualizadoEl) actualizadoEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-MX');
        })
        .catch(function(error) {
            console.error('Error cargando ventas:', error);
        });
}

// ========== CITAS ==========
function cargarCitasPanel() {
    var filtroSelect = document.getElementById("filtroCitasPanel");
    var filtro = filtroSelect ? filtroSelect.value : "hoy";
    
    fetch(API_CITAS_PANEL)
        .then(function(res) { return res.json(); })
        .then(function(response) {
            var data = response.success ? (response.data?.data || response.data) : response;
            var citas = Array.isArray(data) ? data : [];
            var ahora = new Date();
            var citasFiltradas = [];

            if (filtro === "hoy") {
                var hoy = ahora.toLocaleDateString('es-MX');
                citasFiltradas = citas.filter(function(c) {
                    return c.cita_fecha_programada && new Date(c.cita_fecha_programada).toLocaleDateString('es-MX') === hoy;
                });
                var textoFiltro = document.getElementById("filtro-citas-texto");
                if (textoFiltro) textoFiltro.textContent = "Citas para hoy";
            } else if (filtro === "semana") {
                var finSemana = new Date(ahora);
                finSemana.setDate(ahora.getDate() + 7);
                citasFiltradas = citas.filter(function(c) {
                    var f = new Date(c.cita_fecha_programada);
                    return f >= ahora && f <= finSemana;
                });
                var textoFiltro = document.getElementById("filtro-citas-texto");
                if (textoFiltro) textoFiltro.textContent = "Próximos 7 días";
            } else if (filtro === "mes") {
                var finMes = new Date(ahora);
                finMes.setDate(ahora.getDate() + 30);
                citasFiltradas = citas.filter(function(c) {
                    var f = new Date(c.cita_fecha_programada);
                    return f >= ahora && f <= finMes;
                });
                var textoFiltro = document.getElementById("filtro-citas-texto");
                if (textoFiltro) textoFiltro.textContent = "Próximos 30 días";
            }

            var citasHoyEl = document.getElementById("citas-hoy");
            if (citasHoyEl) citasHoyEl.textContent = citasFiltradas.length;
            
            var lista = document.getElementById("citas-lista");
            if (lista) {
                lista.innerHTML = citasFiltradas.length > 0
                    ? citasFiltradas.map(function(c) {
                        var hora = c.cita_fecha_programada ? new Date(c.cita_fecha_programada).toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'}) : '';
                        var nombreCliente = c.cliente ? (c.cliente.cli_nombre + ' ' + (c.cliente.cli_apaterno || '')) : 'Cliente';
                        var estadoClass = c.cita_estado === 'Realizada' ? 'text-success' : 
                                         c.cita_estado === 'Cancelada' ? 'text-danger' : 'text-warning';
                        return '<div class="d-flex justify-content-between align-items-center py-1 border-bottom">' +
                            '<div><i class="fas fa-user me-2"></i>' + nombreCliente + '<br><small class="text-muted">' + (c.cita_motivo || 'Sin motivo') + '</small></div>' +
                            '<div class="text-end"><small class="' + estadoClass + '">' + (c.cita_estado || 'Pendiente') + '</small><br><small><i class="far fa-clock me-1"></i>' + hora + '</small></div>' +
                        '</div>';
                    }).join('')
                    : '<div class="text-muted py-2 text-center">Sin citas en este periodo</div>';
            }
        })
        .catch(function(error) {
            console.error('Error cargando citas:', error);
            var lista = document.getElementById("citas-lista");
            if (lista) lista.innerHTML = '<div class="text-muted py-2 text-center">Error al cargar citas</div>';
        });
}

// ========== CALENDARIO ==========
function inicializarCalendario() {
    var calendarEl = document.getElementById('calendario');
    if (!calendarEl) return;
    
    if (calendarioPanel) { 
        calendarioPanel.destroy(); 
        calendarioPanel = null; 
    }

    fetch(API_CITAS_PANEL)
        .then(function(res) { return res.json(); })
        .then(function(response) {
            var data = response.success ? (response.data?.data || response.data) : response;
            var citas = Array.isArray(data) ? data : [];
            var eventos = citas.map(function(c) {
                var color = '#ffc107';
                if (c.cita_estado === 'Realizada') color = '#28a745';
                if (c.cita_estado === 'Cancelada') color = '#dc3545';
                if (c.cita_estado === 'Confirmada') color = '#17a2b8';
                
                var nombreCliente = c.cliente ? (c.cliente.cli_nombre + ' ' + (c.cliente.cli_apaterno || '')) : 'Cliente';
                
                return {
                    id: c.id_cita,
                    title: nombreCliente + ' - ' + (c.cita_motivo || 'Cita'),
                    start: c.cita_fecha_programada,
                    backgroundColor: color,
                    borderColor: color,
                    textColor: '#fff'
                };
            });

            calendarioPanel = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'es',
                events: eventos,
                headerToolbar: { 
                    left: 'prev,next today', 
                    center: 'title', 
                    right: 'dayGridMonth,timeGridWeek,timeGridDay' 
                },
                height: 'auto',
                eventClick: function(info) {
                    Swal.fire({
                        title: 'Cita #' + info.event.id,
                        html: '<strong>' + info.event.title + '</strong>',
                        icon: 'info',
                        confirmButtonText: 'Ver Detalle',
                        confirmButtonColor: '#080522'
                    }).then(function() {
                        if (typeof window.cargarVista === 'function') {
                            window.cargarVista('views/cita.html');
                        }
                    });
                }
            });
            calendarioPanel.render();
        })
        .catch(function(error) {
            console.error('Error cargando calendario:', error);
            calendarEl.innerHTML = '<div class="alert alert-danger">Error al cargar el calendario</div>';
        });
}

// ========== MAPA REFACCIONARIAS ==========
function buscarRefaccionarias() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            inicializarMapa(position.coords.latitude, position.coords.longitude);
        }, function() {
            inicializarMapa(19.4326, -99.1332);
        });
    } else {
        inicializarMapa(19.4326, -99.1332);
    }
}

function inicializarMapa(lat, lng) {
    var mapaEl = document.getElementById("mapaRefaccionarias");
    if (!mapaEl) return;

    if (mapaRefacciones) {
        mapaRefacciones.remove();
        mapaRefacciones = null;
    }

    mapaRefacciones = L.map('mapaRefaccionarias').setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapaRefacciones);

    var tallerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], 
        iconAnchor: [12, 41], 
        popupAnchor: [1, -34], 
        shadowSize: [41, 41]
    });

    L.marker([lat, lng], {icon: tallerIcon})
        .addTo(mapaRefacciones)
        .bindPopup('<b>🏍️ JHP Taller Mecánico</b><br>Tu ubicación actual')
        .openPopup();

    buscarRefaccionariasCercanas(lat, lng);
}

function buscarRefaccionariasCercanas(lat, lng) {
    var query = "refacciones+motocicletas+taller+motos";
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=8&q=" + query + "&lat=" + lat + "&lon=" + lng + "&bounded=1&viewbox=" + (lng-0.2) + "," + (lat-0.2) + "," + (lng+0.2) + "," + (lat+0.2);

    fetch(url, {
        headers: { 
            'Accept': 'application/json', 
            'User-Agent': 'JHP-Taller/1.0' 
        }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        marcadoresRefacciones.forEach(function(m) { 
            mapaRefacciones.removeLayer(m); 
        });
        marcadoresRefacciones = [];

        var listaTexto = document.getElementById("listaRefaccionariasTexto");
        if (!listaTexto) return;

        if (data && data.length > 0) {
            var refaccIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41], 
                iconAnchor: [12, 41], 
                popupAnchor: [1, -34], 
                shadowSize: [41, 41]
            });

            var filas = '';
            data.forEach(function(p, i) {
                var pLat = parseFloat(p.lat);
                var pLng = parseFloat(p.lon);
                var nombre = p.display_name.split(',')[0] || 'Refaccionaria';
                var direccion = p.display_name.split(',').slice(1, 4).join(',') || '';

                var marker = L.marker([pLat, pLng], {icon: refaccIcon})
                    .addTo(mapaRefacciones)
                    .bindPopup('<b>' + nombre + '</b><br>' + direccion + '<br><a href="https://www.google.com/maps/dir/' + lat + ',' + lng + '/' + pLat + ',' + pLng + '" target="_blank" class="btn btn-sm btn-primary mt-2">📍 Cómo llegar</a>');
                marcadoresRefacciones.push(marker);

                filas += '<div class="d-flex justify-content-between align-items-center py-2 border-bottom">' +
                    '<div><strong>' + (i+1) + '. ' + nombre + '</strong><br><small class="text-muted">' + direccion + '</small></div>' +
                    '<a href="https://www.google.com/maps/dir/' + lat + ',' + lng + '/' + pLat + ',' + pLng + '" target="_blank" class="btn btn-sm btn-outline-primary" title="Cómo llegar"><i class="fas fa-directions"></i></a>' +
                '</div>';
            });

            listaTexto.innerHTML = filas;
        } else {
            listaTexto.innerHTML = '<div class="text-muted py-2 text-center"><i class="fas fa-info-circle me-1"></i>No se encontraron refaccionarias en tu zona</div>';
        }
    })
    .catch(function() {
        var listaTexto = document.getElementById("listaRefaccionariasTexto");
        if (listaTexto) {
            listaTexto.innerHTML = '<div class="text-muted py-2 text-center">Error al cargar refaccionarias cercanas</div>';
        }
    });
}

// ========== FUNCIONES PARA ACTUALIZAR ==========
function actualizarVentas() {
    cargarVentasHoy();
}

function actualizarCitas() {
    cargarCitasPanel();
    inicializarCalendario();
}

// ========== EXPONER FUNCIONES GLOBALES ==========
window.inicializarPanel = inicializarPanel;
window.verificarEstadoCaja = verificarEstadoCaja;
window.abrirModalCaja = abrirModalCaja;
window.cerrarModal = cerrarModal;
window.confirmarAbrirCaja = confirmarAbrirCaja;
window.confirmarCerrarCaja = confirmarCerrarCaja;
window.cargarCitasPanel = cargarCitasPanel;
window.actualizarVentas = actualizarVentas;
window.actualizarCitas = actualizarCitas;
window.buscarRefaccionarias = buscarRefaccionarias;

// ========== INICIALIZACIÓN AUTOMÁTICA ==========
if (document.getElementById("calendario") || document.getElementById("estado-badge") || document.getElementById("mapaRefaccionarias")) {
    document.addEventListener('DOMContentLoaded', function() {
        inicializarPanel();
    });
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarPanel);
    } else {
        inicializarPanel();
    }
}