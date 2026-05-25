var API_CITA_CITAS = "https://jhpapi-production.up.railway.app/api/citas";
var API_CLI_CITAS = "https://jhpapi-production.up.railway.app/api/clientes";
var API_EMP_CITAS = "https://jhpapi-production.up.railway.app/api/empleados";

let clienteIdCita = null;
let empleadoIdCita = null;
let editandoCitaId = null;
let citasExistentes = [];
let calendarVisual = null;
let calendarSelector = null;
let inicializadoCitas = false;

const CONFIG = {
    HORARIO: {
        INICIO: 9,
        FIN: 18,
        DIAS_LABORALES: [1, 2, 3, 4, 5],
        DURACION_MINIMA_HORAS: 3
    },
    COLORES: {
        DISPONIBLE: '#28a745',
        NO_DISPONIBLE: '#880f1b',
        PARCIAL: '#ffc107'
    }
};

function guardarEnCache(datos) {
    localStorage.setItem('citas_cache', JSON.stringify({
        data: datos,
        timestamp: Date.now()
    }));
}

function obtenerDeCache() {
    const cache = localStorage.getItem('citas_cache');
    if (cache) {
        const parsed = JSON.parse(cache);
        if (Date.now() - parsed.timestamp < 300000) {
            return parsed.data;
        }
    }
    return null;
}

async function cargarCitasExistentes() {
    const cacheData = obtenerDeCache();
    if (cacheData && !inicializadoCitas) {
        console.log('Usando caché de citas');
        citasExistentes = cacheData;
        return citasExistentes;
    }
    
    try {
        const res = await fetch(API_CITA_CITAS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const response = await res.json();
        const data = response.success ? (response.data?.data || response.data) : response;
        citasExistentes = Array.isArray(data) ? data : [];
        guardarEnCache(citasExistentes);
        console.log('Citas cargadas:', citasExistentes.length);
        return citasExistentes;
    } catch (error) {
        console.error('Error cargando citas:', error);
        if (cacheData) {
            citasExistentes = cacheData;
            return citasExistentes;
        }
        citasExistentes = [];
        return [];
    }
}

async function inicializarCalendarioVisual() {
    const calendarEl = document.getElementById('calendarioVisual');
    if (!calendarEl) return;
    
    if (calendarVisual) calendarVisual.destroy();
    
    await cargarCitasExistentes();
    
    const eventos = citasExistentes.map(cita => {
        const cliente = cita.cliente ? `${cita.cliente.cli_nombre} ${cita.cliente.cli_apaterno || ''}`.trim() : 'Cliente';
        let color = '#17a2b8';
        if (cita.cita_estado === 'Realizada') color = '#28a745';
        if (cita.cita_estado === 'Cancelada') color = '#dc3545';
        if (cita.cita_estado === 'Confirmada') color = '#17a2b8';
        
        return {
            id: cita.id_cita,
            title: `${cliente} - ${cita.cita_motivo || 'Cita'}`,
            start: cita.cita_fecha_programada,
            backgroundColor: color,
            borderColor: color,
            textColor: 'white'
        };
    });
    
    calendarVisual = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        height: 'auto',
        events: eventos,
        eventClick: function(info) {
            Swal.fire({
                title: `Cita #${info.event.id}`,
                html: `<strong>${info.event.title}</strong><br>${info.event.start.toLocaleString('es-MX')}`,
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
        }
    });
    
    calendarVisual.render();
}

async function inicializarCalendarioSelector() {
    const calendarEl = document.getElementById('calendarioSelector');
    if (!calendarEl) return;
    
    if (calendarSelector) calendarSelector.destroy();
    
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
            const fecha = info.date;
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            if (fecha < hoy) {
                info.el.style.backgroundColor = '#e9ecef';
                info.el.style.pointerEvents = 'none';
                info.el.style.opacity = '0.5';
                return;
            }
            
            const diaSemana = fecha.getDay();
            let diaJS = diaSemana === 0 ? 7 : diaSemana;
            const esLaboral = CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS);
            
            if (!esLaboral) {
                info.el.style.backgroundColor = CONFIG.COLORES.NO_DISPONIBLE;
                info.el.style.color = 'white';
                info.el.style.borderRadius = '8px';
                info.el.style.pointerEvents = 'none';
                info.el.style.opacity = '0.7';
                return;
            }
            
            const horarios = obtenerHorariosDisponiblesSync(fecha);
            if (horarios.length === 0) {
                info.el.style.backgroundColor = CONFIG.COLORES.NO_DISPONIBLE;
                info.el.style.color = 'white';
                info.el.style.borderRadius = '8px';
                info.el.style.opacity = '0.7';
            } else if (horarios.length < 5) {
                info.el.style.backgroundColor = CONFIG.COLORES.PARCIAL;
                info.el.style.color = 'black';
                info.el.style.borderRadius = '8px';
                info.el.style.cursor = 'pointer';
            } else {
                info.el.style.backgroundColor = CONFIG.COLORES.DISPONIBLE;
                info.el.style.color = 'white';
                info.el.style.borderRadius = '8px';
                info.el.style.cursor = 'pointer';
            }
        }
    });
    
    calendarSelector.render();
}

