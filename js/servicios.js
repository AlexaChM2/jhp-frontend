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
    let insumosOriginalesMap = new Map();
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
                document.getElementById("totalServiciosPendientes").textContent = 0;
                document.getElementById("totalServiciosTerminados").textContent = 0;
                document.getElementById("ingresosServicios").textContent = '$0.00';
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
                        <button onclick="window.verDetalleServicio(${m.id_mantenimiento})" title="Ver Detalle"
                            style="background:#1756b6;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-eye"></i></button>
                        <button onclick="window.editarServicio(${m.id_mantenimiento})" title="Editar"
                            style="background:#ffc107;color:#000;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-edit"></i></button>
                        <button onclick="window.descargarPDFServicio(${m.id_mantenimiento})" title="Imprimir"
                            style="background:#17791f;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-print"></i></button>
                        <button onclick="window.eliminarServicioTabla(${m.id_mantenimiento})" title="Eliminar"
                            style="background:#dc3545;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-trash"></i></button>
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
                    <button type="button" class="list-group-item list-group-item-action" onclick="window.seleccionarInsumo(${p.id_producto},'${p.pro_nombre.replace(/'/g, "\\'")}',${p.pro_precio_venta},${p.pro_stock})">
                        ${p.pro_nombre} - $${parseFloat(p.pro_precio_venta).toFixed(2)} (Stock: ${p.pro_stock})
                    </button>`).join('');
                lista.style.display = filtrados.length ? "block" : "none";
            });
    };

    window.seleccionarInsumo = function(id, nombre, precio, stock) {
        document.getElementById("buscarInsumo").value = nombre;
        document.getElementById("buscarInsumo").dataset.idProducto = id;
        document.getElementById("buscarInsumo").dataset.stock = stock;
        document.getElementById("insumo_precio").value = precio;
        document.getElementById("listaResultadosInsumos").style.display = "none";
    };

    // ==========================================
    // AGREGAR INSUMO (CON BLOQUEO DE ORIGINALES)
    // ==========================================
    window.agregarInsumo = function() {
        const idProducto = document.getElementById("buscarInsumo").dataset.idProducto;
        const nombre = document.getElementById("buscarInsumo").value;
        const cantidad = parseInt(document.getElementById("insumo_cantidad").value) || 1;
        const precio = parseFloat(document.getElementById("insumo_precio").value) || 0;
        const stock = parseInt(document.getElementById("buscarInsumo").dataset.stock) || 0;

        if (!idProducto || !nombre) return Swal.fire("Aviso", "Busca y selecciona un producto", "warning");
        if (cantidad <= 0) return Swal.fire("Aviso", "Cantidad inválida", "warning");

        const idNum = parseInt(idProducto);
        const indiceExistente = insumosAgregados.findIndex(i => i.id_producto === idNum);

        if (indiceExistente !== -1) {
            const existente = insumosAgregados[indiceExistente];
            const cantidadTotal = existente.insumo_cantidad + cantidad;

            if (cantidadTotal > stock) {
                return Swal.fire("Aviso", `Stock insuficiente. Ya tienes ${existente.insumo_cantidad}, disponible: ${stock}`, "warning");
            }

            Swal.fire({
                title: 'Producto ya agregado',
                html: `<p><strong>${nombre}</strong> ya está en la lista con <strong>${existente.insumo_cantidad} unidad(es)</strong>.</p>
                       <p>¿Agregar <strong>${cantidad}</strong> más?</p>
                       <p class="text-muted">Nuevo total: <strong>${cantidadTotal} unidad(es)</strong></p>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, agregar más',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#28a745'
            }).then((result) => {
                if (result.isConfirmed) {
                    insumosAgregados[indiceExistente].insumo_cantidad = cantidadTotal;
                    insumosAgregados[indiceExistente].modificado = true;
                    limpiarCamposInsumo();
                    actualizarTotales();
                }
            });
        } else {
            if (cantidad > stock) {
                return Swal.fire("Aviso", `Stock insuficiente. Disponible: ${stock}`, "warning");
            }

            insumosAgregados.push({
                id_producto: idNum,
                nombre: nombre,
                insumo_cantidad: cantidad,
                insumo_precio_unitario: precio,
                esOriginal: false,
                modificado: true
            });

            limpiarCamposInsumo();
            actualizarTotales();
        }
    };

    function limpiarCamposInsumo() {
        document.getElementById("buscarInsumo").value = "";
        delete document.getElementById("buscarInsumo").dataset.idProducto;
        delete document.getElementById("buscarInsumo").dataset.stock;
        document.getElementById("insumo_cantidad").value = 1;
        document.getElementById("insumo_precio").value = 0;
    }

    // ==========================================
    // ACTUALIZAR TOTALES (CON BLOQUEO VISUAL)
    // ==========================================
    function actualizarTotales() {
        const totalServicios = serviciosAgregados.reduce((s, item) => s + item.precio_aplicado, 0);
        document.getElementById("total_mano_obra").textContent = totalServicios.toFixed(2);
        
        const divServicios = document.getElementById("listaServiciosAgregados");
        if (divServicios) {
            divServicios.innerHTML = serviciosAgregados.map((s, i) => `
                <div class="d-flex justify-content-between align-items-center bg-light p-2 mb-1 rounded">
                    <span><i class="fas fa-wrench text-success me-2"></i>${s.nombre}</span>
                    <span>$${s.precio_aplicado.toFixed(2)} 
                        <button class="btn btn-sm text-danger" onclick="window.quitarServicio(${i})">✕</button></span></div>`).join('');
        }

        const totalInsumos = insumosAgregados.reduce((s, item) => s + (item.insumo_cantidad * item.insumo_precio_unitario), 0);
        document.getElementById("total_insumos").textContent = totalInsumos.toFixed(2);
        
        const divInsumos = document.getElementById("listaInsumosAgregados");
        if (divInsumos) {
            divInsumos.innerHTML = insumosAgregados.map((item, i) => {
                const esOriginal = item.esOriginal && !item.modificado;
                let botones = '';

                if (esOriginal) {
                    botones = `<span class="badge bg-warning text-dark ms-2" title="Insumo original - No modificable"><i class="fas fa-lock"></i> Original</span>`;
                } else if (item.esOriginal && item.modificado) {
                    const cantidadOriginal = insumosOriginalesMap.get(item.id_producto) || item.insumo_cantidad;
                    botones = `
                        <button class="btn btn-sm btn-outline-warning ms-1" onclick="window.restaurarCantidadServicio(${i})" title="Restaurar cantidad original (${cantidadOriginal})"><i class="fas fa-undo"></i></button>
                        <button class="btn btn-sm text-danger ms-1" onclick="window.reducirInsumoServicio(${i})" title="Reducir cantidad"><i class="fas fa-minus"></i></button>`;
                } else {
                    botones = `<button class="btn btn-sm text-danger" onclick="window.quitarInsumo(${i})" title="Eliminar insumo"><i class="fas fa-trash"></i></button>`;
                }

                const claseFila = esOriginal ? 'border border-warning' : (item.modificado ? 'border border-info' : '');

                return `
                <div class="d-flex justify-content-between align-items-center bg-light p-2 mb-1 rounded ${claseFila}">
                    <span><i class="fas fa-box text-primary me-2"></i>${item.nombre} <strong>x${item.insumo_cantidad}</strong></span>
                    <span>$${(item.insumo_cantidad * item.insumo_precio_unitario).toFixed(2)} ${botones}</span>
                </div>`;
            }).join('');
        }

        document.getElementById("total_general").textContent = (totalServicios + totalInsumos).toFixed(2);
    }

    window.quitarServicio = function(i) { serviciosAgregados.splice(i, 1); actualizarTotales(); };
    
    window.quitarInsumo = function(i) {
        const item = insumosAgregados[i];
        if (item.esOriginal && !item.modificado) {
            Swal.fire({ icon: 'warning', title: 'No se puede eliminar', text: 'Este insumo ya fue registrado.' });
            return;
        }
        insumosAgregados.splice(i, 1);
        actualizarTotales();
    };

    window.reducirInsumoServicio = function(i) {
        const item = insumosAgregados[i];
        Swal.fire({
            title: 'Reducir cantidad',
            html: `<p>Cantidad actual: <strong>${item.insumo_cantidad}</strong></p>
                   <input type="number" id="nuevaCantidadServ" class="form-control" min="1" max="${item.insumo_cantidad}" value="${item.insumo_cantidad}">`,
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            preConfirm: () => {
                const nueva = parseInt(document.getElementById('nuevaCantidadServ').value);
                if (!nueva || nueva < 1) { Swal.showValidationMessage('Cantidad inválida'); return false; }
                return nueva;
            }
        }).then((result) => {
            if (result.isConfirmed) { item.insumo_cantidad = result.value; item.modificado = true; actualizarTotales(); }
        });
    };

    window.restaurarCantidadServicio = function(i) {
        const item = insumosAgregados[i];
        const cantidadOriginal = insumosOriginalesMap.get(item.id_producto);
        if (cantidadOriginal) {
            item.insumo_cantidad = cantidadOriginal;
            item.modificado = false;
            actualizarTotales();
            Swal.fire({ icon: 'success', title: 'Restaurado', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
        }
    };

    // ==========================================
    // ELIMINAR SERVICIO (DESDE EL MODAL DE EDICIÓN)
    // ==========================================
    window.eliminarServicio = async function() {
        const idEditar = document.getElementById("formMantenimiento").dataset.editarId;
        if (!idEditar) return;

        const result = await Swal.fire({
            title: '¿Eliminar orden?',
            text: 'Se devolverá el stock de los productos utilizados.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '<i class="fas fa-trash"></i> Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {
            Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await fetch(`${API_MANTENIMIENTO}/${idEditar}`, { method: 'DELETE' });

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Orden eliminada y stock restaurado.', timer: 2000, showConfirmButton: false });
                bootstrap.Modal.getInstance(document.getElementById('modalMantenimiento'))?.hide();
                listarServicios();
            } else {
                throw new Error('Error al eliminar');
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo eliminar la orden.', 'error');
        }
    };

    // ==========================================
    // ELIMINAR SERVICIO (DESDE LA TABLA)
    // ==========================================
    window.eliminarServicioTabla = async function(id) {
        const result = await Swal.fire({
            title: '¿Eliminar orden #' + id + '?',
            text: 'Se devolverá el stock de los productos utilizados.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '<i class="fas fa-trash"></i> Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {
            Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await fetch(`${API_MANTENIMIENTO}/${id}`, { method: 'DELETE' });

            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Orden eliminada y stock restaurado.', timer: 2000, showConfirmButton: false });
                listarServicios();
            } else {
                throw new Error('Error al eliminar');
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudo eliminar la orden.', 'error');
        }
    };

    // ==========================================
    // ABRIR MODAL
    // ==========================================
    window.abrirModalServicio = function() {
        const form = document.getElementById("formMantenimiento");
        if (form) form.reset();
        
        const idCita = document.getElementById("id_cita_input");
        if (idCita) idCita.value = "";
        
        if (form) delete form.dataset.editarId;
        
        serviciosAgregados = [];
        insumosAgregados = [];
        insumosOriginalesMap = new Map();
        
        // OCULTAR botón eliminar (modo nuevo)
        const btnEliminar = document.getElementById("btnEliminarServicio");
        if (btnEliminar) btnEliminar.style.display = "none";
        
        const modalEl = document.getElementById('modalMantenimiento');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        modalEl.addEventListener('shown.bs.modal', function() {
            document.getElementById("tituloModal").textContent = "Nueva Orden de Servicio";
            document.getElementById("btnGuardarServicio").innerHTML = '<i class="fas fa-save me-2"></i>Guardar Orden';
            const trabajo = document.getElementById("trabajo_realizado");
            if (trabajo) trabajo.value = "";
            actualizarTotales();
        }, { once: true });
        
        cargarCatalogoServicios();
    };

    // ==========================================
    // GUARDAR SERVICIO (CON ANTI-DUPLICADOS)
    // ==========================================
    window.guardarServicio = async function() {
        const idEditar = document.getElementById("formMantenimiento").dataset.editarId;
        const idCita = document.getElementById("id_cita_input")?.value || null;
        const idCliente = document.getElementById("id_cliente")?.value;
        const idMecanico = document.getElementById("id_mecanico")?.value;
        const modelo = document.getElementById("moto_modelo")?.value;
        const descripcion = document.getElementById("moto_llegada_descripcion")?.value;
        const trabajoRealizado = document.getElementById("trabajo_realizado")?.value;
        const estado = document.getElementById("estado_servicio")?.value || "En Proceso";

        if (!idCliente || !idMecanico || !modelo) {
            return Swal.fire("Aviso", "Cliente, Mecánico y Modelo son obligatorios", "warning");
        }

        const insumosUnicos = [];
        const mapaInsumos = new Map();
        for (const item of insumosAgregados) {
            if (mapaInsumos.has(item.id_producto)) {
                mapaInsumos.get(item.id_producto).insumo_cantidad += item.insumo_cantidad;
            } else {
                mapaInsumos.set(item.id_producto, {
                    id_producto: item.id_producto,
                    insumo_cantidad: item.insumo_cantidad,
                    insumo_precio_unitario: item.insumo_precio_unitario
                });
            }
        }
        for (const [id, insumo] of mapaInsumos) { insumosUnicos.push(insumo); }

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
            insumos: insumosUnicos
        };

        try {
            Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

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
                        method: 'PUT', headers: { "Content-Type": "application/json" },
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
            const estadoColor = m.estado_servicio === 'Terminado' || m.estado_servicio === 'Entregado' ? '#28a745' : m.estado_servicio === 'En Proceso' ? '#117483' : '#ffc107';

            let html = `<div style="font-size:14px;"><table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
                <tr><td style="padding:5px;font-weight:bold;width:35%;">Folio:</td><td>#${m.id_mantenimiento}</td></tr>
                <tr><td style="padding:5px;font-weight:bold;">Cliente:</td><td>${m.cliente ? m.cliente.cli_nombre+' '+m.cliente.cli_apaterno : 'S/D'}</td></tr>
                <tr><td style="padding:5px;font-weight:bold;">Mecánico:</td><td>${m.mecanico ? m.mecanico.emp_nombre : 'S/D'}</td></tr>
                <tr><td style="padding:5px;font-weight:bold;">Modelo:</td><td>${m.moto_modelo||'N/A'}</td></tr>
                <tr><td style="padding:5px;font-weight:bold;">Estado:</td><td><span style="background:${estadoColor};color:white;padding:3px 10px;border-radius:12px;">${m.estado_servicio||'Pendiente'}</span></td></tr>
            </table>`;

            if (m.servicios?.length > 0) {
                html += `<hr><strong> Mano de Obra:</strong><table style="width:100%;font-size:12px;margin-top:5px;">`;
                let totalServ = 0;
                m.servicios.forEach(s => { totalServ += parseFloat(s.precio_aplicado||0); html += `<tr><td>${s.servicio?.ser_nombre||'Servicio'}</td><td style="text-align:right;">$${parseFloat(s.precio_aplicado||0).toFixed(2)}</td></tr>`; });
                html += `<tr style="font-weight:bold;background:#f8f9fa;"><td style="text-align:right;">Total:</td><td style="text-align:right;">$${totalServ.toFixed(2)}</td></tr></table>`;
            }

            if (m.insumos?.length > 0) {
                html += `<br><strong>Insumos:</strong><table style="width:100%;font-size:12px;margin-top:5px;">`;
                let totalIns = 0;
                m.insumos.forEach(i => { const sub = (i.insumo_cantidad||0)*(i.insumo_precio_unitario||0); totalIns += sub; html += `<tr><td>${i.producto?.pro_nombre||'Producto'}</td><td style="text-align:center;">${i.insumo_cantidad}</td><td style="text-align:right;">$${parseFloat(i.insumo_precio_unitario||0).toFixed(2)}</td><td style="text-align:right;">$${sub.toFixed(2)}</td></tr>`; });
                html += `<tr style="font-weight:bold;background:#f8f9fa;"><td colspan="3" style="text-align:right;">Total:</td><td style="text-align:right;">$${totalIns.toFixed(2)}</td></tr></table>`;
            }

            html += `<div style="text-align:right;margin-top:15px;font-size:18px;"><strong>TOTAL: $${parseFloat(m.mantenimiento_total||0).toFixed(2)}</strong></div></div>`;
            Swal.fire({ title: `Servicio #${m.id_mantenimiento}`, html: html, width: '650px', confirmButtonColor: '#080522' });
        } catch (e) { Swal.fire("Error", "No se pudo cargar", "error"); }
    };

    // ==========================================
    // EDITAR SERVICIO (CON BLOQUEO DE ORIGINALES)
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
                id_servicio: s.id_servicio, nombre: s.servicio?.ser_nombre || 'Servicio', precio_aplicado: parseFloat(s.precio_aplicado || 0)
            })) || [];

            insumosAgregados = m.insumos?.map(i => ({
                id_producto: i.id_producto, nombre: i.producto?.pro_nombre || 'Producto',
                insumo_cantidad: i.insumo_cantidad, insumo_precio_unitario: parseFloat(i.insumo_precio_unitario || 0),
                esOriginal: true, modificado: false
            })) || [];

            insumosOriginalesMap = new Map();
            insumosAgregados.forEach(item => { insumosOriginalesMap.set(item.id_producto, item.insumo_cantidad); });

            actualizarTotales();
            document.getElementById("formMantenimiento").dataset.editarId = id;
            document.getElementById("tituloModal").textContent = "Editar Orden de Servicio";
            document.getElementById("btnGuardarServicio").innerHTML = '<i class="fas fa-save me-2"></i>Actualizar Orden';
            
            // MOSTRAR botón eliminar (modo edición)
            const btnEliminar = document.getElementById("btnEliminarServicio");
            if (btnEliminar) btnEliminar.style.display = "block";
            
            new bootstrap.Modal(document.getElementById('modalMantenimiento')).show();
        } catch (e) { Swal.fire("Error", "No se pudo cargar", "error"); }
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
        } catch (e) { Swal.fire({ title: 'Error', text: e.message, icon: 'error' }); }
    }

    // ==========================================
    // DESCARGAR PDF
    // ==========================================
    window.descargarPDFServicio = async function(id) {
        try {
            const jsPDFLib = await asegurarLibreriasPDF();
            if (!jsPDFLib) throw new Error('No se pudo cargar jsPDF');
            const res = await fetch(`${API_MANTENIMIENTO}/${id}`);
            const response = await res.json();
            const m = response.success ? response.data : response;
            const doc = new jsPDFLib({ unit: 'mm', format: 'a4' });
            
            doc.setFontSize(16); doc.setFont("helvetica", "bold");
            doc.text("JHP - Taller Mecánico", 105, 15, { align: "center" });
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.text("Orden de Servicio", 105, 22, { align: "center" });
            doc.line(10, 25, 200, 25);
            
            let y = 32;
            y = addPDFLine(doc, "Folio:", `#${m.id_mantenimiento}`, y);
            y = addPDFLine(doc, "Fecha:", formatearFecha(m.fecha_inicio), y);
            y = addPDFLine(doc, "Cliente:", m.cliente ? `${m.cliente.cli_nombre} ${m.cliente.cli_apaterno}` : 'S/D', y);
            y = addPDFLine(doc, "Mecánico:", m.mecanico ? m.mecanico.emp_nombre : 'S/D', y);
            y = addPDFLine(doc, "Modelo:", m.moto_modelo || 'N/A', y);
            y = addPDFLine(doc, "Estado:", m.estado_servicio || 'Pendiente', y);
            y = addPDFLine(doc, "Descripción:", m.moto_llegada_descripcion || '-', y);
            y = addPDFLine(doc, "Trabajo Realizado:", m.trabajo_realizado || 'Pendiente', y);
            
            if (m.servicios?.length > 0) {
                y += 5; doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Servicios", 15, y); y += 6;
                const filas = m.servicios.map(s => [s.servicio?.ser_nombre || 'Servicio', `$${parseFloat(s.precio_aplicado||0).toFixed(2)}`]);
                const total = m.servicios.reduce((sum, s) => sum + parseFloat(s.precio_aplicado||0), 0);
                filas.push(["TOTAL MANO DE OBRA", `$${total.toFixed(2)}`]);
                if (typeof doc.autoTable === 'function') { doc.autoTable({ startY: y, head: [['Servicio', 'Precio']], body: filas, theme: 'striped', headStyles: { fillColor: [253, 126, 20] }, margin: { left: 15, right: 15 }, styles: { fontSize: 9 } }); y = doc.lastAutoTable.finalY + 5; }
            }
            
            if (m.insumos?.length > 0) {
                doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Insumos", 15, y); y += 6;
                const filas = m.insumos.map(i => { const sub = (i.insumo_cantidad||0)*(i.insumo_precio_unitario||0); return [i.producto?.pro_nombre||'Producto', String(i.insumo_cantidad||0), `$${parseFloat(i.insumo_precio_unitario||0).toFixed(2)}`, `$${sub.toFixed(2)}`]; });
                const total = m.insumos.reduce((sum, i) => sum + (i.insumo_cantidad||0)*(i.insumo_precio_unitario||0), 0);
                filas.push(["TOTAL INSUMOS", "", "", `$${total.toFixed(2)}`]);
                if (typeof doc.autoTable === 'function') { doc.autoTable({ startY: y, head: [['Producto', 'Cant', 'P.Unit', 'Subtotal']], body: filas, theme: 'striped', headStyles: { fillColor: [13, 110, 253] }, margin: { left: 15, right: 15 }, styles: { fontSize: 9 } }); y = doc.lastAutoTable.finalY + 8; }
            }
            
            doc.setFontSize(14); doc.setFont("helvetica", "bold");
            doc.text(`TOTAL: $${parseFloat(m.mantenimiento_total||0).toFixed(2)}`, 190, y, { align: "right" });
            doc.setFontSize(8); doc.text("JHP Taller Mecánico - Orden de Servicio", 105, 285, { align: "center" });
            window.open(URL.createObjectURL(doc.output('blob')), '_blank');
        } catch (e) { console.error('Error PDF:', e); Swal.fire("Error", "No se pudo generar el PDF", "error"); }
    };

    // ==========================================
    // EXPONER E INICIALIZAR
    // ==========================================
    window.inicializarServicios = inicializarServicios;
    window.listarServicios = listarServicios;

    if (document.getElementById('tablaServicios')) { inicializarServicios(); }

    document.addEventListener('vista-cargada', function(e) {
        if (e.detail?.vista && (e.detail.vista.includes('servicio') || e.detail.vista.includes('Servicio'))) {
            inicializado = false;
            setTimeout(inicializarServicios, 300);
        }
    });
})();