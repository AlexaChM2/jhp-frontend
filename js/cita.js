const API_CITA = "https://jhpapi-production.up.railway.app/api/citas";
const API_CLI_CITAS = "https://jhpapi-production.up.railway.app/api/clientes"; // Renombrada para evitar conflictos
const API_EMP_CITAS = "https://jhpapi-production.up.railway.app/api/empleados"; // Renombrada para evitar conflictos

let clienteIdCita = null;
let empleadoIdCita = null;
let editandoCitaId = null;
let citasIniciadas = false;

// ========== AUTO-INICIALIZACIÓN SIMPLIFICADA ==========
(function() {
    // Escuchar el evento de app.js
    document.addEventListener('vista-cargada', function(e) {
        if (e.detail && e.detail.vista && 
            (e.detail.vista.includes('cita') || e.detail.vista.includes('Cita'))) {
            console.log('📅 Citas: Vista detectada, iniciando...');
            citasIniciadas = false;
            setTimeout(listarCitas, 500);
        }
    });
    
    // Verificar si ya estamos en citas
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const tabla = document.getElementById('tablaCitas');
        if (tabla) {
            console.log('📅 Citas: Ya en vista, iniciando...');
            setTimeout(listarCitas, 300);
        }
    }
})();

// ========== FUNCIONES DE CITAS ==========

function listarCitas() {
    const tbody = document.getElementById("tablaCitas");
    if (!tbody) {
        console.warn('📅 Tabla de citas no encontrada');
        return;
    }

    console.log('📅 Cargando lista de citas...');
    
    fetch(API_CITA)
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
            console.log(`✅ Citas cargadas: ${citas.length} registros`);
        })
        .catch(err => {
            console.error("❌ Error al listar citas:", err);
            citasIniciadas = false;
        });
}

function prepararServicio(idCita) {
    // Obtener el tipo de cita primero
    fetch(`${API_CITA}/${idCita}`)
        .then(res => res.json())
        .then(response => {
            const cita = response.success ? response.data : response;
            const tipo = cita.cita_tipo || 'Servicio';
            
            localStorage.setItem('id_cita_seleccionada', idCita);
            
            if (tipo === 'Venta') {
                // Redirigir a ventas
                if (typeof window.cargarVista === 'function') {
                    window.cargarVista('views/ventas.html');
                }
            } else {
                // Redirigir a servicios
                if (typeof window.cargarVista === 'function') {
                    window.cargarVista('views/servicios.html');
                }
            }
        })
        .catch(err => {
            console.error("Error al obtener tipo de cita:", err);
            // Por defecto, ir a servicios
            localStorage.setItem('id_cita_seleccionada', idCita);
            if (typeof window.cargarVista === 'function') {
                window.cargarVista('views/servicios.html');
            }
        });
}

function buscarClienteCita(v) {
    const lista = document.getElementById("resCliCita");
    if (!lista) return;
    if (v.length < 2) { lista.style.display = "none"; return; }

    fetch(API_CLI_CITAS) // ✅ CORREGIDO: antes decía API_CLI
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

function buscarEmpleadoCita(v) {
    const lista = document.getElementById("resEmpCita");
    if (!lista) return;
    if (v.length < 2) { lista.style.display = "none"; return; }

    fetch(API_EMP_CITAS) // ✅ CORREGIDO: antes decía API_EMP
        .then(res => res.json())
        .then(response => {
            const empleados = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(empleados) ? empleados : [];
            const mecanicos = datos.filter(e => e.emp_rol === 'Mecanico' || e.emp_rol === 'mecanico' || e.emp_rol === 'Mecánico');
            const filtrados = mecanicos.filter(e => 
                e.emp_nombre && e.emp_nombre.toLowerCase().includes(v.toLowerCase())
            );
            lista.innerHTML = filtrados.map(e => `
                <button type="button" class="list-group-item list-group-item-action" 
                    onclick="window.seleccionarEmpleadoCita(${e.id_empleados}, '${e.emp_nombre.replace(/'/g, "\\'")}')">
                    ${e.emp_nombre} <span class="badge bg-info">Mecánico</span></button>`).join('');
            lista.style.display = filtrados.length > 0 ? "block" : "none";
        });
}

function seleccionarEmpleadoCita(id, nombre) {
    empleadoIdCita = id;
    document.getElementById("busEmpCita").value = nombre;
    document.getElementById("resEmpCita").style.display = "none";
}

function abrirModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "flex";
    }
}

function cerrarModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "none";
    }
    const form = document.getElementById("formCita");
    if (form) {
        form.reset();
    }
    editandoCitaId = null;
    clienteIdCita = null;
    empleadoIdCita = null;
}

function guardarCita(e) {
    if (e) e.preventDefault();
    if (!clienteIdCita || !empleadoIdCita) {
        return Swal.fire("Aviso", "Selecciona cliente y mecánico", "warning");
    }
    const data = {
        id_cliente: parseInt(clienteIdCita),
        id_empleado: parseInt(empleadoIdCita),
        cita_fecha_programada: document.getElementById("cita_fecha").value,
        cita_estado: document.getElementById("cita_estado").value || 'Pendiente',
           cita_tipo: document.getElementById("cita_tipo")?.value || 'Servicio',
        cita_motivo: document.getElementById("cita_motivo").value
    };
    const url = editandoCitaId ? `${API_CITA}/${editandoCitaId}` : API_CITA;
    const metodo = editandoCitaId ? "PUT" : "POST";
    console.log(`Guardando cita: ${metodo} ${url}`, data);
    fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        Swal.fire({ icon: 'success', title: '¡Éxito!', text: editandoCitaId ? 'Cita actualizada' : 'Cita registrada', timer: 1500, showConfirmButton: false });
        cerrarModalCita();
        listarCitas();
    })
    .catch(err => {
        console.error("Error:", err);
        Swal.fire("Error", "No se pudo guardar la cita", "error");
    });
}

function editarCita(id) {
    fetch(`${API_CITA}/${id}`)
        .then(res => res.json())
        .then(response => {
            const c = response.success ? response.data : response;
            if (!c) {
                Swal.fire("Error", "No se encontró la cita", "error");
                return;
            }
            editandoCitaId = id;
            clienteIdCita = c.id_cliente;
            empleadoIdCita = c.id_empleado;
            const nombreCliente = c.cliente ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() : '';
            document.getElementById("busCliCita").value = nombreCliente;
            const nombreEmpleado = c.empleado ? c.empleado.emp_nombre : '';
            document.getElementById("busEmpCita").value = nombreEmpleado;
            if (c.cita_fecha_programada) {
                document.getElementById("cita_fecha").value = c.cita_fecha_programada.replace(" ", "T").substring(0, 16);
            }
            document.getElementById("cita_estado").value = c.cita_estado || 'Pendiente';
            document.getElementById("cita_tipo").value = c.cita_tipo || 'Servicio';
            document.getElementById("cita_motivo").value = c.cita_motivo || '';
            abrirModalCita();
        })
        .catch(err => {
            console.error("Error al editar:", err);
            Swal.fire("Error", "No se pudieron cargar los datos de la cita", "error");
        });
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
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${API_CITA}/${id}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) throw new Error('Error al eliminar');
                    Swal.fire('Eliminada', 'La cita ha sido eliminada', 'success');
                    listarCitas();
                })
                .catch(err => {
                    console.error("Error al eliminar:", err);
                    Swal.fire("Error", "No se pudo eliminar la cita", "error");
                });
        }
    });
}

// Exponer funciones globalmente
window.listarCitas = listarCitas;
window.abrirModalCita = abrirModalCita;
window.cerrarModalCita = cerrarModalCita;
window.buscarClienteCita = buscarClienteCita;
window.buscarEmpleadoCita = buscarEmpleadoCita;
window.seleccionarClienteCita = seleccionarClienteCita;
window.seleccionarEmpleadoCita = seleccionarEmpleadoCita;
window.guardarCita = guardarCita;
window.editarCita = editarCita;
window.eliminarCita = eliminarCita;
window.prepararServicio = prepararServicio;