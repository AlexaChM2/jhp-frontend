
const API_COT = "http://localhost:8000/api/cotizaciones";
const API_CLI = "http://localhost:8000/api/clientes";
const API_PROD = "http://localhost:8000/api/producto";
const API_VENTAS = "http://localhost:8000/api/ventas";
const API_CAJA = "http://localhost:8000/api/control_caja"; 

let carritoCot = [];
let clienteIdCot = null;
let prodSeleccionadoCot = null;
let editandoCotId = null;
let todasLasCotizaciones = []; // Cache para busquedas


(function() {
    if (!document.getElementById('tablaCotizaciones') && !document.querySelector('.cotizaciones-container')) {
        console.log("No es la vista de cotizaciones");
        return;
    }
    console.log("🚀 Inicializando cotizaciones.js");
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCotizaciones);
    } else {
        initCotizaciones();
    }
})();

function initCotizaciones() {
    cargarClientesSelect();
    listarCotizaciones();
}


function cargarClientesSelect() {
    const selectCliente = document.getElementById('filtroClienteCot');
    if (!selectCliente) return;

    fetch(API_CLI)
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
    fetch(API_COT)
        .then(res => res.json())
        .then(response => {
            const data = response.success ? (response.data?.data || response.data) : response;
            const cotizaciones = Array.isArray(data) ? data : [];
            
            // Guardar en cache
            todasLasCotizaciones = cotizaciones;
            
            renderizarCotizaciones(cotizaciones);
        })
        .catch(err => console.error("Error al listar:", err));
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
        const porVencer = !vencida && (fechaVenc - hoy) < (3 * 24 * 60 * 60 * 1000); // 3 días

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


// BuSQUEDA POR CLIENTE

function filtrarPorCliente() {
    const select = document.getElementById('filtroClienteCot');
    const inputBuscar = document.getElementById('inputBuscarCot');
    
    const clienteId = select ? select.value : '';
    const texto = inputBuscar ? inputBuscar.value.toLowerCase().trim() : '';

    let filtradas = todasLasCotizaciones;

    // Filtrar por cliente
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


window.filtrarPorCliente = filtrarPorCliente;
window.buscarCotizaciones = function() {
    filtrarPorCliente();
};


function editarCotizacion(id) {
    fetch(`${API_COT}/${id}`)
        .then(res => res.json())
        .then(response => {
            const c = response.success ? response.data : response;
            
            editandoCotId = id;
            clienteIdCot = c.id_cliente;

            // Llenar 
            const nombreCliente = c.cliente 
                ? `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim()
                : 'Cliente';
            
            document.getElementById("busCliCot").value = nombreCliente;
            document.getElementById("cot_vigencia").value = c.cot_vigencia_dias || 15;

            // Cargar 
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


// GUARDAR 
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

    console.log(`💾 Guardando: ${metodo} ${url}`, data);

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
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: editandoCotId ? 'Cotización actualizada' : 'Cotización creada',
            timer: 1500,
            showConfirmButton: false
        });
        cerrarModalCot();
        listarCotizaciones();
    })
    .catch(err => {
        console.error(err);
        Swal.fire("Error", err.message, "error");
    });
}


// IMPRIMIR 

function imprimirCot(id) {
    fetch(`${API_COT}/${id}`)
        .then(res => res.json())
        .then(response => {
            const c = response.success ? response.data : response;
            
            if (!c.detalles || c.detalles.length === 0) {
                return Swal.fire("Aviso", "Esta cotización no tiene productos", "info");
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: [80, 180] });

            let y = 10;

            // Encabezado
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("JHP MOTOCICLETAS", 40, y, { align: "center" });
            y += 5;
            
            doc.setFontSize(10);
            doc.text("COTIZACIÓN", 40, y, { align: "center" });
            y += 5;

            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text(`Folio: #${c.id_cotizacion}`, 40, y, { align: "center" });
            y += 4;
            doc.text(`Fecha: ${new Date(c.cot_fecha).toLocaleDateString('es-MX')}`, 40, y, { align: "center" });
            y += 4;

            const nombreCliente = c.cliente 
                ? `${c.cliente.cli_nombre} ${c.cliente.cli_apaterno}`.trim()
                : 'Público General';
            doc.text(`Cliente: ${nombreCliente}`, 40, y, { align: "center" });
            y += 4;
            doc.text(`Vigencia: ${c.cot_vigencia_dias || 15} días`, 40, y, { align: "center" });
            y += 5;

            // Línea
            doc.line(5, y, 75, y);
            y += 4;

            // Tabla
            const filas = c.detalles.map(d => {
                const nombre = d.producto?.pro_nombre || d.pro_nombre || 'Producto';
                const cant = d.det_cantidad || d.cantidad || 0;
                const precio = d.det_precio_unitario || d.precio || 0;
                return [
                    { content: `${cant}`, styles: { halign: 'center' } },
                    { content: nombre, styles: { fontSize: 7 } },
                    { content: `$${(cant * precio).toFixed(2)}`, styles: { halign: 'right' } }
                ];
            });

            doc.autoTable({
                startY: y,
                head: [['Cant', 'Producto', 'Total']],
                body: filas,
                theme: 'plain',
                margin: { left: 5, right: 5 },
                styles: { fontSize: 7, cellPadding: 1 },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 20 }
                }
            });

            y = doc.lastAutoTable.finalY + 5;
            doc.line(5, y, 75, y);
            y += 5;
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL: $${parseFloat(c.cot_total).toFixed(2)}`, 70, y, { align: "right" });
            y += 8;
            
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("Válido por " + (c.cot_vigencia_dias || 15) + " días", 40, y, { align: "center" });

            window.open(doc.output('bloburl'), '_blank');
        });
}


function convertirAVenta(id) {
    fetch(`${API_COT}/${id}`)
        .then(res => res.json())
        .then(response => {
            const c = response.success ? response.data : response;
            
            if (!c.detalles || c.detalles.length === 0) {
                return Swal.fire("Aviso", "Esta cotización no tiene productos para vender", "info");
            }

            // Verificar caja primero
            fetch(`${API_CAJA}/estado`)
                .then(res => res.json())
                .then(cajaData => {
                    let idCaja = 1; 
                    
                    if (cajaData.caja_abierta) {
                        idCaja = cajaData.id_caja;
                    } else {
                        console.warn("Caja cerrada, usando id_caja por defecto:", idCaja);
                    }

                    Swal.fire({
                        title: '¿Convertir a Venta?',
                        html: `
                            <p>Cliente: <strong>${c.cliente ? c.cliente.cli_nombre : 'Público General'}</strong></p>
                            <p>Total: <strong>$${parseFloat(c.cot_total).toFixed(2)}</strong></p>
                            <p>Caja: <strong>#${idCaja}</strong></p>
                            <select id="tipoPagoCot" class="form-select mt-2">
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta">Tarjeta</option>
                                <option value="Transferencia">Transferencia</option>
                            </select>
                        `,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, crear venta',
                        confirmButtonColor: '#28a745',
                        cancelButtonText: 'Cancelar',
                        preConfirm: () => {
                            return document.getElementById('tipoPagoCot')?.value || 'Efectivo';
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const tipoPago = result.value;

                           
                            const venta = {
                                id_cliente: c.id_cliente || null,
                                id_empleado: parseInt(localStorage.getItem('usuario_id')) || 1,
                                id_caja: idCaja, // ← IMPORTANTE
                                ven_total: parseFloat(c.cot_total),
                                tipo_pago: tipoPago,
                                detalles: c.detalles.map(d => ({
                                    id_producto: d.id_producto,
                                    cantidad: d.det_cantidad || d.cantidad || 1,
                                    precio: d.det_precio_unitario || d.precio || 0
                                }))
                            };

                            console.log("📤 Enviando venta:", JSON.stringify(venta));

                            fetch(API_VENTAS, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify(venta)
                            })
                            .then(res => res.json())
                            .then(data => {
                                console.log("Respuesta venta:", data);
                                
                                // El controlador responde: { message: '...', id_venta: N }
                                if (data.message || data.id_venta) {
                                    Swal.fire({
                                        icon: 'success',
                                        title: '¡Venta creada!',
                                        text: `Venta #${data.id_venta} generada desde cotización #${id}`,
                                        timer: 2000,
                                        showConfirmButton: false
                                    });
                                    listarCotizaciones();
                                    
                                   
                                    if (typeof window.listarVentas === 'function') {
                                        setTimeout(() => window.listarVentas(), 500);
                                    }
                                } else {
                                    throw new Error(data.error || 'Error desconocido');
                                }
                            })
                            .catch(err => {
                                console.error("Error:", err);
                                Swal.fire("Error", err.message || "No se pudo crear la venta", "error");
                            });
                        }
                    });
                })
                .catch(err => {
                    console.warn("No se pudo verificar caja, usando id_caja=1:", err);
                    
                   
                    const venta = {
                        id_cliente: c.id_cliente || null,
                        id_empleado: parseInt(localStorage.getItem('usuario_id')) || 1,
                        id_caja: 1,
                        ven_total: parseFloat(c.cot_total),
                        tipo_pago: 'Efectivo',
                        detalles: c.detalles.map(d => ({
                            id_producto: d.id_producto,
                            cantidad: d.det_cantidad || d.cantidad || 1,
                            precio: d.det_precio_unitario || d.precio || 0
                        }))
                    };

                    fetch(API_VENTAS, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(venta)
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.message || data.id_venta) {
                            Swal.fire('¡Venta creada!', `Venta #${data.id_venta}`, 'success');
                            listarCotizaciones();
                        }
                    })
                    .catch(err => Swal.fire("Error", err.message, "error"));
                });
        })
        .catch(err => {
            console.error("Error:", err);
            Swal.fire("Error", "No se pudo cargar la cotización", "error");
        });
}


