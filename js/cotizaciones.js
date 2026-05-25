const API_COT = "https://jhpapi-production.up.railway.app/api/cotizaciones";
const API_CLI_COT = "https://jhpapi-production.up.railway.app/api/clientes";
const API_PROD_COT = "https://jhpapi-production.up.railway.app/api/producto";
const API_VENTAS_COT = "https://jhpapi-production.up.railway.app/api/ventas";
const API_CAJA = "https://jhpapi-production.up.railway.app/api/control_caja";

let carritoCot = [];
let clienteIdCot = null;
let prodSeleccionadoCot = null;
let editandoCotId = null;
let todasLasCotizaciones = [];
let cotizacionesIniciadas = false;

// ========== AUTO-INICIALIZACIÓN SIMPLIFICADA ==========
(function() {
    // Escuchar el evento de app.js
    document.addEventListener('vista-cargada', function(e) {
        if (e.detail && e.detail.vista && 
            (e.detail.vista.includes('cotizacion') || e.detail.vista.includes('Cotizacion'))) {
            console.log('📋 Cotizaciones: Vista detectada, iniciando...');
            cotizacionesIniciadas = false;
            setTimeout(initCotizaciones, 500);
        }
    });
    
    // Verificar si ya estamos en cotizaciones
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const tabla = document.getElementById('tablaCotizaciones');
        if (tabla) {
            console.log('📋 Cotizaciones: Ya en vista, iniciando...');
            setTimeout(initCotizaciones, 300);
        }
    }
})();

function initCotizaciones() {
    console.log("📋 Inicializando cotizaciones...");
    cargarClientesSelect();
    listarCotizaciones();
    cotizacionesIniciadas = true;
}

function cargarClientesSelect() {
    const selectCliente = document.getElementById('filtroClienteCot');
    if (!selectCliente) return;

    fetch(API_CLI_COT) 
        .then(res => res.json())
        .then(response => {
            const clientes = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(clientes) ? clientes : [];

            selectCliente.innerHTML = '<option value="">Todos los clientes</option>';
            datos.forEach(c => {
                const nombre = `${c.cli_nombre || ''} ${c.cli_apaterno || ''}`.trim();
                selectCliente.innerHTML += `<option value="${c.id_cliente}">${nombre || 'Sin nombre'}</option>`;
            });
        })
        .catch(err => console.error("Error al cargar clientes:", err));
}

function listarCotizaciones() {
    const tbody = document.getElementById("tablaCotizaciones");
    if (!tbody) {
        console.warn('📋 Tabla de cotizaciones no encontrada');
        return;
    }

    console.log('📋 Cargando cotizaciones...');

    fetch(API_COT)
        .then(res => res.json())
        .then(response => {
            const data = response.success ? (response.data?.data || response.data) : response;
            const cotizaciones = Array.isArray(data) ? data : [];
            
            todasLasCotizaciones = cotizaciones;
            console.log(`✅ ${cotizaciones.length} cotizaciones cargadas`);
            renderizarCotizaciones(cotizaciones);
        })
        .catch(err => console.error("❌ Error al listar:", err));
}

