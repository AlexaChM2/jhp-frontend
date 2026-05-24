var API_CITA_CITAS = "https://jhpapi-production.up.railway.app/api/citas";
var API_CLI_CITAS = "https://jhpapi-production.up.railway.app/api/clientes";
var API_EMP_CITAS = "https://jhpapi-production.up.railway.app/api/empleados";

let clienteIdCita = null;
let empleadoIdCita = null;
let editandoCitaId = null;
let citasExistentes = [];
let calendarVisual = null;
let calendarSelector = null;
let fechaSeleccionadaGlobal = null;

const CONFIG = {
    HORARIO: {
        INICIO: 9,
        FIN: 18,
        DIAS_LABORALES: [1, 2, 3, 4, 5],
        DURACION_MINIMA_HORAS: 3
    },
    COLORES: {
        DISPONIBLE: '#28a745',
        NO_DISPONIBLE: '#dc3545',
        PARCIAL: '#ffc107'
    }
};

// ========== INICIALIZAR CALENDARIO VISUAL (CITAS REGISTRADAS) ==========
async function inicializarCalendarioVisual() {
    const calendarEl = document.getElementById('calendarioVisual');
    if (!calendarEl) return;
    
    if (calendarVisual) {
        calendarVisual.destroy();
    }
    
    await cargarCitasExistentes();
    
    const eventos = citasExistentes.map(cita => {
        const cliente = cita.cliente ? `${cita.cliente.cli_nombre} ${cita.cliente.cli_apaterno || ''}`.trim() : 'Cliente';
        let color = '#17a2b8';
        if (cita.cita_estado === 'Realizada') color = '#28a745';
        if (cita.cita_estado === 'Cancelada') color = '#dc3545';
        
        return {
            id: cita.id_cita,
            title: `${cliente} - ${cita.cita_motivo || 'Cita'}`,
            start: cita.cita_fecha_programada,
            backgroundColor: color,
            borderColor: color,
            textColor: 'white',
            extendedProps: {
                estado: cita.cita_estado,
                empleado: cita.empleado?.emp_nombre || 'Sin asignar'
            }
        };
    });
    
    calendarVisual = new FullCalendar.Calendar(calendarEl, {
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
            Swal.fire({
                title: `Cita #${info.event.id}`,
                html: `
                    <strong>Cliente:</strong> ${info.event.title.split(' - ')[0]}<br>
                    <strong>Fecha:</strong> ${info.event.start.toLocaleString('es-MX')}<br>
                    <strong>Estado:</strong> ${info.event.extendedProps.estado || 'Pendiente'}<br>
                    <strong>Empleado:</strong> ${info.event.extendedProps.empleado}
                `,
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
        }
    });
    
    calendarVisual.render();
}

// ========== INICIALIZAR CALENDARIO SELECCIONABLE (EN MODAL) ==========
async function inicializarCalendarioSelector() {
    const calendarEl = document.getElementById('calendarioSelector');
    if (!calendarEl) return;
    
    if (calendarSelector) {
        calendarSelector.destroy();
    }
    
    await cargarCitasExistentes();
    
    calendarSelector = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: ''
        },
        height: 'auto',
        dateClick: function(info) {
            seleccionarFecha(info.date);
        },
        dayCellDidMount: function(info) {
            aplicarColorDiaSelector(info);
        }
    });
    
    calendarSelector.render();
}

function aplicarColorDiaSelector(info) {
    const fecha = info.date;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fecha < hoy) {
        info.el.style.backgroundColor = '#e9ecef';
        info.el.style.pointerEvents = 'none';
        info.el.style.opacity = '0.5';
        return;
    }
    
    const disponibilidad = obtenerDisponibilidadDia(fecha);
    
    if (disponibilidad === 'completa') {
        info.el.style.backgroundColor = CONFIG.COLORES.DISPONIBLE;
        info.el.style.color = 'white';
        info.el.style.borderRadius = '8px';
        info.el.style.cursor = 'pointer';
    } else if (disponibilidad === 'parcial') {
        info.el.style.backgroundColor = CONFIG.COLORES.PARCIAL;
        info.el.style.color = 'black';
        info.el.style.borderRadius = '8px';
        info.el.style.cursor = 'pointer';
    } else {
        info.el.style.backgroundColor = CONFIG.COLORES.NO_DISPONIBLE;
        info.el.style.color = 'white';
        info.el.style.borderRadius = '8px';
        info.el.style.opacity = '0.7';
        info.el.style.cursor = 'not-allowed';
    }
}

