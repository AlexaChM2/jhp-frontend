
window.API_CAJA = window.API_CAJA || "http://localhost:8000/api/control_caja";
window.API_CITAS = window.API_CITAS || "http://localhost:8000/api/citas";

let calendario = null;


function inicializarPanel() {
    console.log("Inicializando panel...");
    
    if (!document.getElementById('estado-badge')) {
        console.log("No es la vista de panel");
        return;
    }
    
    verificarEstadoCaja();
    cargarCitasHoy();
    mostrarFechaHoy();
    inicializarCalendario();
}


function mostrarFechaHoy() {
    const fechaSpan = document.getElementById('fecha-hoy');
    if (fechaSpan) {
        const fecha = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        fechaSpan.textContent = fecha.toLocaleDateString('es-MX', opciones);
    }
}


// CARGAR CITAS 
function cargarCitasHoy() {
    const citasHoyEl = document.getElementById('citas-hoy');
    const contenedorCitas = document.getElementById('citas-lista');
    
    if (!citasHoyEl) return;

    console.log(" Cargando citas...");

    fetch(window.API_CITAS)
        .then(res => res.json())
        .then(response => {
            const citas = response.success ? (response.data?.data || response.data) : response;
            const lista = Array.isArray(citas) ? citas : [];

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);
            const finSemana = new Date(hoy);
            finSemana.setDate(finSemana.getDate() + 7);

            const citasHoy = lista.filter(c => {
                const fechaCita = new Date(c.cita_fecha_programada);
                return fechaCita >= hoy && fechaCita < manana;
            });

            const citasProximas = lista.filter(c => {
                const fechaCita = new Date(c.cita_fecha_programada);
                return fechaCita >= manana && fechaCita <= finSemana;
            });

            citasHoyEl.textContent = citasHoy.length;

            if (contenedorCitas) {
                if (citasHoy.length === 0 && citasProximas.length === 0) {
                    contenedorCitas.innerHTML = `
                        <div class="text-center py-3">
                            <i class="fas fa-calendar-check fa-2x text-muted mb-2"></i>
                            <p class="text-muted">No hay citas próximas</p>
                        </div>`;
                    return;
                }

                let html = '';

                if (citasHoy.length > 0) {
                    html += `<div class="citas-seccion mb-3">
                        <h6 class="text-success fw-bold"><i class="fas fa-circle"></i> Hoy (${citasHoy.length})</h6>`;
                    
                    citasHoy.forEach(c => {
                        const hora = c.cita_fecha_programada 
                            ? new Date(c.cita_fecha_programada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) 
                            : '--:--';
                        const cliente = c.cliente 
                            ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() 
                            : 'Sin cliente';
                        const estadoClass = c.cita_estado === 'Realizada' ? 'success' : 
                                           (c.cita_estado === 'Cancelada' ? 'danger' : 'warning');
                        
                        html += `
                            <div class="cita-item d-flex justify-content-between align-items-center py-1 border-bottom">
                                <div>
                                    <span class="badge bg-light text-dark me-2">${hora}</span>
                                    <span>${cliente}</span>
                                </div>
                                <div>
                                    <span class="badge bg-${estadoClass}">${c.cita_estado || 'Pendiente'}</span>
                                    <small class="text-muted ms-2">${c.cita_motivo || ''}</small>
                                </div>
                            </div>`;
                    });
                    html += `</div>`;
                }

                if (citasProximas.length > 0) {
                    html += `<div class="citas-seccion">
                        <h6 class="text-primary fw-bold"><i class="fas fa-calendar-alt"></i> Próximos 7 días (${citasProximas.length})</h6>`;
                    
                    citasProximas.slice(0, 5).forEach(c => {
                        const fecha = c.cita_fecha_programada 
                            ? new Date(c.cita_fecha_programada).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
                            : '--';
                        const hora = c.cita_fecha_programada 
                            ? new Date(c.cita_fecha_programada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) 
                            : '--:--';
                        const cliente = c.cliente 
                            ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() 
                            : 'Sin cliente';
                        
                        html += `
                            <div class="cita-item d-flex justify-content-between align-items-center py-1 border-bottom">
                                <div>
                                    <span class="badge bg-primary me-2">${fecha}</span>
                                    <span class="text-muted">${hora}</span>
                                    <span class="ms-2">${cliente}</span>
                                </div>
                            </div>`;
                    });
                    html += `</div>`;
                }

                contenedorCitas.innerHTML = html;
            }
        })
        .catch(err => {
            console.error("Error al cargar citas:", err);
            if (citasHoyEl) citasHoyEl.textContent = '--';
        });
}