function renderizarCotizaciones(cotizaciones) {
    const tbody = document.getElementById("tablaCotizaciones");
    if (!tbody) return;

    if (cotizaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3">No hay cotizaciones registradas</td></tr>';
        return;
    }

    tbody.innerHTML = cotizaciones.map(c => {
        const nombreCliente = c.cliente 
            ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim()
            : (c.cli_nombre ? `${c.cli_nombre} ${c.cli_apaterno}` : 'Público General');

        const vigencia = c.cot_vigencia_dias || 15;
        const fechaCot = new Date(c.cot_fecha);
        const fechaVenc = new Date(fechaCot);
        fechaVenc.setDate(fechaVenc.getDate() + vigencia);
        const hoy = new Date();
        const vencida = hoy > fechaVenc;
        const porVencer = !vencida && (fechaVenc - hoy) < (3 * 24 * 60 * 60 * 1000);

        const descripcionProductos = (c.detalles && c.detalles.length > 0) 
            ? c.detalles.map(d => {
                const nombreP = d.producto ? d.producto.pro_nombre : (d.pro_nombre || 'Producto');
                return `<span class="badge bg-info text-dark me-1 mb-1">${d.det_cantidad || d.cantidad || 0}x ${nombreP}</span>`;
            }).join('')
            : '<span class="text-muted small">Sin productos</span>';

        let vigenciaBadge = '';
        if (vencida) {
            vigenciaBadge = '<span class="badge bg-danger">VENCIDA</span>';
        } else if (porVencer) {
            vigenciaBadge = '<span class="badge bg-warning text-dark">Por vencer</span>';
        } else {
            vigenciaBadge = '<span class="badge bg-success">Vigente</span>';
        }

        return `
        <tr>
            <td><strong>#${c.id_cotizacion}</strong></td>
            <td>${fechaCot.toLocaleDateString('es-MX')}</td>
            <td>${nombreCliente || 'Público General'}</td>
            <td><div style="max-width:300px;">${descripcionProductos}</div></td>
            <td class="text-center">
                ${vigenciaBadge}<br>
                <small class="text-muted">${vigencia} días</small><br>
                <small>Vence: ${fechaVenc.toLocaleDateString('es-MX')}</small>
            </td>
            <td class="text-end fw-bold">$${parseFloat(c.cot_total || 0).toFixed(2)}</td>
            <td class="text-center">
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-outline-info" onclick="imprimirCot(${c.id_cotizacion})" title="Imprimir">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarCotizacion(${c.id_cotizacion})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="convertirAVenta(${c.id_cotizacion})" title="Convertir a Venta">
                        <i class="fas fa-cart-shopping"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarCotizacion(${c.id_cotizacion})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function filtrarPorCliente() {
    const select = document.getElementById('filtroClienteCot');
    const inputBuscar = document.getElementById('inputBuscarCot');
    
    const clienteId = select ? select.value : '';
    const texto = inputBuscar ? inputBuscar.value.toLowerCase().trim() : '';

    let filtradas = todasLasCotizaciones;

    if (clienteId !== '') {
        filtradas = filtradas.filter(c => c.id_cliente == clienteId);
    }

    if (texto !== '') {
        filtradas = filtradas.filter(c => {
            const nombreCliente = c.cliente 
                ? `${c.cliente.cli_nombre} ${c.cliente.cli_apaterno}`.toLowerCase()
                : '';
            return c.id_cotizacion.toString().includes(texto) || nombreCliente.includes(texto);
        });
    }

    renderizarCotizaciones(filtradas);
}

function buscarClienteCot(v) {
    const lista = document.getElementById("resCliCot");
    if (!lista) return;
    if (v.length < 2) { lista.style.display = "none"; return; }

    fetch(API_CLI_COT) // ✅ CORREGIDO
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
                    onclick="seleccionarClienteCot(${c.id_cliente}, '${nombre.replace(/'/g, "\\'")}')">
                    ${nombre || 'Sin nombre'}</button>`;
            }).join('');
            lista.style.display = filtrados.length > 0 ? "block" : "none";
        });
}

function seleccionarClienteCot(id, nombre) {
    clienteIdCot = id;
    document.getElementById("busCliCot").value = nombre;
    document.getElementById("resCliCot").style.display = "none";
}

function buscarProductoCot(v) {
    const lista = document.getElementById("resProdCot");
    if (!lista) return;
    if (v.length < 2) { lista.style.display = "none"; return; }

    fetch(API_PROD_COT)
        .then(res => res.json())
        .then(response => {
            console.log('📦 Respuesta API productos:', response); // Debug
            
            // Intentar múltiples formas de extraer los datos
            let productos = [];
            if (response.success) {
                productos = response.data?.data || response.data || [];
            } else if (Array.isArray(response)) {
                productos = response;
            } else if (response.data) {
                productos = Array.isArray(response.data) ? response.data : (response.data.data || []);
            }
            
            console.log('📦 Productos extraídos:', productos); // Debug
            
            const filtrados = productos.filter(p => 
                p.pro_nombre && p.pro_nombre.toLowerCase().includes(v.toLowerCase())
            );
            
            lista.innerHTML = filtrados.map(p => {
                // ✅ Intentar obtener el precio de diferentes campos posibles
                const precio = p.pro_precio || p.pro_precio_venta || p.precio || 0;
                console.log(`📦 ${p.pro_nombre}: precio=${precio}`, p); // Debug
                
                return `<button type="button" class="list-group-item list-group-item-action" 
                    onclick="seleccionarProdCot(${p.id_producto}, '${(p.pro_nombre || '').replace(/'/g, "\\'")}', ${precio})">
                    ${p.pro_nombre || 'Sin nombre'} - $${parseFloat(precio).toFixed(2)}
                </button>`;
            }).join('');
            
            lista.style.display = filtrados.length > 0 ? "block" : "none";
        })
        .catch(err => console.error("❌ Error al buscar productos:", err));
}

