var API_CITA_CITAS = "https://jhpapi-production.up.railway.app/api/citas";
var API_CLI_CITAS = "https://jhpapi-production.up.railway.app/api/clientes";
var API_EMP_CITAS = "https://jhpapi-production.up.railway.app/api/empleados";

let clienteIdCita = null;
let empleadoIdCita = null;
let editandoCitaId = null;
let citasIniciadas = false;
let citasExistentes = [];
let currentCalendar = null;

// ========== CONFIGURACIÓN ==========
const CONFIG = {
    HORARIO: {
        INICIO: 9,      // 9 AM
        FIN: 18,        // 6 PM
        DIAS_LABORALES: [1, 2, 3, 4, 5], // Lunes a Viernes (1=Lunes, 5=Viernes)
        DURACION_MINIMA_HORAS: 3
    },
    COLORES: {
        DISPONIBLE: '#28a745',   // Verde - Días con horarios disponibles
        NO_DISPONIBLE: '#dc3545', // Rojo - Días sin horarios disponibles
        PARCIAL: '#ffc107'        // Amarillo - Días con disponibilidad parcial
    }
};

// ========== AUTO-INICIALIZACIÓN ==========
(function() {
    document.addEventListener('vista-cargada', function(e) {
        if (e.detail && e.detail.vista && 
            (e.detail.vista.includes('cita') || e.detail.vista.includes('Cita'))) {
            citasIniciadas = false;
            setTimeout(() => {
                listarCitas();
                cargarSelectEmpleados();
                inicializarSelectorFecha();
                inicializarCalendario();
            }, 500);
        }
    });
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const tabla = document.getElementById('tablaCitas');
        if (tabla) setTimeout(() => {
            listarCitas();
            inicializarCalendario();
        }, 300);
    }
})();

// ========== INICIALIZAR CALENDARIO ==========
async function inicializarCalendario() {
    const calendarEl = document.getElementById('calendarioCitas');
    if (!calendarEl) return;
    
    if (currentCalendar) {
        currentCalendar.destroy();
    }
    
    await cargarCitasExistentes();
    const eventos = await generarEventosCalendario();
    
    currentCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        height: 'auto',
        events: eventos,
        eventClick: function(info) {
            if (info.event.extendedProps.disponibilidad) {
                mostrarHorariosDisponibles(info.event.start);
            }
        },
        dayCellDidMount: function(info) {
            // Personalizar tooltip en días
            const fechaStr = info.date.toLocaleDateString('es-MX');
            const evento = eventos.find(e => e.start.toDateString() === info.date.toDateString());
            if (evento) {
                info.el.style.cursor = 'pointer';
                info.el.title = evento.title;
            }
        }
    });
    
    currentCalendar.render();
}

async function generarEventosCalendario() {
    await cargarCitasExistentes();
    
    const eventos = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fin = new Date(hoy);
    fin.setMonth(fin.getMonth() + 3);
    
    for (let d = new Date(hoy); d <= fin; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.getDay();
        let diaJS = diaSemana === 0 ? 7 : diaSemana;
        const esLaboral = CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS);
        
        if (!esLaboral) {
            eventos.push({
                title: '🔴 No laboral',
                start: new Date(d),
                allDay: true,
                backgroundColor: CONFIG.COLORES.NO_DISPONIBLE,
                borderColor: CONFIG.COLORES.NO_DISPONIBLE,
                textColor: 'white',
                extendedProps: { disponibilidad: false }
            });
            continue;
        }
        
        const disponibilidad = await verificarDisponibilidadDia(d);
        
        if (disponibilidad.completa) {
            eventos.push({
                title: '✅ Disponible',
                start: new Date(d),
                allDay: true,
                backgroundColor: CONFIG.COLORES.DISPONIBLE,
                borderColor: CONFIG.COLORES.DISPONIBLE,
                textColor: 'white',
                extendedProps: { disponibilidad: true, horarios: disponibilidad.horarios }
            });
        } else if (disponibilidad.parcial) {
            eventos.push({
                title: '⚠️ Disponibilidad parcial',
                start: new Date(d),
                allDay: true,
                backgroundColor: CONFIG.COLORES.PARCIAL,
                borderColor: CONFIG.COLORES.PARCIAL,
                textColor: 'black',
                extendedProps: { disponibilidad: true, horarios: disponibilidad.horarios }
            });
        } else {
            eventos.push({
                title: '🔴 Sin disponibilidad',
                start: new Date(d),
                allDay: true,
                backgroundColor: CONFIG.COLORES.NO_DISPONIBLE,
                borderColor: CONFIG.COLORES.NO_DISPONIBLE,
                textColor: 'white',
                extendedProps: { disponibilidad: false }
            });
        }
    }
    
    return eventos;
}

