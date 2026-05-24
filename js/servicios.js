(function() {
    'use strict';

    const API_MANTENIMIENTO = "https://jhpapi-production.up.railway.app/api/mantenimiento";
    const API_CITAS_SERV = "https://jhpapi-production.up.railway.app/api/citas";
    const API_CLIENTES_SERV = "https://jhpapi-production.up.railway.app/api/clientes";
    const API_EMPLEADOS_SERV = "https://jhpapi-production.up.railway.app/api/empleados";
    const API_SERVICIOS = "https://jhpapi-production.up.railway.app/api/servicios";
    const API_PRODUCTOS = "https://jhpapi-production.up.railway.app/api/producto";

    let serviciosAgregados = [];
    let insumosAgregados = [];
    let inicializado = false;

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    function inicializarServicios() {
        if (inicializado) return;
        inicializado = true;

        const tbody = document.getElementById("tablaServicios");
        if (!tbody) {
            inicializado = false;
            setTimeout(inicializarServicios, 200);
            return;
        }

        const idCitaPendiente = localStorage.getItem('id_cita_seleccionada');
        if (idCitaPendiente) {
            localStorage.removeItem('id_cita_seleccionada');
            Promise.all([cargarSelects(), listarServicios()])
                .then(() => setTimeout(() => autoLlenarDesdeCita(idCitaPendiente), 500))
                .catch(err => console.error('Error:', err));
        } else {
            cargarSelects().catch(err => console.error('Error selects:', err));
            listarServicios().catch(err => console.error('Error lista:', err));
        }
    }

    // ==========================================
    // LISTAR SERVICIOS
    // ==========================================
    async function listarServicios() {
        const tbody = document.getElementById("tablaServicios");
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></td></tr>';

        try {
            const res = await fetch(API_MANTENIMIENTO);
            const response = await res.json();
            const data = response.success ? (response.data?.data || response.data) : response;
            const servicios = Array.isArray(data) ? data : [];

            if (servicios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3">No hay servicios</td></tr>';
                return;
            }

            tbody.innerHTML = servicios.map(m => {
                const estadoClass = m.estado_servicio === 'Terminado' || m.estado_servicio === 'Entregado' ? 'success' :
                                   m.estado_servicio === 'En Proceso' ? 'info' : 'warning';
                return `
                <tr>
                    <td><strong>#${m.id_mantenimiento}</strong></td>
                    <td>${m.cita ? '#'+m.cita.id_cita : '-'}</td>
                    <td>${m.cliente ? (m.cliente.cli_nombre||'')+' '+(m.cliente.cli_apaterno||'') : 'S/D'}</td>
                    <td>${m.moto_modelo || 'N/A'}</td>
                    <td>${m.mecanico ? m.mecanico.emp_nombre : 'S/D'}</td>
                    <td>$${parseFloat(m.mantenimiento_total||0).toFixed(2)}</td>
                    <td><span class="badge bg-${estadoClass}">${m.estado_servicio||'Pendiente'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="window.verDetalleServicio(${m.id_mantenimiento})"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-warning" onclick="window.editarServicio(${m.id_mantenimiento})"><i class="fas fa-edit"></i></button>
                       <button onclick="window.descargarPDFServicio(${m.id_mantenimiento})" title="Imprimir"
    style="background:#17791f;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
    <i class="fas fa-print"></i>
</button>
                    </td>
                </tr>`;
            }).join('');

            const pendientes = servicios.filter(s => s.estado_servicio !== 'Terminado' && s.estado_servicio !== 'Entregado').length;
            const completados = servicios.filter(s => s.estado_servicio === 'Terminado' || s.estado_servicio === 'Entregado').length;
            const ingresos = servicios.filter(s => s.estado_servicio === 'Terminado' || s.estado_servicio === 'Entregado')
                .reduce((sum, s) => sum + parseFloat(s.mantenimiento_total||0), 0);

            document.getElementById("totalServiciosPendientes").textContent = pendientes;
            document.getElementById("totalServiciosTerminados").textContent = completados;
            document.getElementById("ingresosServicios").textContent = '$' + ingresos.toFixed(2);

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${e.message}</td></tr>`;
        }
    }

    // ==========================================
    // CARGAR SELECTS
    // ==========================================
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

            // Cargar catálogo de servicios
            await cargarCatalogoServicios();
        } catch (e) {
            console.error('Error selects:', e);
        }
    }

    // ==========================================
    // CATÁLOGO DE SERVICIOS
    // ==========================================
    async function cargarCatalogoServicios() {
        try {
            const res = await fetch(API_SERVICIOS);
            const data = await res.json();
            const lista = data.success ? (data.data?.data || data.data) : data;
            const servicios = Array.isArray(lista) ? lista : [];
            
            const sel = document.getElementById("servicio_id");
            if (sel) {
                sel.innerHTML = '<option value="">Seleccione servicio...</option>' + 
                    servicios.map(s => `<option value="${s.id_servicio}" data-precio="${s.ser_precio_mano_obra}">${s.ser_nombre} - $${parseFloat(s.ser_precio_mano_obra).toFixed(2)}</option>`).join('');
            }
        } catch(e) {
            console.error("Error cargar servicios:", e);
        }
    }

    // ==========================================
    // AGREGAR SERVICIO (MANO DE OBRA)
    // ==========================================
    window.agregarServicio = function() {
        const sel = document.getElementById("servicio_id");
        const precio = parseFloat(document.getElementById("servicio_precio")?.value) || 0;
        
        if (!sel?.value || precio <= 0) {
            return Swal.fire("Aviso", "Selecciona un servicio y asigna un precio", "warning");
        }
        
        serviciosAgregados.push({
            id_servicio: parseInt(sel.value),
            nombre: sel.options[sel.selectedIndex].text.split(' - ')[0],
            precio_aplicado: precio
        });
        
        sel.value = "";
        document.getElementById("servicio_precio").value = "0";
        actualizarTotales();
    };

    // ==========================================
    // BUSCAR INSUMO
    // ==========================================
    window.buscarInsumo = function(valor) {
        const lista = document.getElementById("listaResultadosInsumos");
        if (!lista || valor.trim().length < 2) {
            if (lista) lista.style.display = "none";
            return;
        }

        fetch(API_PRODUCTOS)
            .then(res => res.json())
            .then(response => {
                const productos = response.success ? (response.data?.data || response.data) : response;
                const datos = Array.isArray(productos) ? productos : [];
                const filtrados = datos.filter(p =>
                    p.pro_nombre?.toLowerCase().includes(valor.toLowerCase()) ||
                    p.pro_codigo?.toLowerCase().includes(valor.toLowerCase())
                );

                lista.innerHTML = filtrados.map(p => `
                    <button type="button" class="list-group-item list-group-item-action" onclick="window.seleccionarInsumo(${p.id_producto},'${p.pro_nombre}',${p.pro_precio_venta})">
                        ${p.pro_nombre} - $${parseFloat(p.pro_precio_venta).toFixed(2)} (Stock: ${p.pro_stock})
                    </button>
                `).join('');
                lista.style.display = filtrados.length ? "block" : "none";
            });
    };

    window.seleccionarInsumo = function(id, nombre, precio) {
        document.getElementById("buscarInsumo").value = nombre;
        document.getElementById("buscarInsumo").dataset.idProducto = id;
        document.getElementById("insumo_precio").value = precio;
        document.getElementById("listaResultadosInsumos").style.display = "none";
    };

    // ==========================================
    // AGREGAR INSUMO
    // ==========================================
    window.agregarInsumo = function() {
        const id = document.getElementById("buscarInsumo").dataset.idProducto;
        const nombre = document.getElementById("buscarInsumo").value;
        const cantidad = parseInt(document.getElementById("insumo_cantidad").value) || 1;
        const precio = parseFloat(document.getElementById("insumo_precio").value) || 0;

        if (!id || !nombre) return Swal.fire("Aviso", "Busca y selecciona un producto", "warning");
        if (cantidad <= 0) return Swal.fire("Aviso", "Cantidad inválida", "warning");

        insumosAgregados.push({
            id_producto: parseInt(id),
            nombre: nombre,
            insumo_cantidad: cantidad,
            insumo_precio_unitario: precio
        });

        document.getElementById("buscarInsumo").value = "";
        delete document.getElementById("buscarInsumo").dataset.idProducto;
        document.getElementById("insumo_cantidad").value = 1;
        document.getElementById("insumo_precio").value = 0;
        actualizarTotales();
    };

    // ==========================================
    // ACTUALIZAR TOTALES
    // ==========================================
    function actualizarTotales() {
        // Servicios
        const totalServicios = serviciosAgregados.reduce((s, item) => s + item.precio_aplicado, 0);
        document.getElementById("total_mano_obra").textContent = totalServicios.toFixed(2);
        
        const divServicios = document.getElementById("listaServiciosAgregados");
        if (divServicios) {
            divServicios.innerHTML = serviciosAgregados.map((s, i) => `
                <div class="d-flex justify-content-between align-items-center bg-light p-2 mb-1 rounded">
                    <span><i class="fas fa-wrench text-success me-2"></i>${s.nombre}</span>
                    <span>$${s.precio_aplicado.toFixed(2)} 
                        <button class="btn btn-sm text-danger" onclick="window.quitarServicio(${i})">✕</button>
                    </span>
                </div>`).join('');
        }

        // Insumos
        const totalInsumos = insumosAgregados.reduce((s, item) => s + (item.insumo_cantidad * item.insumo_precio_unitario), 0);
        document.getElementById("total_insumos").textContent = totalInsumos.toFixed(2);
        
        const divInsumos = document.getElementById("listaInsumosAgregados");
        if (divInsumos) {
            divInsumos.innerHTML = insumosAgregados.map((item, i) => `
                <div class="d-flex justify-content-between align-items-center bg-light p-2 mb-1 rounded">
                    <span><i class="fas fa-box text-primary me-2"></i>${item.nombre} x${item.insumo_cantidad}</span>
                    <span>$${(item.insumo_cantidad * item.insumo_precio_unitario).toFixed(2)}
                        <button class="btn btn-sm text-danger" onclick="window.quitarInsumo(${i})">✕</button>
                    </span>
                </div>`).join('');
        }

        // Total general
        document.getElementById("total_general").textContent = (totalServicios + totalInsumos).toFixed(2);
    }

    window.quitarServicio = function(i) { serviciosAgregados.splice(i, 1); actualizarTotales(); };
    window.quitarInsumo = function(i) { insumosAgregados.splice(i, 1); actualizarTotales(); };

    // ==========================================
    // ABRIR MODAL
    // ==========================================
    window.abrirModalServicio = function() {
    const form = document.getElementById("formMantenimiento");
    if (form) form.reset();
    
    const idCita = document.getElementById("id_cita_input");
    if (idCita) idCita.value = "";
    
    if (form) delete form.dataset.editarId;
    
    // Limpiar listas
    serviciosAgregados = [];
    insumosAgregados = [];
    
    // Abrir modal primero
    const modalEl = document.getElementById('modalMantenimiento');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    // Esperar a que el modal esté visible para modificar el DOM
    modalEl.addEventListener('shown.bs.modal', function() {
        const titulo = document.getElementById("tituloModal");
        if (titulo) titulo.textContent = "Nueva Orden de Servicio";
        
        const btnGuardar = document.getElementById("btnGuardarServicio");
        if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Orden';

            const trabajo = document.getElementById("trabajo_realizado");
    if (trabajo) trabajo.value = "";
        
        actualizarTotales();
    }, { once: true });
    
    cargarCatalogoServicios();
};

    // ==========================================
    // GUARDAR SERVICIO
    // ==========================================
    window.guardarServicio = async function() {
        const idEditar = document.getElementById("formMantenimiento").dataset.editarId;
        const idCita = document.getElementById("id_cita_input")?.value || null;
        const idCliente = document.getElementById("id_cliente")?.value;
        const idMecanico = document.getElementById("id_mecanico")?.value;
        const modelo = document.getElementById("moto_modelo")?.value;
        const descripcion = document.getElementById("moto_llegada_descripcion")?.value;
        const trabajoRealizado = document.getElementById("trabajo_realizado")?.value; // ← NUEVO
        const estado = document.getElementById("estado_servicio")?.value || "En Proceso";

        if (!idCliente || !idMecanico || !modelo) {
            return Swal.fire("Aviso", "Cliente, Mecánico y Modelo son obligatorios", "warning");
        }

        const url = idEditar ? `${API_MANTENIMIENTO}/${idEditar}` : API_MANTENIMIENTO;
        const method = idEditar ? 'PUT' : 'POST';

        const body = {
            id_cliente: parseInt(idCliente),
            id_mecanico: parseInt(idMecanico),
            id_cita: idCita,
            moto_modelo: modelo,
            moto_llegada_descripcion: descripcion,
            trabajo_realizado: trabajoRealizado,
            estado_servicio: estado,
            servicios: serviciosAgregados,
            insumos: insumosAgregados
        };

        try {
            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(body)
            });
            const result = await res.json();

            if (result.success || result.message) {
                Swal.fire({ icon: 'success', title: idEditar ? '¡Actualizado!' : '¡Registrado!', timer: 1500, showConfirmButton: false });

                if (idCita && estado === 'Terminado') {
                    fetch(`${API_CITAS_SERV}/${idCita}`, {
                        method: 'PUT',
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cita_estado: 'Realizada' })
                    }).catch(() => {});
                }

                document.getElementById("formMantenimiento").reset();
                delete document.getElementById("formMantenimiento").dataset.editarId;
                serviciosAgregados = [];
                insumosAgregados = [];
                actualizarTotales();
                bootstrap.Modal.getInstance(document.getElementById('modalMantenimiento'))?.hide();
                listarServicios();
            } else {
                throw new Error(result.message || 'Error');
            }
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    // ==========================================
    // VER DETALLE
    // ==========================================
    window.verDetalleServicio = async function(id) {
        try {
            const res = await fetch(`${API_MANTENIMIENTO}/${id}`);
            const response = await res.json();
            const m = response.success ? response.data : response;

            const estadoColor = m.estado_servicio === 'Terminado' || m.estado_servicio === 'Entregado' ? '#28a745' :
                               m.estado_servicio === 'En Proceso' ? '#117483' : '#ffc107';

            let html = `
            <div style="font-size:14px;">
                <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
                    <tr><td style="padding:5px;font-weight:bold;width:35%;">Folio:</td><td>#${m.id_mantenimiento}</td></tr>
                    <tr><td style="padding:5px;font-weight:bold;">Cliente:</td><td>${m.cliente ? m.cliente.cli_nombre+' '+m.cliente.cli_apaterno : 'S/D'}</td></tr>
                    <tr><td style="padding:5px;font-weight:bold;">Mecánico:</td><td>${m.mecanico ? m.mecanico.emp_nombre : 'S/D'}</td></tr>
                    <tr><td style="padding:5px;font-weight:bold;">Modelo:</td><td>${m.moto_modelo||'N/A'}</td></tr>
                    <tr><td style="padding:5px;font-weight:bold;">Descripción:</td><td>${m.moto_llegada_descripcion||'-'}</td></tr>
                    <tr><td style="padding:5px;font-weight:bold;">Estado:</td><td><span style="background:${estadoColor};color:white;padding:3px 10px;border-radius:12px;">${m.estado_servicio||'Pendiente'}</span></td></tr>
                </table>`;

            // Servicios
            if (m.servicios?.length > 0) {
                html += `<hr><strong>🔧 Mano de Obra:</strong>
                <table style="width:100%;font-size:12px;margin-top:5px;">
                    <tr style="background: #d3a934 ;color:white;"><th style="padding:5px;">Servicio</th><th style="padding:5px;text-align:right;">Precio</th></tr>`;
                let totalServ = 0;
                m.servicios.forEach(s => {
                    totalServ += parseFloat(s.precio_aplicado||0);
                    html += `<tr><td style="padding:5px;">${s.servicio?.ser_nombre||'Servicio #'+s.id_servicio}</td><td style="padding:5px;text-align:right;">$${parseFloat(s.precio_aplicado||0).toFixed(2)}</td></tr>`;
                });
                html += `<tr style="font-weight:bold;background:#f8f9fa;"><td style="padding:5px;text-align:right;">Total Mano Obra:</td><td style="text-align:right;">$${totalServ.toFixed(2)}</td></tr></table>`;
            }

            // Insumos tabla de
            if (m.insumos?.length > 0) {
                html += `<br><strong> Insumos:</strong>
                <table style="width:100%;font-size:12px;margin-top:5px;">
                    <tr style="background: #1b297a ;color:white;"><th style="padding:5px;">Producto</th><th style="padding:5px;text-align:center;">Cant</th><th style="padding:5px;text-align:right;">P.Unit</th><th style="padding:5px;text-align:right;">Sub</th></tr>`;
                let totalIns = 0;
                m.insumos.forEach(i => {
                    const sub = (i.insumo_cantidad||0)*(i.insumo_precio_unitario||0);
                    totalIns += sub;
                    html += `<tr><td style="padding:5px;">${i.producto?.pro_nombre||'Producto'}</td><td style="text-align:center;">${i.insumo_cantidad}</td><td style="text-align:right;">$${parseFloat(i.insumo_precio_unitario||0).toFixed(2)}</td><td style="text-align:right;">$${sub.toFixed(2)}</td></tr>`;
                });
                html += `<tr style="font-weight:bold;background:#f8f9fa;"><td colspan="3" style="text-align:right;">Total Insumos:</td><td style="text-align:right;">$${totalIns.toFixed(2)}</td></tr></table>`;
            }

            html += `<div style="text-align:right;margin-top:15px;font-size:18px;"><strong>TOTAL: $${parseFloat(m.mantenimiento_total||0).toFixed(2)}</strong></div></div>`;

            Swal.fire({ title: `Servicio #${m.id_mantenimiento}`, html: html, width: '650px', confirmButtonText: 'Cerrar', confirmButtonColor: '#080522' });
        } catch (e) {
            Swal.fire("Error", "No se pudo cargar", "error");
        }
    };

    // ==========================================
    // EDITAR SERVICIO
    // ==========================================
    window.editarServicio = async function(id) {
        try {
            await cargarSelects();
            const res = await fetch(`${API_MANTENIMIENTO}/${id}`);
            const response = await res.json();
            const m = response.success ? response.data : response;

            document.getElementById("id_cita_input").value = m.id_cita || "";
            document.getElementById("id_cliente").value = m.id_cliente || "";
            document.getElementById("id_mecanico").value = m.id_mecanico || "";
            document.getElementById("moto_modelo").value = m.moto_modelo || "";
            document.getElementById("moto_llegada_descripcion").value = m.moto_llegada_descripcion || "";
            document.getElementById("trabajo_realizado").value = m.trabajo_realizado || "";
            document.getElementById("estado_servicio").value = m.estado_servicio || "En Proceso";

            serviciosAgregados = m.servicios?.map(s => ({
                id_servicio: s.id_servicio,
                nombre: s.servicio?.ser_nombre || 'Servicio',
                precio_aplicado: parseFloat(s.precio_aplicado || 0)
            })) || [];

            insumosAgregados = m.insumos?.map(i => ({
                id_producto: i.id_producto,
                nombre: i.producto?.pro_nombre || 'Producto',
                insumo_cantidad: i.insumo_cantidad,
                insumo_precio_unitario: parseFloat(i.insumo_precio_unitario || 0)
            })) || [];

            actualizarTotales();
            document.getElementById("formMantenimiento").dataset.editarId = id;
            document.getElementById("tituloModal").textContent = "Editar Orden de Servicio";
            document.getElementById("btnGuardarServicio").innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Orden';
            new bootstrap.Modal(document.getElementById('modalMantenimiento')).show();
        } catch (e) {
            Swal.fire("Error", "No se pudo cargar", "error");
        }
    };

    // ==========================================
    // AUTO-LLENAR DESDE CITA
    // ==========================================
    async function autoLlenarDesdeCita(id) {
        try {
            const res = await fetch(`${API_CITAS_SERV}/${id}`);
            const response = await res.json();
            let cita = response.success ? response.data : response;
            if (!cita?.id_cita) throw new Error('Formato inválido');

            const modalEl = document.getElementById("modalMantenimiento");
            new bootstrap.Modal(modalEl).show();

            modalEl.addEventListener('shown.bs.modal', function fill() {
                modalEl.removeEventListener('shown.bs.modal', fill);
                document.getElementById("id_cita_input").value = id;
                document.getElementById("id_cliente").value = cita.id_cliente || "";
                document.getElementById("id_mecanico").value = cita.id_empleado || "";
                document.getElementById("moto_llegada_descripcion").value = cita.cita_motivo || "";
                document.getElementById("estado_servicio").value = "En Proceso";
                setTimeout(() => document.getElementById("moto_modelo")?.focus(), 300);
            });

            Swal.fire({ title: 'Servicio iniciado', text: `Desde cita #${id}`, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        } catch (e) {
            Swal.fire({ title: 'Error', text: e.message, icon: 'error' });
        }
    }

    // ==========================================
    // EXPONER
    // ==========================================
    window.inicializarServicios = inicializarServicios;
    window.listarServicios = listarServicios;

    if (document.getElementById('tablaServicios')) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inicializarServicios);
        } else {
            inicializarServicios();
        }
    }

    // DESCARGAR DETALLE COMO PDF
window.descargarPDFServicio = async function(id) {
    try {
        const res = await fetch(`${API_MANTENIMIENTO}/${id}`);
        const response = await res.json();
        const m = response.success ? response.data : response;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        // Encabezado
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("JHP - Taller Mecánico", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Orden de Servicio", 105, 22, { align: "center" });
        doc.line(10, 25, 200, 25);

        // Datos generales
        doc.setFontSize(11);
        let y = 32;
        const datos = [
            ["Folio:", `#${m.id_mantenimiento}`],
            ["Fecha:", m.fecha_inicio ? new Date(m.fecha_inicio).toLocaleString() : '-'],
            ["Cliente:", m.cliente ? `${m.cliente.cli_nombre} ${m.cliente.cli_apaterno}` : 'S/D'],
            ["Mecánico:", m.mecanico ? m.mecanico.emp_nombre : 'S/D'],
            ["Modelo:", m.moto_modelo || 'N/A'],
            ["Estado:", m.estado_servicio || 'Pendiente'],
            ["Descripción:", m.moto_llegada_descripcion || '-'],
            ["Trabajo Realizado:", m.trabajo_realizado || 'Pendiente'],
        ];

        datos.forEach(([label, value]) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, 15, y);
            doc.setFont("helvetica", "normal");
            doc.text(String(value), 55, y);
            y += 7;
        });

        // Tabla de servicios (Mano de obra)
        if (m.servicios && m.servicios.length > 0) {
            y += 5;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Servicios (Mano de Obra)", 15, y);
            y += 6;

            const filasServicios = m.servicios.map(s => [
                s.servicio?.ser_nombre || 'Servicio #' + s.id_servicio,
                `$${parseFloat(s.precio_aplicado || 0).toFixed(2)}`
            ]);
            
            let totalServicios = m.servicios.reduce((sum, s) => sum + parseFloat(s.precio_aplicado || 0), 0);
            filasServicios.push(["TOTAL MANO DE OBRA", `$${totalServicios.toFixed(2)}`]);

            doc.autoTable({
                startY: y,
                head: [['Servicio', 'Precio']],
                body: filasServicios,
                theme: 'striped',
                headStyles: { fillColor: [253, 126, 20] },  //verde tabla pdf
                margin: { left: 15, right: 15 },
                styles: { fontSize: 9 }
            });
            y = doc.lastAutoTable.finalY + 5;
        }

        // Tabla de insumos
        if (m.insumos && m.insumos.length > 0) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Insumos Utilizados", 15, y);
            y += 6;

            const filasInsumos = m.insumos.map(i => {
                const sub = (i.insumo_cantidad || 0) * (i.insumo_precio_unitario || 0);
                return [
                    i.producto?.pro_nombre || 'Producto',
                    String(i.insumo_cantidad || 0),
                    `$${parseFloat(i.insumo_precio_unitario || 0).toFixed(2)}`,
                    `$${sub.toFixed(2)}`
                ];
            });

            let totalInsumos = m.insumos.reduce((sum, i) => sum + (i.insumo_cantidad || 0) * (i.insumo_precio_unitario || 0), 0);
            filasInsumos.push(["TOTAL INSUMOS", "", "", `$${totalInsumos.toFixed(2)}`]);

            doc.autoTable({
                startY: y,
                head: [['Producto', 'Cant', 'P. Unit.', 'Subtotal']],
                body: filasInsumos,
                theme: 'striped',
                headStyles: { fillColor: [13, 110, 253] }, //color moradooo sgunda tabla pdf
                margin: { left: 15, right: 15 },
                styles: { fontSize: 9 }
            });
            y = doc.lastAutoTable.finalY + 8;
        }

        // Total general
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL: $${parseFloat(m.mantenimiento_total || 0).toFixed(2)}`, 200, y, { align: "right" });

        // Pie de página
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("JHP Taller Mecánico - Orden de Servicio", 105, 285, { align: "center" });

        // Abrir PDF
        window.open(doc.output('bloburl'), '_blank');

    } catch (e) {
        console.error("Error PDF:", e);
        Swal.fire("Error", "No se pudo generar el PDF", "error");
    }
};

})();