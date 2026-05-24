var API_VENTAS_PANEL = "https://jhpapi-production.up.railway.app/api/ventas";
var API_CAJA_PANEL = "https://jhpapi-production.up.railway.app/api/control_caja";
var API_CITAS_PANEL = "https://jhpapi-production.up.railway.app/api/citas";
var API_PRODUCTOS_PANEL = "https://jhpapi-production.up.railway.app/api/producto";

let calendarioPanel = null;

// ========== ALERTA STOCK BAJO (SUTIL) ==========
function verificarStockBajoPanel() {
    fetch(API_PRODUCTOS_PANEL)
        .then(res => res.json())
        .then(response => {
            const data = response.success ? response.data : response;
            const productos = Array.isArray(data) ? data : [];
            const bajos = productos.filter(p => p.pro_stock <= 5 && p.pro_stock > 0);
            const agotados = productos.filter(p => p.pro_stock <= 0);
            const total = bajos.length + agotados.length;

            const alertaEl = document.getElementById("alertaStockPanel");
            if (!alertaEl) return;

            if (total === 0) {
                alertaEl.style.display = "none";
                return;
            }

            let mensaje = '';
            if (agotados.length > 0) {
                mensaje += agotados.length + ' producto(s) agotado(s)';
            }
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
}

// ========== ESTADO DE CAJA ==========
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
            var idCaja = data.id_caja;
            fetch(API_CAJA_PANEL + '/' + idCaja, {
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

// ========== CITAS PANEL ==========
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

// ========== REFACCIONARIAS CERCANAS (OpenStreetMap - GRATIS) ==========
function buscarRefaccionarias() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            cargarRefaccionarias(position.coords.latitude, position.coords.longitude);
        }, function() {
            cargarRefaccionarias(19.4326, -99.1332);
        });
    } else {
        cargarRefaccionarias(19.4326, -99.1332);
    }
}

function cargarRefaccionarias(lat, lng) {
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=5&q=refacciones+motos+cerca&lat=" + lat + "&lon=" + lng + "&bounded=1&viewbox=" + (lng-0.15) + "," + (lat-0.15) + "," + (lng+0.15) + "," + (lat+0.15);

    fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'JHP-Taller/1.0' }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        var lista = document.getElementById("listaRefaccionarias");
        if (!lista) return;

        if (data && data.length > 0) {
            lista.innerHTML = data.slice(0, 5).map(function(p) {
                var nombre = p.display_name.split(',')[0] || 'Refaccionaria';
                var direccion = p.display_name.split(',').slice(1, 3).join(',') || '';
                var tipo = p.type || '';
                return '<div class="d-flex justify-content-between align-items-center py-2 border-bottom">' +
                    '<div><strong><i class="fas fa-store text-primary me-1"></i>' + nombre + '</strong>' +
                    '<br><small class="text-muted">' + direccion + '</small></div>' +
                    '<a href="https://www.openstreetmap.org/directions?from=' + lat + ',' + lng + '&to=' + p.lat + ',' + p.lon + '" target="_blank" class="btn btn-sm btn-outline-primary" title="Como llegar">' +
                    '<i class="fas fa-map-marker-alt"></i></a>' +
                '</div>';
            }).join('');
        } else {
            lista.innerHTML = '<div class="text-muted py-2"><i class="fas fa-info-circle me-1"></i>No se encontraron refaccionarias cercanas. Intenta con otra ubicacion.</div>';
        }
    })
    .catch(function() {
        var lista = document.getElementById("listaRefaccionarias");
        if (lista) lista.innerHTML = '<div class="text-muted py-2"><i class="fas fa-exclamation-triangle me-1"></i>Error al cargar refaccionarias</div>';
    });
}

// ========== EXPONER ==========
window.inicializarPanel = inicializarPanel;
window.verificarEstadoCaja = verificarEstadoCaja;
window.abrirModalCaja = abrirModalCaja;
window.cerrarModal = cerrarModal;
window.confirmarAbrirCaja = confirmarAbrirCaja;
window.cargarCitasPanel = cargarCitasPanel;
window.buscarRefaccionarias = buscarRefaccionarias;

// Inicializar
if (document.getElementById("calendario") || document.getElementById("estado-badge")) {
    inicializarPanel();
    setTimeout(buscarRefaccionarias, 2000);
}