// CALENDARIO

function inicializarCalendario() {
    const calendarEl = document.getElementById('calendario');
    if (!calendarEl) {
        console.warn(' #calendario no encontrado');
        return;
    }

    if (typeof FullCalendar === 'undefined') {
        console.warn('FullCalendar no cargado, reintentando...');
        calendarEl.innerHTML = '<p class="text-center text-muted py-5">Cargando calendario...</p>';
        setTimeout(inicializarCalendario, 1000);
        return;
    }

    console.log('Inicializando calendario...');

    if (calendario) {
        calendario.destroy();
        calendario = null;
    }

    calendario = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        height: 'auto',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día'
        },
        events: async function(info, successCallback, failureCallback) {
            try {
                const res = await fetch(window.API_CITAS);
                const response = await res.json();
                const citas = response.success ? (response.data?.data || response.data) : response;
                const lista = Array.isArray(citas) ? citas : [];

                const eventos = lista
                    .filter(c => c.cita_fecha_programada)
                    .map(c => ({
                        id: c.id_cita,
                        title: `${c.cliente?.cli_nombre || 'Cliente'} - ${c.cita_motivo || 'Cita'}`,
                        start: c.cita_fecha_programada,
                        backgroundColor: c.cita_estado === 'Realizada' ? '#28a745' : 
                                       c.cita_estado === 'Cancelada' ? '#dc3545' : '#ffc107',
                        borderColor: c.cita_estado === 'Realizada' ? '#28a745' : 
                                    c.cita_estado === 'Cancelada' ? '#dc3545' : '#ffc107',
                        textColor: '#000',
                        extendedProps: {
                            cliente: c.cliente?.cli_nombre || '',
                            mecanico: c.empleado?.emp_nombre || '',
                            estado: c.cita_estado,
                            motivo: c.cita_motivo
                        }
                    }));

                successCallback(eventos);
            } catch (e) {
                console.error('Error cargando eventos:', e);
                failureCallback(e);
            }
        },
        eventClick: function(info) {
            const props = info.event.extendedProps;
            Swal.fire({
                title: info.event.title,
                html: `
                    <div style="text-align:left;">
                        <p><strong>Fecha:</strong> ${new Date(info.event.start).toLocaleString('es-MX')}</p>
                        <p><strong> Cliente:</strong> ${props.cliente || 'No asignado'}</p>
                        <p><strong> Mecánico:</strong> ${props.mecanico || 'No asignado'}</p>
                        <p><strong> Motivo:</strong> ${props.motivo || 'N/A'}</p>
                        <p><strong>Estado:</strong> 
                            <span class="badge bg-${props.estado === 'Realizada' ? 'success' : props.estado === 'Cancelada' ? 'danger' : 'warning'}">
                                ${props.estado || 'Pendiente'}
                            </span>
                        </p>
                    </div>`,
                icon: 'info',
                confirmButtonColor: '#0d6efd'
            });
        },
        dateClick: function(info) {
            Swal.fire({
                title: 'Nueva Cita',
                text: `¿Crear cita para ${info.dateStr}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, crear',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.setItem('fecha_cita_preseleccionada', info.dateStr);
                    window.cargarVista('views/cita.html');
                }
            });
        },
        loading: function(isLoading) {
            if (isLoading) console.log(' Cargando eventos...');
        }
    });

    calendario.render();
    console.log(' Calendario renderizado');
}


// VERIFICAR ESTADO DE CAJA

window.verificarEstadoCaja = function() {
    if (!document.getElementById('estado-badge')) return;
    
    console.log("Consultando API de estado...");
    
    fetch(`${window.API_CAJA}/estado`)
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success' && data.caja_abierta === true) {
            actualizarInterfazAbierta(data.monto_inicial, data.ventas_hoy);
        } else {
            actualizarInterfazCerrada();
            window.actualizarVentasHoy(0);
        }
    })
    .catch(err => {
        console.error("Error al sincronizar estado:", err);
        actualizarInterfazCerrada();
    });
};


function actualizarInterfazAbierta(monto, ventas = 0) {
    const badge = document.getElementById('estado-badge');
    const btn = document.getElementById('btn-caja');
    const montoTexto = document.getElementById('monto-apertura-texto');
    const montoVal = document.getElementById('monto-inicial-val');
    const cardCaja = document.querySelector('.card-caja');
    
    if (badge) { badge.innerText = "Abierta"; badge.className = "badge bg-success mb-3"; }
    if (montoVal) montoVal.innerText = `$${parseFloat(monto || 0).toFixed(2)}`;
    if (montoTexto) montoTexto.style.display = 'block';
    
    window.actualizarVentasHoy(ventas);
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-door-closed"></i> Cerrar Caja';
        btn.className = "btn btn-danger w-100 mt-2 py-2";
        btn.onclick = ejecutarCerrarCaja;
    }
    if (cardCaja) cardCaja.style.borderLeft = '4px solid #28a745';
}

function actualizarInterfazCerrada() {
    const badge = document.getElementById('estado-badge');
    const btn = document.getElementById('btn-caja');
    const montoTexto = document.getElementById('monto-apertura-texto');
    const cardCaja = document.querySelector('.card-caja');

    if (badge) { badge.innerText = "Cerrada"; badge.className = "badge bg-danger mb-3"; }
    if (montoTexto) montoTexto.style.display = 'none';
    window.actualizarVentasHoy(0);
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-door-open"></i> Abrir Caja';
        btn.className = "btn btn-primary w-100 mt-2 py-2";
        btn.onclick = window.mostrarModalAbrirCaja;
    }
    if (cardCaja) cardCaja.style.borderLeft = '4px solid #dc3545';
}

window.actualizarVentasHoy = function(montoVentas) {
    const elementoVenta = document.querySelector('.card-ventas .monto');
    if (elementoVenta) elementoVenta.innerText = `$${parseFloat(montoVentas || 0).toFixed(2)}`;
    const actualizadoText = document.querySelector('.card-ventas small');
    if (actualizadoText) {
        actualizadoText.innerText = `Actualizado ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
    }
};


window.mostrarModalAbrirCaja = function() {
    const modal = document.getElementById('modal-caja');
    if (modal) { modal.style.display = 'flex'; document.getElementById('monto_inicial')?.focus(); }
};

window.cerrarModal = function() {
    const modal = document.getElementById('modal-caja');
    if (modal) modal.style.display = 'none';
};

window.confirmarAbrirCaja = function() {
    const monto = parseFloat(document.getElementById('monto_inicial')?.value);
    if (isNaN(monto) || monto < 0) return Swal.fire('Atención', 'Ingresa un monto válido', 'warning');

    fetch(window.API_CAJA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: 'abrir', monto_inicial: monto, id_empleado: 1 })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            Swal.fire('¡Éxito!', 'Caja iniciada', 'success');
            window.cerrarModal();
            verificarEstadoCaja();
        }
    });
};

function ejecutarCerrarCaja() {
    Swal.fire({
        title: '¿Cerrar caja?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, cerrar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(window.API_CAJA, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accion: 'cerrar', monto_real_cierre: 0 })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire('¡Cerrada!', '', 'success');
                    verificarEstadoCaja();
                }
            });
        }
    });
}


document.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
        if (document.getElementById('estado-badge')) inicializarPanel();
    }, 300);
});

window.addEventListener('focus', function() {
    setTimeout(() => {
        if (document.getElementById('estado-badge')) {
            window.verificarEstadoCaja();
            cargarCitasHoy();
        }
    }, 200);
});

window.onclick = function(event) {
    if (event.target === document.getElementById('modal-caja')) window.cerrarModal();
};


window.inicializarPanel = inicializarPanel;
window.inicializarCalendario = inicializarCalendario;
window.cargarCitasHoy = cargarCitasHoy;