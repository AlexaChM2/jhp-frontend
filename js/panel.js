var API_VENTAS_PANEL = "https://jhpapi-production.up.railway.app/api/ventas";
var API_CAJA_PANEL = "https://jhpapi-production.up.railway.app/api/control_caja";
var API_CITAS_PANEL = "https://jhpapi-production.up.railway.app/api/citas";
var API_PRODUCTOS_PANEL = "https://jhpapi-production.up.railway.app/api/producto";

let calendarioPanel = null;
var mapaRefacciones = null;
var marcadoresRefacciones = [];

// ========== ALERTA STOCK BAJO ==========
function verificarStockBajoPanel() {
    fetch(API_PRODUCTOS_PANEL)
        .then(function(res) { return res.json(); })
        .then(function(response) {
            var data = response.success ? response.data : response;
            var productos = Array.isArray(data) ? data : [];
            var bajos = productos.filter(function(p) { return p.pro_stock <= 5 && p.pro_stock > 0; });
            var agotados = productos.filter(function(p) { return p.pro_stock <= 0; });
            var total = bajos.length + agotados.length;

            var alertaEl = document.getElementById("alertaStockPanel");
            if (!alertaEl) return;

            if (total === 0) {
                alertaEl.style.display = "none";
                return;
            }

            var mensaje = '';
            if (agotados.length > 0) mensaje += agotados.length + ' producto(s) agotado(s)';
            if (bajos.length > 0) {
                if (mensaje) mensaje += ' | ';
                mensaje += bajos.length + ' con stock bajo';
            }

            alertaEl.style.display = "block";
            document.getElementById("stockAlertaTexto").textContent = mensaje;
        })
        .catch(function() {});
}

// ========== INICIALIZAR ==========
function inicializarPanel() {
    verificarEstadoCaja();
    cargarVentasHoy();
    cargarCitasPanel();
    verificarStockBajoPanel();
    inicializarCalendario();
    setTimeout(buscarRefaccionarias, 1500);
}

// ========== CAJA ==========
function verificarEstadoCaja() {
    fetch(API_CAJA_PANEL + '/estado')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var badge = document.getElementById("estado-badge");
            var btn = document.getElementById("btn-caja");
            var montoTexto = document.getElementById("monto-apertura-texto");
            var montoVal = document.getElementById("monto-inicial-val");

            if (data.caja_abierta) {
                if (badge) { badge.textContent = "Abierta"; badge.className = "badge verde mb-3"; }
                if (btn) { btn.innerHTML = '<i class="fas fa-door-closed"></i> Cerrar Caja'; btn.onclick = confirmarCerrarCaja; }
                if (montoTexto) montoTexto.style.display = "block";
                if (montoVal) montoVal.textContent = '$' + parseFloat(data.monto_inicial || 0).toFixed(2);
            } else {
                if (badge) { badge.textContent = "Cerrada"; badge.className = "badge rojo mb-3"; }
                if (btn) { btn.innerHTML = '<i class="fas fa-door-open"></i> Abrir Caja'; btn.onclick = abrirModalCaja; }
                if (montoTexto) montoTexto.style.display = "none";
            }
        });
}

function abrirModalCaja() {
    document.getElementById("modal-caja").style.display = "flex";
}

function cerrarModal() {
    document.getElementById("modal-caja").style.display = "none";
}

function confirmarAbrirCaja() {
    var monto = parseFloat(document.getElementById("monto_inicial").value) || 0;
    if (monto <= 0) return Swal.fire("Error", "Ingresa un monto inicial valido", "warning");
    var token = localStorage.getItem('token');
    fetch(API_CAJA_PANEL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ id_empleado: 1, monto_inicial: monto })
    })
    .then(function(res) { return res.json(); })
    .then(function() {
        Swal.fire({ icon: 'success', title: 'Caja Abierta', timer: 1500, showConfirmButton: false });
        cerrarModal();
        verificarEstadoCaja();
    });
}

function confirmarCerrarCaja() {
    var token = localStorage.getItem('token');
    fetch(API_CAJA_PANEL + '/estado')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            fetch(API_CAJA_PANEL + '/' + data.id_caja, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({ estado: 'Cerrada', fecha_cierre: new Date().toISOString() })
            })
            .then(function() {
                Swal.fire({ icon: 'success', title: 'Caja Cerrada', timer: 1500, showConfirmButton: false });
                verificarEstadoCaja();
            });
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
            document.getElementById("ventas-monto").textContent = '$' + total.toFixed(2);
            document.getElementById("ventas-actualizado").textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-MX');
        });
}

// ========== CITAS ==========
function cargarCitasPanel() {
    var filtro = document.getElementById("filtroCitasPanel")?.value || "hoy";
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
                document.getElementById("filtro-citas-texto").textContent = "Citas para hoy";
            } else if (filtro === "semana") {
                var finSemana = new Date(ahora);
                finSemana.setDate(ahora.getDate() + 7);
                citasFiltradas = citas.filter(function(c) {
                    var f = new Date(c.cita_fecha_programada);
                    return f >= ahora && f <= finSemana;
                });
                document.getElementById("filtro-citas-texto").textContent = "Proximos 7 dias";
            } else if (filtro === "mes") {
                var finMes = new Date(ahora);
                finMes.setDate(ahora.getDate() + 30);
                citasFiltradas = citas.filter(function(c) {
                    var f = new Date(c.cita_fecha_programada);
                    return f >= ahora && f <= finMes;
                });
                document.getElementById("filtro-citas-texto").textContent = "Proximos 30 dias";
            }

            document.getElementById("citas-hoy").textContent = citasFiltradas.length;
            var lista = document.getElementById("citas-lista");
            if (lista) {
                lista.innerHTML = citasFiltradas.length > 0
                    ? citasFiltradas.map(function(c) {
                        return '<div class="d-flex justify-content-between py-1 border-bottom"><span>' +
                            (c.cliente?.cli_nombre || 'Cliente') + '</span><small>' +
                            (c.cita_fecha_programada ? new Date(c.cita_fecha_programada).toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'}) : '') +
                            '</small></div>';
                    }).join('')
                    : '<div class="text-muted py-2">Sin citas en este periodo</div>';
            }
        });
}