function seleccionarProdCot(id, nombre, precio) {
    console.log('🔍 seleccionarProdCot recibido:', { id, nombre, precio, tipoPrecio: typeof precio });
    
    // ✅ Convertir precio a número, con múltiples fallbacks
    const precioNumerico = parseFloat(precio) || 0;
    
    prodSeleccionadoCot = { 
        id_producto: id, 
        nombre: nombre, 
        precio: precioNumerico
    };
    
    console.log('✅ prodSeleccionadoCot guardado:', prodSeleccionadoCot);
    
    document.getElementById("busProdCot").value = nombre;
    document.getElementById("resProdCot").style.display = "none";
}

function agregarItemCot() {
    console.log('➕ Agregando item, prodSeleccionadoCot:', prodSeleccionadoCot);
    
    if (!prodSeleccionadoCot) {
        return Swal.fire("Aviso", "Selecciona un producto primero", "warning");
    }
    
    const cantidad = parseInt(document.getElementById("cantidadProdCot").value) || 1;
    
    console.log(`➕ Cantidad: ${cantidad}, Precio: ${prodSeleccionadoCot.precio}`);
    
    const itemExistente = carritoCot.find(item => item.id_producto === prodSeleccionadoCot.id_producto);
    if (itemExistente) {
        itemExistente.cantidad += cantidad;
        itemExistente.subtotal = itemExistente.cantidad * itemExistente.precio;
        console.log('🔄 Item actualizado:', itemExistente);
    } else {
        const nuevoItem = {
            id_producto: prodSeleccionadoCot.id_producto,
            nombre: prodSeleccionadoCot.nombre,
            precio: prodSeleccionadoCot.precio,
            cantidad: cantidad,
            subtotal: cantidad * prodSeleccionadoCot.precio
        };
        carritoCot.push(nuevoItem);
        console.log('➕ Nuevo item:', nuevoItem);
    }
    
    actualizarTablaTemporal();
    document.getElementById("busProdCot").value = '';
    document.getElementById("cantidadProdCot").value = '1';
    prodSeleccionadoCot = null;
}

