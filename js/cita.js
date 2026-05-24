var API_CITA_CITAS = "https://jhpapi-production.up.railway.app/api/citas";
var API_CLI_CITAS = "https://jhpapi-production.up.railway.app/api/clientes";
var API_EMP_CITAS = "https://jhpapi-production.up.railway.app/api/empleados";
var API_SERVICIOS = "https://jhpapi-production.up.railway.app/api/servicios";

let clienteIdCita = null;
let empleadoIdCita = null;
let editandoCitaId = null;
let citasIniciadas = false;
let citasExistentes = []; // Para almacenar citas y validar horarios

// ========== CONFIGURACIÓN ==========
const CONFIG = {
    HORARIO: {
        INICIO: 9,      // 9 AM
        FIN: 18,        // 6 PM
        DIAS_LABORALES: [1, 2, 3, 4, 5], // Lunes a Viernes (1=Lunes, 5=Viernes)
        DURACION_MINIMA_HORAS: 3  // Mínimo 3 horas por cita
    },
    COLORES: {
        DISPONIBLE: '#28a745',  // Verde para días/horarios disponibles
        NO_DISPONIBLE: '#dc3545', // Rojo para días/horarios no disponibles
        OCUPADO: '#ffc107',     // Amarillo para días con citas ocupadas
        CITA_ASIGNADA: '#17a2b8' // Azul para citas existentes
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
            }, 500);
        }
    });
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const tabla = document.getElementById('tablaCitas');
        if (tabla) setTimeout(() => {
            listarCitas();
            inicializarSelectorFecha();
        }, 300);
    }
})();

// ========== INICIALIZAR SELECTOR DE FECHA CON VALIDACIONES ==========
function inicializarSelectorFecha() {
    const inputFecha = document.getElementById("cita_fecha");
    if (!inputFecha) return;
    
    // Configurar el input datetime-local
    inputFecha.addEventListener('change', validarHorarioCita);
    inputFecha.addEventListener('input', validarHorarioCita);
    
    // Establecer fecha mínima (hoy)
    const ahora = new Date();
    ahora.setMinutes(0, 0, 0);
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(CONFIG.HORARIO.INICIO).padStart(2, '0');
    inputFecha.min = `${año}-${mes}-${dia}T${hora}:00`;
}

// ========== VALIDAR HORARIO DE CITA ==========
async function validarHorarioCita() {
    const inputFecha = document.getElementById("cita_fecha");
    const fechaSeleccionada = inputFecha.value;
    const mensajeError = document.getElementById("errorHorarioCita");
    
    if (!fechaSeleccionada) return true;
    
    const fecha = new Date(fechaSeleccionada);
    const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    
    // Convertir día de JavaScript (0-6) a nuestro sistema (1=Lunes)
    let diaJS = diaSemana === 0 ? 7 : diaSemana;
    let diaLaboral = CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS);
    
    // Validar día laboral
    if (!diaLaboral) {
        mostrarErrorHorario("❌ Los sábados y domingos no hay servicio. Selecciona un día de lunes a viernes.");
        inputFecha.value = "";
        return false;
    }
    
    // Validar horario
    const hora = fecha.getHours();
    if (hora < CONFIG.HORARIO.INICIO || hora >= CONFIG.HORARIO.FIN) {
        mostrarErrorHorario(`❌ El horario de atención es de ${CONFIG.HORARIO.INICIO}:00 AM a ${CONFIG.HORARIO.FIN}:00 PM.`);
        inputFecha.value = "";
        return false;
    }
    
    // Validar hora de cierre (no permitir citas que terminen después de las 6 PM)
    const horaInicio = hora;
    const horaFin = horaInicio + CONFIG.HORARIO.DURACION_MINIMA_HORAS;
    if (horaFin > CONFIG.HORARIO.FIN) {
        mostrarErrorHorario(`❌ La cita requiere ${CONFIG.HORARIO.DURACION_MINIMA_HORAS} horas. El horario máximo para iniciar es a las ${CONFIG.HORARIO.FIN - CONFIG.HORARIO.DURACION_MINIMA_HORAS}:00 PM.`);
        inputFecha.value = "";
        return false;
    }
    
    // Validar cita duplicada
    const esValida = await validarCitaDuplicada(fechaSeleccionada);
    if (!esValida) return false;
    
    ocultarErrorHorario();
    return true;
}