async function verificarDisponibilidadDia(fecha) {
    const fechaStr = fecha.toDateString();
    const citasDia = citasExistentes.filter(cita => {
        const fechaCita = new Date(cita.cita_fecha_programada);
        return fechaCita.toDateString() === fechaStr;
    });
    
    const horasOcupadas = [];
    citasDia.forEach(cita => {
        const fechaCita = new Date(cita.cita_fecha_programada);
        const inicio = fechaCita.getHours();
        for (let i = 0; i < CONFIG.HORARIO.DURACION_MINIMA_HORAS; i++) {
            horasOcupadas.push(inicio + i);
        }
    });
    
    const horariosDisponibles = [];
    for (let hora = CONFIG.HORARIO.INICIO; hora <= CONFIG.HORARIO.FIN - CONFIG.HORARIO.DURACION_MINIMA_HORAS; hora++) {
        let ocupado = false;
        for (let h = hora; h < hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS; h++) {
            if (horasOcupadas.includes(h)) {
                ocupado = true;
                break;
            }
        }
        if (!ocupado) {
            horariosDisponibles.push({
                inicio: hora,
                fin: hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS,
                texto: `${hora.toString().padStart(2, '0')}:00 - ${(hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS).toString().padStart(2, '0')}:00`
            });
        }
    }
    
    return {
        completa: horariosDisponibles.length > 0,
        parcial: horariosDisponibles.length > 0 && horariosDisponibles.length < 5,
        horarios: horariosDisponibles
    };
}

function mostrarHorariosDisponibles(fecha) {
    const modalHtml = `
        <div class="modal fade" id="modalHorarios" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-calendar-day me-2"></i>Horarios Disponibles
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-3">
                            <strong>${fecha.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                        </p>
                        <div id="listaHorariosDisponibles" class="d-flex flex-wrap gap-2">
                            <div class="text-center w-100 py-3">
                                <div class="spinner-border text-primary" role="status"></div>
                                <p class="mt-2">Cargando horarios...</p>
                            </div>
                        </div>
                        <small class="text-muted mt-3 d-block">
                            <i class="fas fa-info-circle me-1"></i>
                            Cada cita tiene una duración mínima de ${CONFIG.HORARIO.DURACION_MINIMA_HORAS} horas.
                        </small>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar modal existente si lo hay
    const existingModal = document.getElementById('modalHorarios');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById('modalHorarios');
    const modal = new bootstrap.Modal(modalElement);
    
    // Cargar horarios
    cargarYMostrarHorarios(fecha, modal);
    
    modal.show();
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.remove();
    });
}

async function cargarYMostrarHorarios(fecha, modal) {
    const container = document.getElementById('listaHorariosDisponibles');
    const disponibilidad = await verificarDisponibilidadDia(fecha);
    
    if (disponibilidad.horarios.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning text-center w-100">
                <i class="fas fa-calendar-times fa-2x mb-2 d-block"></i>
                No hay horarios disponibles para este día.
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="row g-2 w-100">
            ${disponibilidad.horarios.map(horario => `
                <div class="col-6 col-md-4">
                    <button class="btn btn-outline-success w-100 py-2 seleccionar-horario-btn" 
                            data-inicio="${horario.inicio}"
                            data-fin="${horario.fin}"
                            style="border-radius: 10px;">
                        <i class="fas fa-clock me-1"></i>
                        ${horario.texto}
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    // Agregar eventos a los botones
    container.querySelectorAll('.seleccionar-horario-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const horaInicio = parseInt(this.dataset.inicio);
            const fechaSeleccionada = new Date(fecha);
            fechaSeleccionada.setHours(horaInicio, 0, 0, 0);
            
            // Formatear para input datetime-local
            const año = fechaSeleccionada.getFullYear();
            const mes = String(fechaSeleccionada.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaSeleccionada.getDate()).padStart(2, '0');
            const hora = String(horaInicio).padStart(2, '0');
            
            const fechaFormateada = `${año}-${mes}-${dia}T${hora}:00`;
            
            // Cerrar modal de horarios
            modal.hide();
            
            // Abrir modal de cita con fecha preseleccionada
            setTimeout(() => {
                abrirModalCitaConFecha(fechaFormateada);
            }, 300);
        });
    });
}

