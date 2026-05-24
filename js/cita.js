var API_CITA_CITAS = "https://jhpapi-production.up.railway.app/api/citas";
var API_CLI_CITAS = "https://jhpapi-production.up.railway.app/api/clientes";
var API_EMP_CITAS = "https://jhpapi-production.up.railway.app/api/empleados";

let clienteIdCita = null;
let empleadoIdCita = null;
let editandoCitaId = null;
let citasIniciadas = false;

// ========== CONFIGURACIÓN DE HORARIO LABORAL ==========
const HORARIO_LABORAL = {
    dias: [1, 2, 3, 4, 5], // Lunes(1) a Viernes(5)
    horaInicio: 9,  // 9:00 AM
    horaFin: 18,    // 6:00 PM
    minutosInicio: 0,
    minutosFin: 0,
    duracionMinimaHoras: 3, // 3 horas por cita
    duracionMinimaMinutos: 180 // 3 horas en minutos
};

// ========== FUNCIONES DE VALIDACIÓN ==========

// Verificar si una fecha/hora está dentro del horario laboral
function esHorarioLaboral(fechaHora) {
    const fecha = new Date(fechaHora);
    const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    
    // Verificar día de la semana
    if (!HORARIO_LABORAL.dias.includes(diaSemana)) {
        return { valido: false, motivo: `Los ${getNombreDia(diaSemana)} no hay servicio. Horario: Lunes a Viernes de 9AM a 6PM` };
    }
    
    // Verificar hora
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    const horaMinutos = hora + minutos / 60;
    
    const inicio = HORARIO_LABORAL.horaInicio + HORARIO_LABORAL.minutosInicio / 60;
    const fin = HORARIO_LABORAL.horaFin + HORARIO_LABORAL.minutosFin / 60;
    
    if (horaMinutos < inicio) {
        return { valido: false, motivo: `La hora es antes de las ${HORARIO_LABORAL.horaInicio}:00 AM. Horario: ${HORARIO_LABORAL.horaInicio}:00 a ${HORARIO_LABORAL.horaFin}:00` };
    }
    
    if (horaMinutos + (HORARIO_LABORAL.duracionMinimaHoras) > fin) {
        return { valido: false, motivo: `La cita terminaría después de las ${HORARIO_LABORAL.horaFin}:00. La última hora permitida es a las ${HORARIO_LABORAL.horaFin - HORARIO_LABORAL.duracionMinimaHoras}:00` };
    }
    
    return { valido: true, motivo: null };
}

function getNombreDia(dia) {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dia];
}

// Verificar si hay conflicto de horario con otras citas
async function verificarConflictoHorario(fechaHora, idCitaEditando = null) {
    const fechaInicio = new Date(fechaHora);
    const fechaFin = new Date(fechaInicio.getTime() + HORARIO_LABORAL.duracionMinimaMinutos * 60000);
    
    const res = await fetch(API_CITA_CITAS);
    const response = await res.json();
    const citas = response.success ? (response.data?.data || response.data) : response;
    const listaCitas = Array.isArray(citas) ? citas : [];
    
    for (let cita of listaCitas) {
        // Saltar la cita que se está editando
        if (idCitaEditando && cita.id_cita === parseInt(idCitaEditando)) continue;
        
        if (!cita.cita_fecha_programada) continue;
        
        const citaInicio = new Date(cita.cita_fecha_programada);
        const citaFin = new Date(citaInicio.getTime() + HORARIO_LABORAL.duracionMinimaMinutos * 60000);
        
        // Verificar si hay superposición
        if (fechaInicio < citaFin && fechaFin > citaInicio) {
            return {
                conflicto: true,
                mensaje: `Conflicto de horario con cita #${cita.id_cita} de las ${formatHora(citaInicio)} a las ${formatHora(citaFin)}`
            };
        }
    }
    
    return { conflicto: false, mensaje: null };
}

// Formatear hora para mostrar
function formatHora(fecha) {
    return `${fecha.getHours().toString().padStart(2,'0')}:${fecha.getMinutes().toString().padStart(2,'0')}`;
}

