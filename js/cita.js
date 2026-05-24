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
    minutoInicio: 0,
    minutoFin: 0
};

// ========== VALIDAR HORARIO LABORAL ==========
function validarHorarioLaboral(fechaHora) {
    const fecha = new Date(fechaHora);
    const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    
    // Verificar si es día laboral (Lunes a Viernes)
    if (!HORARIO_LABORAL.dias.includes(diaSemana)) {
        return {
            valido: false,
            mensaje: '❌ Las citas solo se pueden agendar de Lunes a Viernes'
        };
    }
    
    // Verificar si está dentro del horario
    const horaActual = hora + minutos / 60;
    const horaInicio = HORARIO_LABORAL.horaInicio + HORARIO_LABORAL.minutoInicio / 60;
    const horaFin = HORARIO_LABORAL.horaFin + HORARIO_LABORAL.minutoFin / 60;
    
    if (horaActual < horaInicio || horaActual >= horaFin) {
        return {
            valido: false,
            mensaje: `❌ Horario laboral: Lunes a Viernes de ${HORARIO_LABORAL.horaInicio}:00 a ${HORARIO_LABORAL.horaFin}:00`
        };
    }
    
    return { valido: true, mensaje: '✅ Horario válido' };
}

// ========== VERIFICAR CITA DUPLICADA ==========
async function verificarCitaDuplicada(fechaHora, idCitaEditando = null) {
    try {
        const res = await fetch(API_CITA_CITAS);
        const response = await res.json();
        const citas = response.success ? (response.data?.data || response.data) : response;
        const listaCitas = Array.isArray(citas) ? citas : [];
        
        // Normalizar la fecha para comparar (misma hora y día)
        const fechaComparar = new Date(fechaHora);
        const año = fechaComparar.getFullYear();
        const mes = fechaComparar.getMonth();
        const dia = fechaComparar.getDate();
        const hora = fechaComparar.getHours();
        const minutos = fechaComparar.getMinutes();
        
        // Buscar cita en la misma fecha y hora (margen de 30 minutos)
        const citaExistente = listaCitas.find(c => {
            // Si es la misma cita que estamos editando, ignorarla
            if (idCitaEditando && c.id_cita === parseInt(idCitaEditando)) {
                return false;
            }
            
            const fechaCita = new Date(c.cita_fecha_programada);
            const mismaFecha = fechaCita.getFullYear() === año &&
                               fechaCita.getMonth() === mes &&
                               fechaCita.getDate() === dia;
            
            if (!mismaFecha) return false;
            
            const horaCita = fechaCita.getHours();
            const minutosCita = fechaCita.getMinutes();
            
            // Diferencia en minutos (margen de 30 minutos para evitar solapamiento)
            const diferenciaMinutos = Math.abs((horaCita * 60 + minutosCita) - (hora * 60 + minutos));
            return diferenciaMinutos < 30;
        });
        
        if (citaExistente) {
            return {
                valido: false,
                mensaje: `❌ Ya existe una cita programada cerca de ese horario el día ${dia}/${mes+1}/${año} a las ${citaExistente.cita_fecha_programada ? new Date(citaExistente.cita_fecha_programada).toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'}) : ''}`
            };
        }
        
        return { valido: true, mensaje: '✅ Horario disponible' };
        
    } catch (error) {
        console.error('Error verificando duplicados:', error);
        return { valido: true, mensaje: '⚠️ No se pudo verificar duplicados' };
    }
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
        // Configurar el input datetime-local con horario mínimo
        configurarInputFecha();
    }
}

function configurarInputFecha() {
    const inputFecha = document.getElementById("cita_fecha");
    if (!inputFecha) return;
    
    // Establecer fecha mínima = hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    inputFecha.min = hoy.toISOString().slice(0, 16);
    
    // Establecer hora mínima (9:00) y máxima (18:00) del día seleccionado
    inputFecha.addEventListener('change', function() {
        const fechaSeleccionada = new Date(this.value);
        const diaSemana = fechaSeleccionada.getDay();
        
        if (![1, 2, 3, 4, 5].includes(diaSemana)) {
            Swal.fire({
                title: "Horario no disponible",
                text: "Las citas solo se pueden agendar de Lunes a Viernes",
                icon: "warning"
            });
            this.value = "";
        }
    });
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
    
    if (!clienteIdCita || !empleadoIdCita) {
        return Swal.fire("Aviso", "Selecciona cliente y empleado", "warning");
    }
    
    const fechaHora = document.getElementById("cita_fecha").value;
    if (!fechaHora) {
        return Swal.fire("Aviso", "Selecciona una fecha y hora para la cita", "warning");
    }
    
    // VALIDACIÓN 1: Horario laboral
    const horarioValid = validarHorarioLaboral(fechaHora);
    if (!horarioValid.valido) {
        return Swal.fire("Horario no disponible", horarioValid.mensaje, "warning");
    }
    
    // VALIDACIÓN 2: No duplicados
    const duplicadoValid = await verificarCitaDuplicada(fechaHora, editandoCitaId);
    if (!duplicadoValid.valido) {
        return Swal.fire("Cita duplicada", duplicadoValid.mensaje, "warning");
    }
    
    const data = {
        id_cliente: parseInt(clienteIdCita),
        id_empleado: parseInt(empleadoIdCita),
        cita_fecha_programada: fechaHora,
        cita_estado: document.getElementById("cita_estado").value || 'Pendiente',
        cita_tipo: document.getElementById("cita_tipo")?.value || 'Servicio',
        cita_motivo: document.getElementById("cita_motivo").value
    };
    
    const url = editandoCitaId ? `${API_CITA_CITAS}/${editandoCitaId}` : API_CITA_CITAS;
    const metodo = editandoCitaId ? "PUT" : "POST";
    
    // Mostrar loading
    Swal.fire({
        title: 'Guardando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
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
    .catch(err => {
        console.error(err);
        Swal.fire("Error", "No se pudo guardar la cita", "error");
    });
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