function actualizarTablaTemporal() {
    const tbody = document.querySelector("#tablaTempCot tbody");
    const totalSpan = document.getElementById("totalCot");
    
    console.log('🔄 Actualizando tabla temporal, carrito:', carritoCot);
    
    if (!tbody) {
        console.error('❌ No se encontró #tablaTempCot tbody');
        return;
    }

    if (carritoCot.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin productos</td></tr>';
        if (totalSpan) totalSpan.innerText = '0.00';
        return;
    }

    let total = 0;
    tbody.innerHTML = carritoCot.map((item, i) => {
        const subtotal = item.cantidad * item.precio;
        item.subtotal = subtotal; // Actualizar subtotal
        total += subtotal;
        
        console.log(`📊 Item ${i}: ${item.nombre} - Cant:${item.cantidad} Precio:${item.precio} Subtotal:${subtotal}`);
        
        return `
        <tr>
            <td>${item.nombre}</td>
            <td>$${item.precio.toFixed(2)}</td>
            <td>${item.cantidad}</td>
            <td>$${subtotal.toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" onclick="quitarItemCot(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    if (totalSpan) totalSpan.innerText = total.toFixed(2);
    console.log(`💰 Total: $${total.toFixed(2)}`);
}
function seleccionarProdCot(id, nombre, precio) {
    console.log('🔍 seleccionarProdCot:', { id, nombre, precio, tipo: typeof precio });
    prodSeleccionadoCot = { 
        id_producto: id, 
        nombre: nombre, 
        precio: parseFloat(precio) || 0  
    };
    document.getElementById("busProdCot").value = nombre;
    document.getElementById("resProdCot").style.display = "none";
    console.log('✅ prodSeleccionadoCot:', prodSeleccionadoCot);
}

function agregarItemCot() {
    if (!prodSeleccionadoCot) {
        return Swal.fire("Aviso", "Selecciona un producto primero", "warning");
    }
    
    const cantidad = parseInt(document.getElementById("cantidadProdCot").value) || 1;
    
    const itemExistente = carritoCot.find(item => item.id_producto === prodSeleccionadoCot.id_producto);
    if (itemExistente) {
        itemExistente.cantidad += cantidad;
        itemExistente.subtotal = itemExistente.cantidad * itemExistente.precio;
    } else {
        carritoCot.push({
            id_producto: prodSeleccionadoCot.id_producto,
            nombre: prodSeleccionadoCot.nombre,
            precio: prodSeleccionadoCot.precio,
            cantidad: cantidad,
            subtotal: cantidad * prodSeleccionadoCot.precio
        });
    }
    
    actualizarTablaTemporal();
    document.getElementById("busProdCot").value = '';
    document.getElementById("cantidadProdCot").value = '1';
    prodSeleccionadoCot = null;
}

function actualizarTablaTemporal() {
    const tbody = document.getElementById("tablaTempCot");
    const totalSpan = document.getElementById("totalCot");
    if (!tbody) return;

    if (carritoCot.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin productos</td></tr>';
        if (totalSpan) totalSpan.innerText = '0.00';
        return;
    }

    let total = 0;
    tbody.innerHTML = carritoCot.map((item, i) => {
        total += item.subtotal;
        return `
        <tr>
            <td>${item.nombre}</td>
            <td>$${item.precio.toFixed(2)}</td>
            <td>${item.cantidad}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="quitarItemCot(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    if (totalSpan) totalSpan.innerText = total.toFixed(2);
}

function quitarItemCot(i) {
    carritoCot.splice(i, 1);
    actualizarTablaTemporal();
}

function abrirModalCot() {
    document.getElementById("modalCotizacion").style.display = "flex";
    if (!editandoCotId) {
        const titulo = document.querySelector("#modalCotizacion .modal-title");
        if (titulo) titulo.innerText = "Nueva Cotización";
    }
}

function cerrarModalCot() {
    document.getElementById("modalCotizacion").style.display = "none";
    document.getElementById("formCotizacion").reset();
    editandoCotId = null;
    clienteIdCot = null;
    prodSeleccionadoCot = null;
    carritoCot = [];
    actualizarTablaTemporal();
}

function editarCotizacion(id) {
    fetch(`${API_COT}/${id}`)
        .then(res => res.json())
        .then(response => {
            const c = response.success ? response.data : response;
            
            editandoCotId = id;
            clienteIdCot = c.id_cliente;

            const nombreCliente = c.cliente 
                ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim()
                : 'Cliente';
            
            document.getElementById("busCliCot").value = nombreCliente;
            document.getElementById("cot_vigencia").value = c.cot_vigencia_dias || 15;

            if (c.detalles && Array.isArray(c.detalles)) {
                carritoCot = c.detalles.map(d => ({
                    id_producto: d.id_producto,
                    nombre: d.producto ? d.producto.pro_nombre : (d.pro_nombre || 'Producto'),
                    precio: parseFloat(d.det_precio_unitario || d.precio || 0),
                    cantidad: parseInt(d.det_cantidad || d.cantidad || 1),
                    subtotal: (d.det_cantidad || d.cantidad || 1) * (d.det_precio_unitario || d.precio || 0)
                }));
            } else {
                carritoCot = [];
            }

            actualizarTablaTemporal();
            abrirModalCot();

            const titulo = document.querySelector("#modalCotizacion .modal-title");
            if (titulo) titulo.innerText = "Editar Cotización #" + id;
        })
        .catch(err => {
            console.error(err);
            Swal.fire("Error", "No se pudieron cargar los datos", "error");
        });
}

function guardarCotizacion() {
    if (!clienteIdCot || carritoCot.length === 0) {
        return Swal.fire("Aviso", "Debes seleccionar un cliente y al menos un producto", "warning");
    }

    const vigencia = parseInt(document.getElementById("cot_vigencia").value) || 15;

    const data = {
        id_cliente: clienteIdCot,
        id_empleado: parseInt(localStorage.getItem('usuario_id')) || 1,
        cot_vigencia_dias: vigencia,
        cot_total: parseFloat(document.getElementById("totalCot").innerText) || 0,
        detalles: carritoCot.map(item => ({
            id_producto: item.id_producto,
            det_cantidad: item.cantidad,
            det_precio_unitario: item.precio
        }))
    };

    const url = editandoCotId ? `${API_COT}/${editandoCotId}` : API_COT;
    const metodo = editandoCotId ? "PUT" : "POST";

    fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
    })
    .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Error en servidor");
        return json;
    })
    .then(() => {
        Swal.fire({ icon: 'success', title: '¡Éxito!', text: editandoCotId ? 'Cotización actualizada' : 'Cotización creada', timer: 1500, showConfirmButton: false });
        cerrarModalCot();
        listarCotizaciones();
    })
    .catch(err => {
        console.error(err);
        Swal.fire("Error", err.message, "error");
    });
}

