
(function() {
    'use strict';

   
    const API_MANTENIMIENTO = "https://jhpapi-production.up.railway.app/api/mantenimiento";
    const API_CITAS_SERV = "https://jhpapi-production.up.railway.app/api/citas";
    const API_CLIENTES_SERV = "https://jhpapi-production.up.railway.app/api/clientes";
    const API_EMPLEADOS_SERV = "https://jhpapi-production.up.railway.app/api/empleados";

    let carritoServicios = [];
    let carritoInsumos = [];
    let inicializado = false;

   
    function inicializarServicios() {
        if (inicializado) {
            console.log(' Ya inicializado');
            return;
        }
        inicializado = true;
        console.log(' Inicializando servicios...');

        const tbody = document.getElementById("tablaServicios");
        if (!tbody) {
            inicializado = false;
            setTimeout(inicializarServicios, 200);
            return;
        }

        const idCitaPendiente = localStorage.getItem('id_cita_seleccionada');
        if (idCitaPendiente) {
            console.log('📋 Cita pendiente:', idCitaPendiente);
            localStorage.removeItem('id_cita_seleccionada');
            Promise.all([cargarSelects(), listarServicios()])
                .then(() => setTimeout(() => autoLlenarDesdeCita(idCitaPendiente), 500))
                .catch(err => console.error('Error:', err));
        } else {
            cargarSelects().catch(err => console.error('Error selects:', err));
            listarServicios().catch(err => console.error('Error lista:', err));
        }
    }

    
    async function listarServicios() {
        const tbody = document.getElementById("tablaServicios");
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></td></tr>';

        try {
            const res = await fetch(API_MANTENIMIENTO);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const response = await res.json();
            const data = response.success ? (response.data?.data || response.data) : response;
            const servicios = Array.isArray(data) ? data : [];

            if (servicios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center py-3">No hay servicios</td></tr>';
                return;
            }

            tbody.innerHTML = servicios.map(m => {
                const estadoClass = m.estado_servicio === 'Completado' ? 'success' :
                                   m.estado_servicio === 'Cancelado' ? 'danger' :
                                   m.estado_servicio === 'En Proceso' ? 'info' : 'warning';
                return `
                <tr>
                    <td><strong>#${m.id_mantenimiento}</strong></td>
                    <td>${m.cita ? '#'+m.cita.id_cita : '-'}</td>
                    <td>${m.cliente ? (m.cliente.cli_nombre||'')+' '+(m.cliente.cli_apaterno||'') : 'S/D'}</td>
                    <td>${m.moto_modelo || 'N/A'}</td>
                    <td>${m.mecanico ? m.mecanico.emp_nombre : 'S/D'}</td>
                    <td>$${parseFloat(m.mantenimiento_mano_obra||0).toFixed(2)}</td>
                    <td>$${parseFloat(m.mantenimiento_total||0).toFixed(2)}</td>
                    <td><span class="badge bg-${estadoClass}">${m.estado_servicio||'Pendiente'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="window.verDetalleServicio(${m.id_mantenimiento})"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-warning" onclick="window.editarServicio(${m.id_mantenimiento})"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>`;
            }).join('');

            const pendientes = servicios.filter(s => s.estado_servicio !== 'Completado' && s.estado_servicio !== 'Cancelado').length;
            const completados = servicios.filter(s => s.estado_servicio === 'Completado').length;
            const elP = document.getElementById("totalServiciosPendientes");
            const elC = document.getElementById("totalServiciosTerminados");
            if (elP) elP.textContent = pendientes;
            if (elC) elC.textContent = completados;

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error: ${e.message}</td></tr>`;
        }
    }

   
    async function cargarSelects() {
        try {
            const [resCli, resEmp] = await Promise.all([
                fetch(API_CLIENTES_SERV),
                fetch(API_EMPLEADOS_SERV)
            ]);
            const dataCli = await resCli.json();
            const dataEmp = await resEmp.json();
            const clientes = dataCli.success ? (dataCli.data?.data || dataCli.data) : dataCli;
            const empleados = dataEmp.success ? (dataEmp.data?.data || dataEmp.data) : dataEmp;
            const listaCli = Array.isArray(clientes) ? clientes : [];
            const listaEmp = Array.isArray(empleados) ? empleados : [];

            const selCli = document.getElementById("id_cliente");
            const selMec = document.getElementById("id_mecanico");
            if (selCli) selCli.innerHTML = '<option value="">Seleccione...</option>' + listaCli.map(c => `<option value="${c.id_cliente}">${c.cli_nombre||''} ${c.cli_apaterno||''}</option>`).join('');
            if (selMec) selMec.innerHTML = '<option value="">Seleccione...</option>' + listaEmp.filter(e => e.emp_rol==='Mecanico'||e.emp_rol==='Mecánico').map(e => `<option value="${e.id_empleados}">${e.emp_nombre}</option>`).join('');
        } catch (e) {
            console.error('Error selects:', e);
        }
    }

    
async function autoLlenarDesdeCita(id) {
    console.log(' Auto-llenando desde cita #' + id);
    
    try {
        const res = await fetch(`${API_CITAS_SERV}/${id}`);
        console.log('Status:', res.status);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const response = await res.json();
        console.log('Respuesta cita:', response);
        
       
        let cita = response;
        
      
        if (response.success && response.data) {
            cita = response.data;
        }
        
        if (!cita || !cita.id_cita) {
            console.error(' Estructura no reconocida:', response);
            throw new Error('Formato de cita no válido');
        }

        console.log(' Cita cargada:', cita.id_cita, '-', cita.cita_motivo);

       
        const modalEl = document.getElementById("modalMantenimiento");
        if (!modalEl) {
            console.error(' Modal no encontrado');
            throw new Error('Modal no disponible');
        }

       
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Llenar 
        modalEl.addEventListener('shown.bs.modal', function fill() {
            modalEl.removeEventListener('shown.bs.modal', fill);
            
            console.log('📝 Llenando formulario...');
            
            // ID de la cita
            document.getElementById("id_cita_input").value = id;
            
            // Cliente
            document.getElementById("id_cliente").value = cita.id_cliente || "";
            
            // e(id_empleadc
            document.getElementById("id_mecanico").value = cita.id_empleado || "";
            
            // Motivo
            document.getElementById("moto_llegada_descripcion").value = cita.cita_motivo || "";
            
            // Estado
            document.getElementById("estado_servicio").value = "En Proceso";
            
            setTimeout(() => {
                const modelo = document.getElementById("moto_modelo");
                if (modelo) modelo.focus();
            }, 300);

            console.log(' Formulario llenado correctamente');
        });

        Swal.fire({
            title: 'Servicio iniciado',
            text: `Desde cita #${id}`,
            icon: 'success',
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (e) {
        console.error(" Error en autoLlenarDesdeCita:", e);
        Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la cita: ' + e.message,
            icon: 'error'
        });
    }
}

  
    window.abrirModalServicio = function() {
        const form = document.getElementById("formMantenimiento");
        if (form) form.reset();
        document.getElementById("id_cita_input").value = "";
        carritoServicios = [];
        carritoInsumos = [];
        new bootstrap.Modal(document.getElementById('modalMantenimiento')).show();
    };

   
    // GUARDAR SERVICIO

    window.guardarServicio = async function() {
    const idEditar = document.getElementById("formMantenimiento").dataset.editarId;
    const idCita = document.getElementById("id_cita_input")?.value;
    const idCliente = document.getElementById("id_cliente")?.value;
    const idMecanico = document.getElementById("id_mecanico")?.value;
    const modelo = document.getElementById("moto_modelo")?.value;
    const descripcion = document.getElementById("moto_llegada_descripcion")?.value;
    const manoObra = parseFloat(document.getElementById("mano_obra")?.value) || 0;
    const estado = document.getElementById("estado_servicio")?.value || "Pendiente";

    if (!idCliente || !idMecanico || !modelo) {
        return Swal.fire("Aviso", "Cliente, Mecánico y Modelo son obligatorios", "warning");
    }

    const url = idEditar ? `${API_MANTENIMIENTO}/${idEditar}` : API_MANTENIMIENTO;
    const method = idEditar ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                id_cliente: parseInt(idCliente),
                id_mecanico: parseInt(idMecanico),
                id_cita: idCita || null,
                moto_modelo: modelo,
                moto_llegada_descripcion: descripcion,
                mantenimiento_mano_obra: manoObra,
                mantenimiento_total: manoObra,
                estado_servicio: estado
            })
        });
        const result = await res.json();

        if (result.success || result.message || result.id_mantenimiento) {
            Swal.fire({ 
                icon: 'success', 
                title: idEditar ? '¡Servicio actualizado!' : '¡Servicio registrado!', 
                timer: 1500, 
                showConfirmButton: false 
            });

            if (idCita) {
                fetch(`${API_CITAS_SERV}/${idCita}`, {
                    method: 'PUT',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cita_estado: estado === 'Completado' ? 'Realizada' : 'Pendiente' })
                }).catch(() => {});
            }

            // Limpiar
            document.getElementById("formMantenimiento").reset();
            delete document.getElementById("formMantenimiento").dataset.editarId;
            document.getElementById("id_cita_input").value = "";

            const modalEl = document.getElementById('modalMantenimiento');
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
            listarServicios();
        } else {
            throw new Error(result.message || 'Error');
        }
    } catch (err) {
        Swal.fire("Error", err.message, "error");
    }
};

  
    window.inicializarServicios = inicializarServicios;
    window.listarServicios = listarServicios;
    // VER DETALLE DE SERVICIO