// Generar horas disponibles para un día específico
async function generarHorasDisponibles(fechaSeleccionada) {
    if (!fechaSeleccionada) return [];
    
    const fecha = new Date(fechaSeleccionada);
    const diaSemana = fecha.getDay();
    
    // Verificar si es día laboral
    if (!HORARIO_LABORAL.dias.includes(diaSemana)) {
        return [];
    }
    
    const horasDisponibles = [];
    const inicio = HORARIO_LABORAL.horaInicio;
    const fin = HORARIO_LABORAL.horaFin - HORARIO_LABORAL.duracionMinimaHoras;
    
    // Obtener todas las citas existentes para este día
    const res = await fetch(API_CITA_CITAS);
    const response = await res.json();
    const citas = response.success ? (response.data?.data || response.data) : response;
    const listaCitas = Array.isArray(citas) ? citas : [];
    
    const citasDelDia = listaCitas.filter(cita => {
        if (!cita.cita_fecha_programada) return false;
        const fechaCita = new Date(cita.cita_fecha_programada);
        return fechaCita.toDateString() === fecha.toDateString();
    });
    
    // Generar horas cada 30 minutos
    for (let hora = inicio; hora <= fin; hora++) {
        for (let minuto of [0, 30]) {
            if (hora === fin && minuto > 0) continue;
            
            const horaInicioCita = new Date(fecha);
            horaInicioCita.setHours(hora, minuto, 0, 0);
            
            // Verificar que la cita no pase del horario laboral
            const horaFinCita = new Date(horaInicioCita.getTime() + HORARIO_LABORAL.duracionMinimaMinutos * 60000);
            if (horaFinCita.getHours() > HORARIO_LABORAL.horaFin || 
                (horaFinCita.getHours() === HORARIO_LABORAL.horaFin && horaFinCita.getMinutes() > 0)) {
                continue;
            }
            
            // Verificar si hay conflicto con citas existentes
            let tieneConflicto = false;
            for (let cita of citasDelDia) {
                const citaInicio = new Date(cita.cita_fecha_programada);
                const citaFin = new Date(citaInicio.getTime() + HORARIO_LABORAL.duracionMinimaMinutos * 60000);
                
                if (horaInicioCita < citaFin && horaFinCita > citaInicio) {
                    tieneConflicto = true;
                    break;
                }
            }
            
            if (!tieneConflicto) {
                horasDisponibles.push(horaInicioCita);
            }
        }
    }
    
    return horasDisponibles;
}

// Actualizar el selector de horas disponibles
async function actualizarHorasDisponibles() {
    const fechaInput = document.getElementById("cita_fecha");
    const horasSelect = document.getElementById("horas_disponibles");
    
    if (!fechaInput || !horasSelect || !fechaInput.value) {
        if (horasSelect) horasSelect.innerHTML = '<option value="">Seleccione fecha primero</option>';
        return;
    }
    
    const horas = await generarHorasDisponibles(fechaInput.value);
    
    if (horas.length === 0) {
        const fecha = new Date(fechaInput.value);
        if (!HORARIO_LABORAL.dias.includes(fecha.getDay())) {
            horasSelect.innerHTML = '<option value="">No hay servicio este día (Lun-Vie 9AM-6PM)</option>';
        } else {
            horasSelect.innerHTML = '<option value="">No hay horas disponibles para este día</option>';
        }
        return;
    }
    
    horasSelect.innerHTML = '<option value="">Seleccione una hora...</option>' + 
        horas.map(h => `<option value="${h.toISOString()}">${formatHora(h)} hs (3 horas de servicio)</option>`).join('');
}