function eliminarCotizacion(id) {
    Swal.fire({
        title: '¿Eliminar cotización?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${API_COT}/${id}`, { method: 'DELETE' })
                .then(() => {
                    Swal.fire('Eliminada', '', 'success');
                    listarCotizaciones();
                });
        }
    });
}

function imprimirCot(id) {
    fetch(`${API_COT}/${id}`)
        .then(res => res.json())
        .then(response => {
            const cot = response.success ? response.data : response;
            const nombreCliente = cot.cliente 
                ? `${cot.cliente.cli_nombre || ''} ${cot.cliente.cli_apaterno || ''}`.trim()
                : 'Público General';
            
            let detalleHTML = '';
            if (cot.detalles && cot.detalles.length > 0) {
                detalleHTML = cot.detalles.map(d => {
                    const nombreP = d.producto ? d.producto.pro_nombre : (d.pro_nombre || 'Producto');
                    const precio = d.det_precio_unitario || d.precio || 0;
                    const cantidad = d.det_cantidad || d.cantidad || 0;
                    const subtotal = precio * cantidad;
                    return `
                        <tr>
                            <td>${nombreP}</td>
                            <td>$${parseFloat(precio).toFixed(2)}</td>
                            <td>${cantidad}</td>
                            <td>$${subtotal.toFixed(2)}</td>
                        </tr>`;
                }).join('');
            }

            const ventana = window.open('', 'Cotizacion', 'width=800,height=600');
            ventana.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Cotización #${cot.id_cotizacion}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                </head>
                <body class="p-4">
                    <div class="text-center mb-4">
                        <h2>COTIZACIÓN #${cot.id_cotizacion}</h2>
                        <p class="text-muted">Fecha: ${new Date(cot.cot_fecha).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div class="mb-4">
                        <strong>Cliente:</strong> ${nombreCliente}<br>
                        <strong>Vigencia:</strong> ${cot.cot_vigencia_dias || 15} días<br>
                        <strong>Vence:</strong> ${new Date(new Date(cot.cot_fecha).setDate(new Date(cot.cot_fecha).getDate() + (cot.cot_vigencia_dias || 15))).toLocaleDateString('es-MX')}
                    </div>
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Precio</th>
                                <th>Cantidad</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalleHTML || '<tr><td colspan="4" class="text-center">Sin productos</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="3" class="text-end">TOTAL:</th>
                                <th>$${parseFloat(cot.cot_total || 0).toFixed(2)}</th>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="text-center mt-4">
                        <button class="btn btn-primary" onclick="window.print()">Imprimir</button>
                    </div>
                </body>
                </html>
            `);
        });
}

async function convertirAVenta(id) {
    try {
        const resCot = await fetch(`${API_COT}/${id}`);
        const dataCot = await resCot.json();
        const cotizacion = dataCot.success ? dataCot.data : dataCot;

        // Verificar caja abierta
        const cajaValida = await obtenerCajaValida();
        if (!cajaValida) {
            const abrir = await Swal.fire({
                title: 'No hay caja abierta',
                text: '¿Deseas abrir una caja rápida?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Abrir caja',
                cancelButtonText: 'Cancelar'
            });
            if (abrir.isConfirmed) {
                await abrirCajaRapida();
                setTimeout(() => convertirAVenta(id), 500);
            }
            return;
        }

        mostrarDialogoPago(cotizacion, cajaValida.id_caja || cajaValida.id);
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo convertir la cotización', 'error');
    }
}

async function obtenerCajaValida() {
    try {
        const res = await fetch(API_CAJA);
        const data = await res.json();
        const cajas = data.success ? (data.data?.data || data.data) : data;
        const lista = Array.isArray(cajas) ? cajas : [];
        return lista.find(c => c.caja_estado === 'Abierta' || c.estado === 'Abierta');
    } catch {
        return null;
    }
}

async function abrirCajaRapida() {
    try {
        await fetch(API_CAJA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                caja_monto_inicial: 0,
                caja_estado: 'Abierta',
                id_empleado: parseInt(localStorage.getItem('usuario_id')) || 1
            })
        });
    } catch (error) {
        console.error('Error al abrir caja:', error);
    }
}

async function mostrarDialogoPago(cotizacion, idCaja) {
    const { value: tipoPago } = await Swal.fire({
        title: 'Convertir a Venta',
        text: `Total: $${parseFloat(cotizacion.cot_total).toFixed(2)}`,
        input: 'select',
        inputOptions: {
            'Efectivo': 'Efectivo',
            'Tarjeta': 'Tarjeta',
            'Transferencia': 'Transferencia'
        },
        inputPlaceholder: 'Selecciona método de pago',
        showCancelButton: true
    });

    if (tipoPago) {
        await crearVentaDesdeCotizacion(cotizacion, idCaja, tipoPago);
    }
}

async function crearVentaDesdeCotizacion(cotizacion, idCaja, tipoPago) {
    try {
        const ventaData = {
            id_cliente: cotizacion.id_cliente,
            id_empleado: parseInt(localStorage.getItem('usuario_id')) || 1,
            id_caja: idCaja,
            ven_total: cotizacion.cot_total,
            tipo_pago: tipoPago,  // ✅ "tipo_pago" (no ven_tipo_pago)
            detalles: cotizacion.detalles.map(d => ({
                id_producto: d.id_producto,
                cantidad: d.det_cantidad || d.cantidad || 1,  // ✅ "cantidad" (no det_cantidad)
                precio: d.det_precio_unitario || d.precio || 0  // ✅ "precio" (no det_precio_unitario)
            }))
        };

        console.log('📤 Enviando venta:', JSON.stringify(ventaData, null, 2));

        const res = await fetch(API_VENTAS_COT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(ventaData)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error al crear venta');

        Swal.fire({ icon: 'success', title: '¡Venta creada!', timer: 1500, showConfirmButton: false });
        listarCotizaciones();
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', error.message, 'error');
    }
}

// Exponer globalmente
window.initCotizaciones = initCotizaciones;
window.listarCotizaciones = listarCotizaciones;
window.editarCotizacion = editarCotizacion;
window.guardarCotizacion = guardarCotizacion;
window.imprimirCot = imprimirCot;
window.convertirAVenta = convertirAVenta;
window.buscarClienteCot = buscarClienteCot;
window.seleccionarClienteCot = seleccionarClienteCot;
window.buscarProductoCot = buscarProductoCot;
window.seleccionarProdCot = seleccionarProdCot;
window.agregarItemCot = agregarItemCot;
window.quitarItemCot = quitarItemCot;
window.eliminarCotizacion = eliminarCotizacion;
window.abrirModalCot = abrirModalCot;
window.cerrarModalCot = cerrarModalCot;
window.filtrarPorCliente = filtrarPorCliente;
window.buscarCotizaciones = function() { filtrarPorCliente(); };