function abrirModalCitaConFecha(fecha) {
    abrirModalCita();
    const inputFecha = document.getElementById("cita_fecha");
    if (inputFecha) {
        inputFecha.value = fecha;
        validarHorarioCita();
    }
}

// ========== INICIALIZAR SELECTOR DE FECHA ==========
function inicializarSelectorFecha() {
    const inputFecha = document.getElementById("cita_fecha");
    if (!inputFecha) return;
    
    inputFecha.addEventListener('change', validarHorarioCita);
    inputFecha.addEventListener('input', validarHorarioCita);
    
    const ahora = new Date();
    ahora.setMinutes(0, 0, 0);
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(CONFIG.HORARIO.INICIO).padStart(2, '0');
    inputFecha.min = `${año}-${mes}-${dia}T${hora}:00`;
}

async function validarHorarioCita() {
    const inputFecha = document.getElementById("cita_fecha");
    const fechaSeleccionada = inputFecha.value;
    let errorDiv = document.getElementById("errorHorarioCita");
    
    if (!errorDiv) {
        errorDiv = document.createElement("div");
        errorDiv.id = "errorHorarioCita";
        errorDiv.className = "text-danger small mt-1";
        inputFecha.parentNode.appendChild(errorDiv);
    }
    
    if (!fechaSeleccionada) return true;
    
    const fecha = new Date(fechaSeleccionada);
    const diaSemana = fecha.getDay();
    let diaJS = diaSemana === 0 ? 7 : diaSemana;
    let diaLaboral = CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS);
    
    if (!diaLaboral) {
        errorDiv.textContent = "❌ Los sábados y domingos no hay servicio. Selecciona un día de lunes a viernes.";
        inputFecha.value = "";
        return false;
    }
    
    const hora = fecha.getHours();
    if (hora < CONFIG.HORARIO.INICIO || hora >= CONFIG.HORARIO.FIN) {
        errorDiv.textContent = `❌ El horario de atención es de ${CONFIG.HORARIO.INICIO}:00 AM a ${CONFIG.HORARIO.FIN}:00 PM.`;
        inputFecha.value = "";
        return false;
    }
    
    const horaFin = hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS;
    if (horaFin > CONFIG.HORARIO.FIN) {
        errorDiv.textContent = `❌ La cita requiere ${CONFIG.HORARIO.DURACION_MINIMA_HORAS} horas. El horario máximo para iniciar es a las ${CONFIG.HORARIO.FIN - CONFIG.HORARIO.DURACION_MINIMA_HORAS}:00.`;
        inputFecha.value = "";
        return false;
    }
    
    await cargarCitasExistentes();
    const conflicto = verificarConflictoHorario(fechaSeleccionada);
    
    if (conflicto) {
        errorDiv.textContent = "❌ Ya existe una cita programada en este horario. Selecciona otro horario.";
        inputFecha.value = "";
        return false;
    }
    
    errorDiv.textContent = "";
    return true;
}

function verificarConflictoHorario(fechaSeleccionada) {
    const fechaInicio = new Date(fechaSeleccionada);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setHours(fechaFin.getHours() + CONFIG.HORARIO.DURACION_MINIMA_HORAS);
    
    return citasExistentes.some(cita => {
        if (editandoCitaId === cita.id_cita) return false;
        
        const citaInicio = new Date(cita.cita_fecha_programada);
        const citaFin = new Date(citaInicio);
        citaFin.setHours(citaFin.getHours() + CONFIG.HORARIO.DURACION_MINIMA_HORAS);
        
        return (fechaInicio < citaFin && fechaFin > citaInicio);
    });
}

async function cargarCitasExistentes() {
    try {
        const res = await fetch(API_CITA_CITAS);
        const response = await res.json();
        const data = response.success ? (response.data?.data || response.data) : response;
        citasExistentes = Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error cargando citas:", error);
        citasExistentes = [];
    }
}