function obtenerDisponibilidadDia(fecha) {
    const diaSemana = fecha.getDay();
    let diaJS = diaSemana === 0 ? 7 : diaSemana;
    
    if (!CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS)) {
        return 'no_disponible';
    }
    
    const horariosDisponibles = obtenerHorariosDisponiblesSync(fecha);
    
    if (horariosDisponibles.length === 0) {
        return 'no_disponible';
    } else if (horariosDisponibles.length < 5) {
        return 'parcial';
    } else {
        return 'completa';
    }
}

function obtenerHorariosDisponiblesSync(fecha) {
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
    
    return horariosDisponibles;
}

async function seleccionarFecha(fecha) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fecha < hoy) {
        Swal.fire("Aviso", "No se pueden seleccionar fechas pasadas", "warning");
        return;
    }
    
    fechaSeleccionadaGlobal = fecha;
    const horariosDisponibles = obtenerHorariosDisponiblesSync(fecha);
    
    if (horariosDisponibles.length === 0) {
        Swal.fire("Sin disponibilidad", "No hay horarios disponibles para esta fecha", "warning");
        return;
    }
    
    mostrarHorariosDisponiblesModal(horariosDisponibles, fecha);
}

function mostrarHorariosDisponiblesModal(horarios, fecha) {
    const container = document.getElementById('listaHorariosDisponibles');
    const horariosContainer = document.getElementById('horariosContainer');
    
    if (!container) return;
    
    container.innerHTML = horarios.map(horario => `
        <button type="button" class="btn btn-outline-success seleccionar-horario-btn" 
                data-inicio="${horario.inicio}"
                style="border-radius: 8px; padding: 10px 20px;">
            <i class="fas fa-clock me-1"></i> ${horario.texto}
        </button>
    `).join('');
    
    horariosContainer.style.display = 'block';
    
    document.querySelectorAll('.seleccionar-horario-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const horaInicio = parseInt(this.dataset.inicio);
            const fechaHora = new Date(fecha);
            fechaHora.setHours(horaInicio, 0, 0, 0);
            
            const año = fechaHora.getFullYear();
            const mes = String(fechaHora.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaHora.getDate()).padStart(2, '0');
            const hora = String(horaInicio).padStart(2, '0');
            
            const fechaFormateada = `${año}-${mes}-${dia}T${hora}:00`;
            document.getElementById("cita_fecha").value = fechaFormateada;
            
            document.querySelectorAll('.seleccionar-horario-btn').forEach(b => {
                b.classList.remove('btn-success');
                b.classList.add('btn-outline-success');
            });
            this.classList.remove('btn-outline-success');
            this.classList.add('btn-success');
            
            Swal.fire({
                icon: 'success',
                title: 'Horario seleccionado',
                text: `Cita programada para ${fechaHora.toLocaleString('es-MX')}`,
                timer: 1500,
                showConfirmButton: false
            });
        });
    });
}

// ========== CARGAR CITAS EXISTENTES ==========
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