// ========== CALENDARIO ==========
function inicializarCalendario() {
    var calendarEl = document.getElementById('calendario');
    if (!calendarEl) return;
    if (calendarioPanel) { calendarioPanel.destroy(); calendarioPanel = null; }

    fetch(API_CITAS_PANEL)
        .then(function(res) { return res.json(); })
        .then(function(response) {
            var data = response.success ? (response.data?.data || response.data) : response;
            var citas = Array.isArray(data) ? data : [];
            var eventos = citas.map(function(c) {
                return {
                    id: c.id_cita,
                    title: (c.cliente?.cli_nombre || 'Cliente') + ' - ' + (c.cita_motivo || 'Cita'),
                    start: c.cita_fecha_programada,
                    backgroundColor: c.cita_estado === 'Realizada' ? '#28a745' : c.cita_estado === 'Cancelada' ? '#dc3545' : '#ffc107',
                    borderColor: c.cita_estado === 'Realizada' ? '#28a745' : c.cita_estado === 'Cancelada' ? '#dc3545' : '#ffc107',
                    textColor: '#000'
                };
            });

            calendarioPanel = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'es',
                events: eventos,
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
                height: 'auto',
                eventClick: function(info) {
                    Swal.fire({
                        title: 'Cita #' + info.event.id,
                        text: info.event.title,
                        icon: 'info',
                        confirmButtonText: 'Ver Citas',
                        confirmButtonColor: '#080522'
                    }).then(function() {
                        if (typeof window.cargarVista === 'function') window.cargarVista('views/cita.html');
                    });
                }
            });
            calendarioPanel.render();
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
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(mapaRefacciones);

    var tallerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });

    L.marker([lat, lng], {icon: tallerIcon})
        .addTo(mapaRefacciones)
        .bindPopup('<b>JHP Taller Mecanico</b><br>Tu ubicacion')
        .openPopup();

    buscarRefaccionariasCercanas(lat, lng);
}

function buscarRefaccionariasCercanas(lat, lng) {
    var query = "refacciones+motocicletas+taller+motos";
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=8&q=" + query + "&lat=" + lat + "&lon=" + lng + "&bounded=1&viewbox=" + (lng-0.2) + "," + (lat-0.2) + "," + (lng+0.2) + "," + (lat+0.2);

    fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'JHP-Taller/1.0' }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        marcadoresRefacciones.forEach(function(m) { mapaRefacciones.removeLayer(m); });
        marcadoresRefacciones = [];

        var listaTexto = document.getElementById("listaRefaccionariasTexto");
        if (!listaTexto) return;

        if (data && data.length > 0) {
            var refaccIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
            });

            var filas = '';
            data.forEach(function(p, i) {
                var pLat = parseFloat(p.lat);
                var pLng = parseFloat(p.lon);
                var nombre = p.display_name.split(',')[0] || 'Refaccionaria';
                var direccion = p.display_name.split(',').slice(1, 3).join(',') || '';

                var marker = L.marker([pLat, pLng], {icon: refaccIcon})
                    .addTo(mapaRefacciones)
                    .bindPopup('<b>' + nombre + '</b><br>' + direccion + '<br><a href="https://www.google.com/maps/dir/' + lat + ',' + lng + '/' + pLat + ',' + pLng + '" target="_blank">Como llegar</a>');
                marcadoresRefacciones.push(marker);

                filas += '<div class="d-flex justify-content-between align-items-center py-1 border-bottom">' +
                    '<div><strong>' + (i+1) + '. ' + nombre + '</strong><br><small class="text-muted">' + direccion + '</small></div>' +
                    '<a href="https://www.google.com/maps/dir/' + lat + ',' + lng + '/' + pLat + ',' + pLng + '" target="_blank" class="btn btn-sm btn-outline-primary" title="Como llegar"><i class="fas fa-directions"></i></a>' +
                '</div>';
            });

            listaTexto.innerHTML = filas || '<div class="text-muted py-2">No se encontraron resultados</div>';
        } else {
            listaTexto.innerHTML = '<div class="text-muted py-2"><i class="fas fa-info-circle me-1"></i>No se encontraron refaccionarias en tu zona.</div>';
        }
    })
    .catch(function() {
        var listaTexto = document.getElementById("listaRefaccionariasTexto");
        if (listaTexto) listaTexto.innerHTML = '<div class="text-muted py-2">Error al cargar refaccionarias</div>';
    });
}

// ========== EXPONER ==========
window.inicializarPanel = inicializarPanel;
window.verificarEstadoCaja = verificarEstadoCaja;
window.abrirModalCaja = abrirModalCaja;
window.cerrarModal = cerrarModal;
window.confirmarAbrirCaja = confirmarAbrirCaja;
window.cargarCitasPanel = cargarCitasPanel;

// Inicializar
if (document.getElementById("calendario") || document.getElementById("estado-badge")) {
    inicializarPanel();
}