window.verDetalleServicio = async function(id) {
    try {
        const res = await fetch(`${API_MANTENIMIENTO}/${id}`);
        const response = await res.json();
        const m = response.success ? response.data : response;

        let html = `
            <div style="text-align:left;font-size:14px;">
                <p><strong>Folio:</strong> #${m.id_mantenimiento}</p>
                <p><strong>Cliente:</strong> ${m.cliente ? m.cliente.cli_nombre + ' ' + m.cliente.cli_apaterno : 'S/D'}</p>
                <p><strong>Mecánico:</strong> ${m.mecanico ? m.mecanico.emp_nombre : 'S/D'}</p>
                <p><strong>Modelo:</strong> ${m.moto_modelo || 'N/A'}</p>
                <p><strong>Descripción:</strong> ${m.moto_llegada_descripcion || 'Sin descripción'}</p>
                <p><strong>Trabajo realizado:</strong> ${m.trabajo_realizado || 'Pendiente'}</p>
                <p><strong>Mano de obra:</strong> $${parseFloat(m.mantenimiento_mano_obra || 0).toFixed(2)}</p>
                <p><strong>Total:</strong> $${parseFloat(m.mantenimiento_total || 0).toFixed(2)}</p>
                <p><strong>Estado:</strong> ${m.estado_servicio || 'Pendiente'}</p>`;

        if (m.insumos && m.insumos.length > 0) {
            html += `<hr><strong>Insumos utilizados:</strong>
                <table style="width:100%;font-size:12px;">
                    <tr><th>Producto</th><th>Cant</th><th>P. Unit</th></tr>`;
            m.insumos.forEach(i => {
                html += `<tr>
                    <td>${i.producto?.pro_nombre || 'Producto'}</td>
                    <td>${i.insumo_cantidad}</td>
                    <td>$${parseFloat(i.insumo_precio_unitario || 0).toFixed(2)}</td>
                </tr>`;
            });
            html += `</table>`;
        }

        html += `</div>`;

        Swal.fire({
            title: `Servicio #${m.id_mantenimiento}`,
            html: html,
            width: '600px',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#080522'
        });
    } catch (e) {
        Swal.fire("Error", "No se pudo cargar el detalle", "error");
    }
};

// EDITAR SERVICIO
window.editarServicio = async function(id) {
    try {
        const res = await fetch(`${API_MANTENIMIENTO}/${id}`);
        const response = await res.json();
        const m = response.success ? response.data : response;

        document.getElementById("id_cita_input").value = m.id_cita || "";
        document.getElementById("id_cliente").value = m.id_cliente || "";
        document.getElementById("id_mecanico").value = m.id_mecanico || "";
        document.getElementById("moto_modelo").value = m.moto_modelo || "";
        document.getElementById("moto_llegada_descripcion").value = m.moto_llegada_descripcion || "";
        document.getElementById("mano_obra").value = m.mantenimiento_mano_obra || 0;
        document.getElementById("estado_servicio").value = m.estado_servicio || "Pendiente";

        // Guardar el ID para actualizar en lugar de crear
        document.getElementById("formMantenimiento").dataset.editarId = id;

        new bootstrap.Modal(document.getElementById('modalMantenimiento')).show();
    } catch (e) {
        Swal.fire("Error", "No se pudo cargar el servicio", "error");
    }
};

})(); // FIN DE LA IIFE