// ========== LISTAR CITAS EN TABLA ==========
function listarCitas() {
    const tbody = document.getElementById("tablaCitas");
    if (!tbody) return;
    
    const filtro = document.getElementById("inputBuscarCitaLocal")?.value.toLowerCase() || '';

    fetch(API_CITA_CITAS)
        .then(res => res.json())
        .then(response => {
            const data = response.success ? (response.data?.data || response.data) : response;
            let citas = Array.isArray(data) ? data : [];
            
            if (filtro) {
                citas = citas.filter(c => {
                    const folio = `#${c.id_cita}`;
                    const cliente = c.cliente ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.toLowerCase() : '';
                    return folio.includes(filtro) || cliente.includes(filtro);
                });
            }

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
                            <button class="btn btn-success" onclick="window.prepararServicio(${c.id_cita})" title="Iniciar Servicio">
                                <i class="fas fa-tools"></i>
                            </button>
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

function seleccionarEmpleadoCita(id, nombre) {
    empleadoIdCita = parseInt(id);
}

// ========== PREPARAR SERVICIO ==========
function prepararServicio(idCita) {
    localStorage.setItem('id_cita_seleccionada', idCita);
    if (typeof window.cargarVista === 'function') window.cargarVista('views/servicios.html');
}

// ========== ABRIR MODAL ==========
async function abrirModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "flex";
        await cargarSelectEmpleados();
        await cargarCitasExistentes();
        await inicializarCalendarioSelector();
        editandoCitaId = null;
        clienteIdCita = null;
        empleadoIdCita = null;
        document.getElementById("busCliCita").value = "";
        document.getElementById("cita_motivo").value = "";
        document.getElementById("cita_estado").value = "Pendiente";
        document.getElementById("cita_tipo").value = "Servicio";
        document.getElementById("horariosContainer").style.display = "none";
        document.getElementById("cita_fecha").value = "";
    }
}

function cerrarModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) modal.style.display = "none";
    if (calendarSelector) {
        calendarSelector.destroy();
        calendarSelector = null;
    }
    editandoCitaId = null;
    clienteIdCita = null;
    empleadoIdCita = null;
    fechaSeleccionadaGlobal = null;
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
    
    if (!fechaSeleccionada) {
        return Swal.fire("Aviso", "Selecciona una fecha y horario para la cita", "warning");
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
            inicializarCalendarioVisual();
        } else {
            throw new Error(result.message || 'Error al guardar');
        }
    } catch (err) {
        Swal.fire("Error", err.message || "No se pudo guardar la cita", "error");
    }
}

// ========== EDITAR CITA ==========
async function editarCita(id) {
    try {
        const res = await fetch(`${API_CITA_CITAS}/${id}`);
        const response = await res.json();
        const c = response.success ? response.data : response;
        
        if (!c) return Swal.fire("Error", "No se encontró la cita", "error");
        
        editandoCitaId = id;
        clienteIdCita = c.id_cliente;
        empleadoIdCita = c.id_empleado;
        
        await abrirModalCita();
        
        const nombreCliente = c.cliente ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() : '';
        document.getElementById("busCliCita").value = nombreCliente;
        document.getElementById("cita_estado").value = c.cita_estado || 'Pendiente';
        document.getElementById("cita_tipo").value = c.cita_tipo || 'Servicio';
        document.getElementById("cita_motivo").value = c.cita_motivo || '';
        
        if (c.cita_fecha_programada) {
            const fecha = new Date(c.cita_fecha_programada);
            await seleccionarFecha(fecha);
            document.getElementById("cita_fecha").value = c.cita_fecha_programada.replace(" ", "T").substring(0, 16);
        }
        
        setTimeout(() => {
            const selEmp = document.getElementById("id_empleado_select");
            if (selEmp && c.id_empleado) selEmp.value = c.id_empleado;
        }, 500);
        
    } catch (err) {
        Swal.fire("Error", "No se pudieron cargar los datos", "error");
    }
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
                    inicializarCalendarioVisual();
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
window.seleccionarEmpleadoCita = seleccionarEmpleadoCita;
window.guardarCita = guardarCita;
window.editarCita = editarCita;
window.eliminarCita = eliminarCita;
window.prepararServicio = prepararServicio;

// ========== INICIALIZACIÓN PRINCIPAL ==========
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        listarCitas();
        cargarSelectEmpleados();
        inicializarCalendarioVisual();
        cargarCitasExistentes();
    }, 300);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        listarCitas();
        cargarSelectEmpleados();
        inicializarCalendarioVisual();
        cargarCitasExistentes();
    });
}