function obtenerHorariosDisponiblesSync(fecha) {
    const fechaStr = fecha.toDateString();
    const citasDia = citasExistentes.filter(cita => {
        const fechaCita = new Date(cita.cita_fecha_programada);
        return fechaCita.toDateString() === fechaStr;
    });
    
    const horasOcupadas = [];
    citasDia.forEach(cita => {
        const inicio = new Date(cita.cita_fecha_programada).getHours();
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
    
    const horarios = obtenerHorariosDisponiblesSync(fecha);
    if (horarios.length === 0) {
        Swal.fire("Sin disponibilidad", "No hay horarios disponibles para esta fecha", "warning");
        return;
    }
    
    const horariosContainer = document.getElementById('horariosContainer');
    const listaHorarios = document.getElementById('listaHorariosDisponibles');
    
    if (listaHorarios) {
        listaHorarios.innerHTML = horarios.map(h => `
            <button type="button" class="btn btn-outline-success btn-horario" data-inicio="${h.inicio}">
                <i class="fas fa-clock me-1"></i> ${h.texto}
            </button>
        `).join('');
        
        document.querySelectorAll('.btn-horario').forEach(btn => {
            btn.addEventListener('click', function() {
                const horaInicio = parseInt(this.dataset.inicio);
                const fechaHora = new Date(fecha);
                fechaHora.setHours(horaInicio, 0, 0, 0);
                
                const año = fechaHora.getFullYear();
                const mes = String(fechaHora.getMonth() + 1).padStart(2, '0');
                const dia = String(fechaHora.getDate()).padStart(2, '0');
                const hora = String(horaInicio).padStart(2, '0');
                
                document.getElementById("cita_fecha").value = `${año}-${mes}-${dia}T${hora}:00`;
                
                document.querySelectorAll('.btn-horario').forEach(b => {
                    b.classList.remove('btn-success');
                    b.classList.add('btn-outline-success');
                });
                this.classList.remove('btn-outline-success');
                this.classList.add('btn-success');
                
                Swal.fire({
                    icon: 'success',
                    title: 'Horario seleccionado',
                    timer: 1500,
                    showConfirmButton: false
                });
            });
        });
    }
    
    if (horariosContainer) horariosContainer.style.display = 'block';
}

async function listarCitas() {
    const tbody = document.getElementById("tablaCitas");
    if (!tbody) return;
    
    const filtro = document.getElementById("inputBuscarCitaLocal")?.value.toLowerCase() || '';
    
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><div class="spinner-border spinner-border-sm"></div> Cargando...</td></tr>';
    
    await cargarCitasExistentes();
    
    let citas = [...citasExistentes];
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
        const cliente = c.cliente ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() : 'Sin cliente';
        const empleado = c.empleado ? c.empleado.emp_nombre : 'Sin asignar';
        const estadoClass = c.cita_estado === 'Realizada' ? 'success' : 
                   (c.cita_estado === 'Cancelada' ? 'danger' : 
                   (c.cita_estado === 'Confirmada' ? 'primary' : 'warning'));
        
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
}

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
                    ${nombre || 'Sin nombre'}
                </button>`;
            }).join('');
            lista.style.display = filtrados.length > 0 ? "block" : "none";
        });
}

function seleccionarClienteCita(id, nombre) {
    clienteIdCita = id;
    document.getElementById("busCliCita").value = nombre;
    document.getElementById("resCliCita").style.display = "none";
}

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

function seleccionarEmpleadoCita(id, nombre) {
    empleadoIdCita = parseInt(id);
}

function prepararServicio(idCita) {
    localStorage.setItem('id_cita_seleccionada', idCita);
    if (typeof window.cargarVista === 'function') {
        window.cargarVista('views/servicios.html');
    }
}

function abrirModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "flex";
        cargarSelectEmpleados();
        editandoCitaId = null;
        clienteIdCita = null;
        empleadoIdCita = null;
        document.getElementById("busCliCita").value = "";
        document.getElementById("cita_motivo").value = "";
        document.getElementById("cita_estado").value = "Pendiente";
        document.getElementById("cita_tipo").value = "Servicio";
        document.getElementById("cita_fecha").value = "";
        document.getElementById("horariosContainer").style.display = "none";
        setTimeout(() => inicializarCalendarioSelector(), 100);
    }
}

function cerrarModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) modal.style.display = "none";
    editandoCitaId = null;
    clienteIdCita = null;
    empleadoIdCita = null;
}

async function guardarCita(e) {
    if (e) e.preventDefault();
    
    const selEmp = document.getElementById("id_empleado_select");
    if (selEmp && selEmp.value) empleadoIdCita = parseInt(selEmp.value);
    
    if (!clienteIdCita || !empleadoIdCita) {
        return Swal.fire("Aviso", "Selecciona cliente y empleado", "warning");
    }
    
    const fechaSeleccionada = document.getElementById("cita_fecha").value;
    if (!fechaSeleccionada) {
        return Swal.fire("Aviso", "Selecciona una fecha y horario", "warning");
    }
    
    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const data = {
        id_cliente: parseInt(clienteIdCita),
        id_empleado: parseInt(empleadoIdCita),
        cita_fecha_programada: fechaSeleccionada.replace('T', ' ') + ':00',
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
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const result = await res.json();
        
        if (result.success || result.message || res.ok) {
            localStorage.removeItem('citas_cache');
            await cargarCitasExistentes();
            
            Swal.fire({ icon: 'success', title: editandoCitaId ? 'Cita actualizada' : 'Cita registrada', timer: 1500, showConfirmButton: false });
            cerrarModalCita();
            listarCitas();
            inicializarCalendarioVisual();
        } else {
            throw new Error(result.message || 'Error al guardar');
        }
    } catch (err) {
        Swal.fire("Error", err.message || "No se pudo guardar", "error");
    }
}

async function editarCita(id) {
    await cargarCitasExistentes();
    const c = citasExistentes.find(cita => cita.id_cita === id);
    if (!c) return Swal.fire("Error", "No se encontró la cita", "error");
    
    editandoCitaId = id;
    clienteIdCita = c.id_cliente;
    empleadoIdCita = c.id_empleado;
    
    abrirModalCita();
    
    const nombreCliente = c.cliente ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() : '';
    document.getElementById("busCliCita").value = nombreCliente;
    document.getElementById("cita_estado").value = c.cita_estado || 'Pendiente';
    document.getElementById("cita_tipo").value = c.cita_tipo || 'Servicio';
    document.getElementById("cita_motivo").value = c.cita_motivo || '';
    
    if (c.cita_fecha_programada) {
        document.getElementById("cita_fecha").value = c.cita_fecha_programada.replace(" ", "T").substring(0, 16);
    }
    
    setTimeout(() => {
        const selEmp = document.getElementById("id_empleado_select");
        if (selEmp && c.id_empleado) selEmp.value = c.id_empleado;
        inicializarCalendarioSelector();
    }, 300);
}

function eliminarCita(id) {
    Swal.fire({
        title: '¿Eliminar cita?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            try {
                const res = await fetch(`${API_CITA_CITAS}/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    localStorage.removeItem('citas_cache');
                    await cargarCitasExistentes();
                    Swal.fire('Eliminada', 'La cita ha sido eliminada', 'success');
                    listarCitas();
                    inicializarCalendarioVisual();
                } else {
                    throw new Error('Error al eliminar');
                }
            } catch (err) {
                Swal.fire("Error", "No se pudo eliminar", "error");
            }
        }
    });
}

async function inicializarModuloCitas() {
    console.log('Inicializando módulo de citas...');
    inicializadoCitas = true;
    await cargarCitasExistentes();
    await listarCitas();
    cargarSelectEmpleados();
    await inicializarCalendarioVisual();
    console.log('Módulo de citas listo');
}

document.addEventListener('vista-cargada', function(e) {
    const vista = e.detail?.vista || '';
    if (vista.includes('cita') || vista.includes('Cita')) {
        console.log('Vista de citas detectada, iniciando...');
        setTimeout(inicializarModuloCitas, 300);
    }
});

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
window.inicializarModuloCitas = inicializarModuloCitas;

if (document.getElementById('tablaCitas')) {
    setTimeout(inicializarModuloCitas, 300);
}