function mostrarErrorHorario(mensaje) {
    let errorDiv = document.getElementById("errorHorarioCita");
    if (!errorDiv) {
        const inputFecha = document.getElementById("cita_fecha");
        errorDiv = document.createElement("div");
        errorDiv.id = "errorHorarioCita";
        errorDiv.className = "text-danger small mt-1";
        inputFecha.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = mensaje;
    errorDiv.style.display = "block";
}

function ocultarErrorHorario() {
    const errorDiv = document.getElementById("errorHorarioCita");
    if (errorDiv) errorDiv.style.display = "none";
}

// ========== VALIDAR CITA DUPLICADA ==========
async function validarCitaDuplicada(fechaSeleccionada) {
    await cargarCitasExistentes();
    
    const fechaInicio = new Date(fechaSeleccionada);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setHours(fechaFin.getHours() + CONFIG.HORARIO.DURACION_MINIMA_HORAS);
    
    // Verificar si hay conflicto con alguna cita existente
    const conflicto = citasExistentes.some(cita => {
        if (editandoCitaId === cita.id_cita) return false; // Ignorar la cita actual en edición
        
        const citaInicio = new Date(cita.cita_fecha_programada);
        const citaFin = new Date(citaInicio);
        citaFin.setHours(citaFin.getHours() + CONFIG.HORARIO.DURACION_MINIMA_HORAS);
        
        // Verificar si los rangos se solapan
        return (fechaInicio < citaFin && fechaFin > citaInicio);
    });
    
    if (conflicto) {
        mostrarErrorHorario("❌ Ya existe una cita programada en este horario. Por favor, selecciona otro horario.");
        document.getElementById("cita_fecha").value = "";
        return false;
    }
    
    return true;
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

                return `
                <tr>
                    <td><strong>#${c.id_cita}</strong></td>
                    <td>${c.cita_fecha_programada ? new Date(c.cita_fecha_programada).toLocaleString('es-MX') : '-'}</td>
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

// ========== MODAL ==========
function abrirModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "flex";
        cargarSelectEmpleados();
        editandoCitaId = null;
        clienteIdCita = null;
        empleadoIdCita = null;
        ocultarErrorHorario();
        
        // Resetear fecha
        const inputFecha = document.getElementById("cita_fecha");
        if (inputFecha) inputFecha.value = "";
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
    ocultarErrorHorario();
}

// ========== GUARDAR CITA ==========
async function guardarCita(e) {
    if (e) e.preventDefault();
    
    // Obtener empleado del select
    const selEmp = document.getElementById("id_empleado_select");
    if (selEmp && selEmp.value) {
        empleadoIdCita = parseInt(selEmp.value);
    }
    
    if (!clienteIdCita || !empleadoIdCita) {
        return Swal.fire("Aviso", "Selecciona cliente y empleado", "warning");
    }
    
    const fechaSeleccionada = document.getElementById("cita_fecha").value;
    
    // Validar horario antes de guardar
    const esHorarioValido = await validarHorarioCita();
    if (!esHorarioValido) {
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
                })
                .catch(() => Swal.fire("Error", "No se pudo eliminar la cita", "error"));
        }
    });
}

// ========== OBTENER DIAS DISPONIBLES PARA EL CALENDARIO ==========
async function obtenerDiasDisponibles() {
    await cargarCitasExistentes();
    
    const diasDisponibles = [];
    const hoy = new Date();
    const fin = new Date();
    fin.setMonth(fin.getMonth() + 2); // Ver 2 meses hacia adelante
    
    for (let d = new Date(hoy); d <= fin; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.getDay();
        let diaJS = diaSemana === 0 ? 7 : diaSemana;
        const esLaboral = CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS);
        
        if (esLaboral) {
            // Verificar si hay espacios disponibles en este día
            const citasDia = citasExistentes.filter(cita => {
                const fechaCita = new Date(cita.cita_fecha_programada);
                return fechaCita.toDateString() === d.toDateString();
            });
            
            // Horas ocupadas por citas existentes
            const horasOcupadas = citasDia.map(cita => {
                const fecha = new Date(cita.cita_fecha_programada);
                return fecha.getHours();
            });
            
            // Verificar si hay al menos un horario disponible
            let tieneHorarioDisponible = false;
            for (let hora = CONFIG.HORARIO.INICIO; hora < CONFIG.HORARIO.FIN - CONFIG.HORARIO.DURACION_MINIMA_HORAS + 1; hora++) {
                let horarioOcupado = false;
                for (let h = hora; h < hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS; h++) {
                    if (horasOcupadas.includes(h)) {
                        horarioOcupado = true;
                        break;
                    }
                }
                if (!horarioOcupado) {
                    tieneHorarioDisponible = true;
                    break;
                }
            }
            
            diasDisponibles.push({
                fecha: new Date(d),
                disponible: tieneHorarioDisponible
            });
        }
    }
    
    return diasDisponibles;
}

// ========== OBTENER HORARIOS DISPONIBLES PARA UNA FECHA ==========
async function obtenerHorariosDisponibles(fecha) {
    await cargarCitasExistentes();
    
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();
    let diaJS = diaSemana === 0 ? 7 : diaSemana;
    
    if (!CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS)) {
        return [];
    }
    
    // Obtener citas de ese día
    const citasDia = citasExistentes.filter(cita => {
        const fechaCita = new Date(cita.cita_fecha_programada);
        return fechaCita.toDateString() === fechaObj.toDateString();
    });
    
    // Horas ocupadas
    const horasOcupadas = [];
    citasDia.forEach(cita => {
        const fecha = new Date(cita.cita_fecha_programada);
        const inicio = fecha.getHours();
        for (let i = 0; i < CONFIG.HORARIO.DURACION_MINIMA_HORAS; i++) {
            horasOcupadas.push(inicio + i);
        }
    });
    
    // Generar horarios disponibles
    const horariosDisponibles = [];
    for (let hora = CONFIG.HORARIO.INICIO; hora <= CONFIG.HORARIO.FIN - CONFIG.HORARIO.DURACION_MINIMA_HORAS; hora++) {
        let horarioOcupado = false;
        for (let h = hora; h < hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS; h++) {
            if (horasOcupadas.includes(h)) {
                horarioOcupado = true;
                break;
            }
        }
        if (!horarioOcupado) {
            horariosDisponibles.push({
                hora: hora,
                horaFin: hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS,
                texto: `${hora.toString().padStart(2, '0')}:00 - ${(hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS).toString().padStart(2, '0')}:00`
            });
        }
    }
    
    return horariosDisponibles;
}

// ========== EXPONER FUNCIONES ==========
window.listarCitas = listarCitas;
window.abrirModalCita = abrirModalCita;
window.cerrarModalCita = cerrarModalCita;
window.buscarClienteCita = buscarClienteCita;
window.seleccionarClienteCita = seleccionarClienteCita;
window.guardarCita = guardarCita;
window.editarCita = editarCita;
window.eliminarCita = eliminarCita;
window.prepararServicio = prepararServicio;
window.obtenerDiasDisponibles = obtenerDiasDisponibles;
window.obtenerHorariosDisponibles = obtenerHorariosDisponibles;