// ========== CARGAR SELECT DE EMPLEADOS ==========
function cargarSelectEmpleados() {
    fetch(API_EMP_CITAS)
        .then(res => res.json())
        .then(response => {
            const empleados = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(empleados) ? empleados : [];
            const sel = document.getElementById("id_empleado_select");
            if (sel) {
                sel.innerHTML = '<option value="">Seleccione empleado...</option>' +
                    datos.map(e => `<option value="${e.id_empleados}">${e.emp_nombre} ${e.emp_apaterno || ''} (${e.emp_rol})</option>`).join('');
            }
        });
}

// ========== LISTAR CITAS ==========
function listarCitas() {
    const tbody = document.getElementById("tablaCitas");
    if (!tbody) return;

    fetch(API_CITA_CITAS)
        .then(res => res.json())
        .then(response => {
            const data = response.success ? (response.data?.data || response.data) : response;
            const citas = Array.isArray(data) ? data : [];

            if (citas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3">No hay citas registradas</td></tr>';
                return;
            }

            tbody.innerHTML = citas.map(c => {
                const cliente = c.cliente 
                    ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() 
                    : 'Sin cliente';
                const empleado = c.empleado ? c.empleado.emp_nombre : 'Sin asignar';
                const estadoClass = c.cita_estado === 'Realizada' ? 'success' : 
                                   (c.cita_estado === 'Cancelada' ? 'danger' : 'warning');

                return `
                <tr>
                    <td><strong>#${c.id_cita}</strong></td>
                    <td>${c.cita_fecha_programada ? new Date(c.cita_fecha_programada).toLocaleString('es-MX') : '-'}</td>
                    <td>${cliente}</td>
                    <td>${empleado}</td>
                    <td>${c.cita_motivo || 'N/A'}</td>
                    <td><span class="badge bg-${estadoClass}">${c.cita_estado || 'Pendiente'}</span></td>
                    <td class="text-center">
                        <div class="btn-group btn-group-sm">
                            ${c.cita_estado !== 'Realizada' ? `
                            <button class="btn btn-success" onclick="window.prepararServicio(${c.id_cita})" title="Iniciar Servicio">
                                <i class="fas fa-tools"></i>
                            </button>` : ''}
                            <button class="btn btn-warning" onclick="window.editarCita(${c.id_cita})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger" onclick="window.eliminarCita(${c.id_cita})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        })
        .catch(err => console.error("Error al listar citas:", err));
}

// ========== PREPARAR SERVICIO DESDE CITA ==========
function prepararServicio(idCita) {
    localStorage.setItem('id_cita_seleccionada', idCita);
    if (typeof window.cargarVista === 'function') window.cargarVista('views/servicios.html');
}

// ========== BUSCAR CLIENTE ==========
function buscarClienteCita(v) {
    const lista = document.getElementById("resCliCita");
    if (!lista) return;
    if (v.length < 2) { lista.style.display = "none"; return; }

    fetch(API_CLI_CITAS)
        .then(res => res.json())
        .then(response => {
            const clientes = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(clientes) ? clientes : [];
            const filtrados = datos.filter(c => {
                const nombre = `${c.cli_nombre || ''} ${c.cli_apaterno || ''}`.toLowerCase();
                return nombre.includes(v.toLowerCase());
            });
            lista.innerHTML = filtrados.map(c => {
                const nombre = `${c.cli_nombre || ''} ${c.cli_apaterno || ''}`.trim();
                return `<button type="button" class="list-group-item list-group-item-action" 
                    onclick="window.seleccionarClienteCita(${c.id_cliente}, '${nombre.replace(/'/g, "\\'")}')">
                    ${nombre || 'Sin nombre'}</button>`;
            }).join('');
            lista.style.display = filtrados.length > 0 ? "block" : "none";
        });
}

function seleccionarClienteCita(id, nombre) {
    clienteIdCita = id;
    document.getElementById("busCliCita").value = nombre;
    document.getElementById("resCliCita").style.display = "none";
}

// ========== MODAL ==========
function abrirModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "flex";
        cargarSelectEmpleados();
        editandoCitaId = null;
        clienteIdCita = null;
        empleadoIdCita = null;
        const errorDiv = document.getElementById("errorHorarioCita");
        if (errorDiv) errorDiv.textContent = "";
    }
}

function abrirModalCitaConFecha(fecha) {
    abrirModalCita();
    const inputFecha = document.getElementById("cita_fecha");
    if (inputFecha) {
        inputFecha.value = fecha;
        validarHorarioCita();
    }
}

function cerrarModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) modal.style.display = "none";
    const form = document.getElementById("formCita");
    if (form) form.reset();
    editandoCitaId = null;
    clienteIdCita = null;
    empleadoIdCita = null;
}

// ========== GUARDAR CITA ==========
async function guardarCita(e) {
    if (e) e.preventDefault();
    
    const selEmp = document.getElementById("id_empleado_select");
    if (selEmp && selEmp.value) {
        empleadoIdCita = parseInt(selEmp.value);
    }
    
    if (!clienteIdCita || !empleadoIdCita) {
        return Swal.fire("Aviso", "Selecciona cliente y empleado", "warning");
    }
    
    const fechaSeleccionada = document.getElementById("cita_fecha").value;
    const esValido = await validarHorarioCita();
    
    if (!esValido) {
        return Swal.fire("Horario no válido", "Revisa el horario seleccionado", "warning");
    }
    
    const data = {
        id_cliente: parseInt(clienteIdCita),
        id_empleado: parseInt(empleadoIdCita),
        cita_fecha_programada: fechaSeleccionada,
        cita_estado: document.getElementById("cita_estado").value || 'Pendiente',
        cita_tipo: document.getElementById("cita_tipo")?.value || 'Servicio',
        cita_motivo: document.getElementById("cita_motivo").value
    };
    
    const url = editandoCitaId ? `${API_CITA_CITAS}/${editandoCitaId}` : API_CITA_CITAS;
    const metodo = editandoCitaId ? "PUT" : "POST";
    
    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.success || result.message || res.ok) {
            Swal.fire({ icon: 'success', title: editandoCitaId ? 'Cita actualizada' : 'Cita registrada', timer: 1500, showConfirmButton: false });
            cerrarModalCita();
            listarCitas();
            inicializarCalendario();
        } else {
            throw new Error(result.message || 'Error al guardar');
        }
    } catch (err) {
        Swal.fire("Error", err.message || "No se pudo guardar la cita", "error");
    }
}

// ========== EDITAR CITA ==========
function editarCita(id) {
    fetch(`${API_CITA_CITAS}/${id}`)
        .then(res => res.json())
        .then(response => {
            const c = response.success ? response.data : response;
            if (!c) return Swal.fire("Error", "No se encontró la cita", "error");
            
            editandoCitaId = id;
            clienteIdCita = c.id_cliente;
            empleadoIdCita = c.id_empleado;
            
            const nombreCliente = c.cliente ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() : '';
            document.getElementById("busCliCita").value = nombreCliente;
            
            if (c.cita_fecha_programada) {
                document.getElementById("cita_fecha").value = c.cita_fecha_programada.replace(" ", "T").substring(0, 16);
            }
            document.getElementById("cita_estado").value = c.cita_estado || 'Pendiente';
            document.getElementById("cita_tipo").value = c.cita_tipo || 'Servicio';
            document.getElementById("cita_motivo").value = c.cita_motivo || '';
            
            abrirModalCita();
            
            setTimeout(() => {
                const selEmp = document.getElementById("id_empleado_select");
                if (selEmp && c.id_empleado) selEmp.value = c.id_empleado;
            }, 300);
        })
        .catch(err => Swal.fire("Error", "No se pudieron cargar los datos", "error"));
}

// ========== ELIMINAR CITA ==========
function eliminarCita(id) {
    Swal.fire({
        title: '¿Eliminar cita?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${API_CITA_CITAS}/${id}`, { method: 'DELETE' })
                .then(() => {
                    Swal.fire('Eliminada', 'La cita ha sido eliminada', 'success');
                    listarCitas();
                    inicializarCalendario();
                })
                .catch(() => Swal.fire("Error", "No se pudo eliminar la cita", "error"));
        }
    });
}

// ========== EXPONER ==========
window.listarCitas = listarCitas;
window.abrirModalCita = abrirModalCita;
window.cerrarModalCita = cerrarModalCita;
window.buscarClienteCita = buscarClienteCita;
window.seleccionarClienteCita = seleccionarClienteCita;
window.guardarCita = guardarCita;
window.editarCita = editarCita;
window.eliminarCita = eliminarCita;
window.prepararServicio = prepararServicio;
window.inicializarCalendario = inicializarCalendario;