// ========== AUTO-INICIALIZACIÓN ==========
(function() {
    document.addEventListener('vista-cargada', function(e) {
        if (e.detail && e.detail.vista && 
            (e.detail.vista.includes('cita') || e.detail.vista.includes('Cita'))) {
            citasIniciadas = false;
            setTimeout(listarCitas, 500);
        }
    });
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const tabla = document.getElementById('tablaCitas');
        if (tabla) setTimeout(listarCitas, 300);
    }
})();

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
                citasIniciadas = true;
                return;
            }

            tbody.innerHTML = citas.map(c => {
                const cliente = c.cliente 
                    ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() 
                    : 'Sin cliente';
                const empleado = c.empleado ? c.empleado.emp_nombre : 'Sin asignar';
                const estadoClass = c.cita_estado === 'Realizada' ? 'success' : 
                                   (c.cita_estado === 'Cancelada' ? 'danger' : 'warning');
                const estadoText = c.cita_estado || 'Pendiente';
                
                let fechaFormateada = '-';
                let horaFormateada = '-';
                if (c.cita_fecha_programada) {
                    const fecha = new Date(c.cita_fecha_programada);
                    fechaFormateada = fecha.toLocaleDateString('es-MX');
                    horaFormateada = formatHora(fecha);
                }

                return `
                <tr>
                    <td><strong>#${c.id_cita}</strong></td>
                    <td>${fechaFormateada}<br><small class="text-muted">${horaFormateada} hs (3hs)</small></td>
                    <td>${cliente}</td>
                    <td>${empleado}</td>
                    <td>${c.cita_motivo || 'N/A'}</td>
                    <td><span class="badge bg-${estadoClass}">${estadoText}</span></td>
                    <td class="text-center">
                        <div class="d-flex gap-1 justify-content-center">
                            ${c.cita_estado !== 'Realizada' ? `
                            <button class="btn btn-sm btn-success" onclick="window.prepararServicio(${c.id_cita})" title="Iniciar Servicio">
                                <i class="fas fa-tools"></i>
                            </button>` : ''}
                            <button class="btn btn-sm btn-warning" onclick="window.editarCita(${c.id_cita})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="window.eliminarCita(${c.id_cita})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
            
            citasIniciadas = true;
        })
        .catch(err => console.error("Error al listar citas:", err));
}

// ========== PREPARAR SERVICIO DESDE CITA ==========
function prepararServicio(idCita) {
    fetch(`${API_CITA_CITAS}/${idCita}`)
        .then(res => res.json())
        .then(response => {
            const cita = response.success ? response.data : response;
            const tipo = cita.cita_tipo || 'Servicio';
            localStorage.setItem('id_cita_seleccionada', idCita);
            if (tipo === 'Venta') {
                if (typeof window.cargarVista === 'function') window.cargarVista('views/ventas.html');
            } else {
                if (typeof window.cargarVista === 'function') window.cargarVista('views/servicios.html');
            }
        })
        .catch(() => {
            localStorage.setItem('id_cita_seleccionada', idCita);
            if (typeof window.cargarVista === 'function') window.cargarVista('views/servicios.html');
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

// ========== SELECCIONAR EMPLEADO (SELECT) ==========
function seleccionarEmpleadoCita(id, nombre) {
    empleadoIdCita = parseInt(id);
}

// ========== MODAL ==========
function abrirModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "flex";
        cargarSelectEmpleados();
        
        // Configurar evento para cuando cambie la fecha
        const fechaInput = document.getElementById("cita_fecha");
        if (fechaInput) {
            fechaInput.removeEventListener('change', actualizarHorasDisponibles);
            fechaInput.addEventListener('change', actualizarHorasDisponibles);
        }
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

// ========== GUARDAR CITA CON VALIDACIONES ==========
async function guardarCita(e) {
    if (e) e.preventDefault();
    
    // Obtener empleado del select
    const selEmp = document.getElementById("id_empleado_select");
    if (selEmp && selEmp.value) {
        empleadoIdCita = parseInt(selEmp.value);
    }
    
    if (!clienteIdCita) {
        return Swal.fire("Aviso", "Selecciona un cliente", "warning");
    }
    
    if (!empleadoIdCita) {
        return Swal.fire("Aviso", "Selecciona un empleado", "warning");
    }
    
    // Obtener fecha y hora seleccionada
    const fechaInput = document.getElementById("cita_fecha").value;
    const horasSelect = document.getElementById("horas_disponibles");
    const horaSeleccionada = horasSelect?.value;
    
    if (!fechaInput) {
        return Swal.fire("Aviso", "Selecciona una fecha", "warning");
    }
    
    if (!horaSeleccionada || horaSeleccionada === "") {
        return Swal.fire("Aviso", "Selecciona una hora disponible", "warning");
    }
    
    // Combinar fecha y hora
    const fechaHora = new Date(horaSeleccionada);
    
    // Validar horario laboral
    const horarioValido = esHorarioLaboral(fechaHora);
    if (!horarioValido.valido) {
        return Swal.fire("Horario no disponible", horarioValido.motivo, "warning");
    }
    
    // Validar conflicto con otras citas
    const conflicto = await verificarConflictoHorario(fechaHora, editandoCitaId);
    if (conflicto.conflicto) {
        return Swal.fire("Conflicto de horario", conflicto.mensaje, "warning");
    }
    
    const data = {
        id_cliente: parseInt(clienteIdCita),
        id_empleado: parseInt(empleadoIdCita),
        cita_fecha_programada: fechaHora.toISOString(),
        cita_estado: document.getElementById("cita_estado").value || 'Pendiente',
        cita_tipo: document.getElementById("cita_tipo")?.value || 'Servicio',
        cita_motivo: document.getElementById("cita_motivo").value
    };
    
    const url = editandoCitaId ? `${API_CITA_CITAS}/${editandoCitaId}` : API_CITA_CITAS;
    const metodo = editandoCitaId ? "PUT" : "POST";
    
    Swal.fire({
        title: editandoCitaId ? 'Actualizando cita...' : 'Guardando cita...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        Swal.fire({ icon: 'success', title: editandoCitaId ? 'Cita actualizada' : 'Cita registrada', timer: 1500, showConfirmButton: false });
        cerrarModalCita();
        listarCitas();
    })
    .catch(err => Swal.fire("Error", "No se pudo guardar la cita: " + err.message, "error"));
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
            
            // Mostrar fecha en el input de fecha (solo la fecha, no la hora)
            if (c.cita_fecha_programada) {
                const fecha = new Date(c.cita_fecha_programada);
                const fechaStr = fecha.toISOString().split('T')[0];
                document.getElementById("cita_fecha").value = fechaStr;
                
                // Actualizar horas disponibles y preseleccionar la hora
                setTimeout(async () => {
                    await actualizarHorasDisponibles();
                    const horasSelect = document.getElementById("horas_disponibles");
                    if (horasSelect) {
                        const horaStr = fecha.toISOString();
                        for (let i = 0; i < horasSelect.options.length; i++) {
                            if (horasSelect.options[i].value === horaStr) {
                                horasSelect.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }, 300);
            }
            
            document.getElementById("cita_estado").value = c.cita_estado || 'Pendiente';
            document.getElementById("cita_tipo").value = c.cita_tipo || 'Servicio';
            document.getElementById("cita_motivo").value = c.cita_motivo || '';
            
            abrirModalCita();
            
            // Cargar empleado en el select
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