function actualizarTablaTemporal() {
    const tbody = document.querySelector("#tablaTemporalCot tbody");
    if (!tbody) return;
    
    let total = 0;
    tbody.innerHTML = carritoCot.map((item, i) => {
        total += item.subtotal;
        return `
        <tr>
            <td>${item.nombre}</td>
            <td class="text-center">${item.cantidad}</td>
            <td class="text-end">$${item.precio.toFixed(2)}</td>
            <td class="text-end">$${item.subtotal.toFixed(2)}</td>
            <td class="text-center">
                <button class="btn btn-sm text-danger" onclick="quitarItemCot(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
    
    document.getElementById("totalCot").innerText = total.toFixed(2);
}

function buscarClienteCot(v) {
    const lista = document.getElementById("resCliCot");
    if (!lista) return;
    
    if (v.length < 2) {
        lista.style.display = "none";
        return;
    }

    fetch(API_CLI)
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
                    ${nombre || 'Sin nombre'}
                </button>`;
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
    
    if (v.length < 1) {
        lista.style.display = "none";
        return;
    }

    fetch(API_PROD)
        .then(res => res.json())
        .then(response => {
            const productos = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(productos) ? productos : [];
            
            const filtrados = datos.filter(p => 
                p.pro_nombre && p.pro_nombre.toLowerCase().includes(v.toLowerCase())
            );

            lista.innerHTML = filtrados.map(p => `
                <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    onclick='seleccionarProdCot(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
                    <span>${p.pro_nombre || 'Sin nombre'}</span>
                    <span class="badge bg-primary rounded-pill">$${parseFloat(p.pro_precio_venta || 0).toFixed(2)}</span>
                </button>
            `).join('');
            
            lista.style.display = filtrados.length > 0 ? "block" : "none";
        });
}

function seleccionarProdCot(p) {
    prodSeleccionadoCot = p;
    document.getElementById("busProdCot").value = p.pro_nombre || '';
    document.getElementById("resProdCot").style.display = "none";
}

function agregarItemCot() {
    if (!prodSeleccionadoCot) {
        return Swal.fire("Aviso", "Selecciona un producto primero", "warning");
    }
    
    const cant = parseInt(document.getElementById("cantCot")?.value) || 1;
    
    carritoCot.push({
        id_producto: prodSeleccionadoCot.id_producto,
        nombre: prodSeleccionadoCot.pro_nombre,
        precio: parseFloat(prodSeleccionadoCot.pro_precio_venta || 0),
        cantidad: cant,
        subtotal: cant * parseFloat(prodSeleccionadoCot.pro_precio_venta || 0)
    });
    
    actualizarTablaTemporal();
    document.getElementById("busProdCot").value = "";
    document.getElementById("cantCot").value = 1;
    prodSeleccionadoCot = null;
}

function quitarItemCot(i) {
    carritoCot.splice(i, 1);
    actualizarTablaTemporal();
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

function abrirModalCot() {
    document.getElementById("modalCotizacion").style.display = "flex";
}

function cerrarModalCot() {
    document.getElementById("modalCotizacion").style.display = "none";
    editandoCotId = null;
    clienteIdCot = null;
    carritoCot = [];
    prodSeleccionadoCot = null;
    document.getElementById("busCliCot").value = "";
    document.getElementById("busProdCot").value = "";
    document.getElementById("cot_vigencia").value = 15;
    document.getElementById("cantCot").value = 1;
    
    const titulo = document.querySelector("#modalCotizacion .modal-title");
    if (titulo) titulo.innerText = "Nueva Cotización";
    
    actualizarTablaTemporal();
}


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