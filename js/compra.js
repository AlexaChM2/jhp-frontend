
window.API_COMPRAS = window.API_COMPRAS || "http://localhost:8000/api/compras";
window.API_PROVEEDORES = window.API_PROVEEDORES || "http://localhost:8000/api/proveedores";
window.API_PRODUCTOS = window.API_PRODUCTOS || "http://localhost:8000/api/producto";

var carritoCompra = [];
var productoSeleccionado = null;
var proveedorSeleccionadoID = null;


(function() {
    if (!document.getElementById('tablaCompras') && !document.querySelector('.compras-container')) {
        console.log("No es la vista de compras");
        return;
    }

    console.log("🚀 Inicializando compras.js");

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();

function inicializar() {
    listarCompras();
    configurarCerrarListas();
}

function configurarCerrarListas() {
    document.addEventListener("click", (e) => {
        const listaProv = document.getElementById("listaResultadosProv");
        const listaProd = document.getElementById("listaResultadosProdCompra");
        
        if (e.target.id !== "buscarProveedor" && listaProv) {
            listaProv.style.display = "none";
        }
        if (e.target.id !== "buscarProductoCompra" && listaProd) {
            listaProd.style.display = "none";
        }
    });
}


// BuSQUEDA DE PROVEEDORES 

function seleccionarProveedor(valor) {
    const lista = document.getElementById("listaResultadosProv");
    if (!lista) return;
    
    if (valor.length < 2) {
        lista.style.display = "none";
        return;
    }

    fetch(window.API_PROVEEDORES)
        .then(res => res.json())
        .then(response => {
           
            const proveedores = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(proveedores) ? proveedores : [];

            lista.innerHTML = "";
            
            const filtrados = datos.filter(p => 
                p.prov_nombre && p.prov_nombre.toLowerCase().includes(valor.toLowerCase())
            );

            if (filtrados.length > 0) {
                lista.style.display = "block";
                filtrados.forEach(p => {
                    const item = document.createElement("button");
                    item.type = "button";
                    item.className = "list-group-item list-group-item-action";
                    item.innerText = p.prov_nombre || 'Sin nombre';
                    item.onclick = () => {
                        const input = document.getElementById("buscarProveedor");
                        if (input) input.value = p.prov_nombre;
                        proveedorSeleccionadoID = p.id_proveedor;
                        lista.style.display = "none";
                    };
                    lista.appendChild(item);
                });
            } else {
                lista.style.display = "none";
            }
        })
        .catch(err => console.error("Error al cargar proveedores:", err));
}


// BÚSQUEDA DE PRODUCTOS 

function seleccionarProductoCompra(valor) {
    const lista = document.getElementById("listaResultadosProdCompra");
    if (!lista) return;
    
    if (valor.length < 1) {
        lista.style.display = "none";
        return;
    }

    fetch(window.API_PRODUCTOS)
        .then(res => res.json())
        .then(response => {
           
            const productos = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(productos) ? productos : [];

            lista.innerHTML = "";
            
            const filtrados = datos.filter(p => 
                p.pro_nombre && p.pro_nombre.toLowerCase().includes(valor.toLowerCase())
            );

            if (filtrados.length > 0) {
                lista.style.display = "block";
                filtrados.forEach(p => {
                    const item = document.createElement("button");
                    item.type = "button";
                    item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
                    item.innerHTML = `
                        <span>${p.pro_nombre || 'Sin nombre'}</span>
                        <small class="text-muted">Stock: ${p.pro_stock || 0}</small>
                    `;
                    item.onclick = () => {
                        const inputProd = document.getElementById("buscarProductoCompra");
                        const inputCosto = document.getElementById("costo_unitario");
                        
                        if (inputProd) inputProd.value = p.pro_nombre || '';
                        if (inputCosto) inputCosto.value = p.pro_precio_venta || 0;
                        
                        productoSeleccionado = p;
                        recalcularSubtotalCompra();
                        lista.style.display = "none";
                    };
                    lista.appendChild(item);
                });
            } else {
                lista.style.display = "none";
            }
        })
        .catch(err => console.error("Error al cargar productos:", err));
}


function recalcularSubtotalCompra() {
    const cantInput = document.getElementById("cant_compra");
    const costoInput = document.getElementById("costo_unitario");
    const subtotalSpan = document.getElementById("subtotal_item_compra");
    
    if (!cantInput || !costoInput || !subtotalSpan) return;
    
    const cantidad = parseInt(cantInput.value) || 0;
    const costo = parseFloat(costoInput.value) || 0;
    subtotalSpan.innerText = (cantidad * costo).toFixed(2);
}


function agregarArticuloCompra() {
    if (!productoSeleccionado) {
        return Swal.fire("Aviso", "Selecciona un producto primero", "warning");
    }

    const cantInput = document.getElementById("cant_compra");
    const costoInput = document.getElementById("costo_unitario");
    
    const cantidad = parseInt(cantInput?.value) || 0;
    const costo = parseFloat(costoInput?.value) || 0;

    if (cantidad <= 0 || costo <= 0) {
        return Swal.fire("Aviso", "Cantidad y costo deben ser mayores a 0", "warning");
    }

    carritoCompra.push({
        id_producto: productoSeleccionado.id_producto,
        nombre: productoSeleccionado.pro_nombre || 'Producto',
        cantidad: cantidad,
        costo: costo,
        subtotal: cantidad * costo
    });

    actualizarTablaDetalleCompra();
    limpiarCamposProducto();
}


function actualizarTablaDetalleCompra() {
    const tbody = document.querySelector("#detalleTemporalCompra tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    let total = 0;

    carritoCompra.forEach((item, index) => {
        total += item.subtotal || 0;
        tbody.innerHTML += `
            <tr>
                <td>${item.nombre || 'Producto'}</td>
                <td>${item.cantidad || 0}</td>
                <td>$${(item.costo || 0).toFixed(2)}</td>
                <td>$${(item.subtotal || 0).toFixed(2)}</td>
                <td>
                    <button onclick="quitarArticuloCompra(${index})" class="btn btn-sm text-danger">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });

    const totalFinal = document.getElementById("total_final_compra");
    if (totalFinal) totalFinal.innerText = total.toFixed(2);
}

function quitarArticuloCompra(index) {
    if (index >= 0 && index < carritoCompra.length) {
        carritoCompra.splice(index, 1);
        actualizarTablaDetalleCompra();
    }
}


function finalizarCompra() {
    if (!proveedorSeleccionadoID) {
        return Swal.fire("Aviso", "Selecciona un proveedor", "warning");
    }
    
    if (carritoCompra.length === 0) {
        return Swal.fire("Aviso", "Agrega productos al carrito", "warning");
    }

    const totalFinal = document.getElementById("total_final_compra");
    const facturaNo = document.getElementById("factura_no");

    const dataCompra = {
        id_proveedor: proveedorSeleccionadoID,
        id_empleado: parseInt(localStorage.getItem('usuario_id')) || 1,
        com_factura_no: facturaNo?.value || null,
        com_total: parseFloat(totalFinal?.innerText) || 0,
        detalles: carritoCompra.map(i => ({
            id_producto: i.id_producto,
            det_cantidad: i.cantidad,
            det_costo_unitario: i.costo
        }))
    };

    console.log(" Enviando compra:", dataCompra);

    fetch(window.API_COMPRAS, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(dataCompra)
    })
    .then(res => res.json())
    .then(data => {
        Swal.fire({
            icon: 'success',
            title: '¡Compra registrada!',
            text: data.message || 'Compra e inventario actualizados',
            timer: 1500,
            showConfirmButton: false
        });
        cerrarModalCompra();
        listarCompras();
    })
    .catch(err => {
        console.error("Error:", err);
        Swal.fire("Error", "No se pudo registrar la compra", "error");
    });
}


// LISTAR COMPRAS

function listarCompras() {
    const tbody = document.getElementById("tablaCompras");
    if (!tbody) return;

    fetch(window.API_COMPRAS)
        .then(res => res.json())
        .then(response => {
           
            const compras = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(compras) ? compras : [];

            let html = "";
            datos.forEach(c => {
                html += `
                <tr>
                    <td>${c.id_compra || ''}</td>
                    <td>${c.com_fecha ? new Date(c.com_fecha).toLocaleDateString() : '-'}</td>
                    <td>${c.com_factura_no || 'N/A'}</td>
                    <td>$${parseFloat(c.com_total || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="verDetalleCompra(${c.id_compra})" title="Ver detalle"
                            style="background:#144879;color:white;border:none;border-radius:10px;padding:5px 10px;cursor:pointer;">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </td>
                </tr>`;
            });
            tbody.innerHTML = html || '<tr><td colspan="5" class="text-center">No hay compras registradas</td></tr>';
        })
        .catch(err => console.error("Error al listar compras:", err));
}

// VER DETALLE DE COMPRA

function verDetalleCompra(id) {
    fetch(`${window.API_COMPRAS}/${id}`)
        .then(res => res.json())
        .then(response => {
            const compra = response.success ? response.data : response;
            
            if (!compra || !compra.detalles) {
                return Swal.fire("Aviso", "Esta compra no tiene detalles", "info");
            }

            let tabla = `<table style="width:100%;border-collapse:collapse;margin-top:10px;">
                <thead><tr style="background:#7a85dd;color:white;">
                    <th style="padding:8px;">Producto</th>
                    <th style="padding:8px;">Cant.</th>
                    <th style="padding:8px;">Costo</th>
                    <th style="padding:8px;">Subtotal</th>
                </tr></thead><tbody>`;

            compra.detalles.forEach(d => {
                const nombre = d.producto?.pro_nombre || 'Producto';
                const sub = (d.det_cantidad * d.det_costo_unitario).toFixed(2);
                tabla += `<tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px;">${nombre}</td>
                    <td style="padding:8px;">${d.det_cantidad}</td>
                    <td style="padding:8px;">$${parseFloat(d.det_costo_unitario).toFixed(2)}</td>
                    <td style="padding:8px;">$${sub}</td>
                </tr>`;
            });

            tabla += `</tbody></table>`;

            Swal.fire({
                title: `Compra #${compra.id_compra}`,
                html: `
                    <div style="text-align:left;font-size:14px;">
                        <p><strong>Proveedor:</strong> ${compra.proveedor?.prov_nombre || 'N/A'}</p>
                        <p><strong>Factura:</strong> ${compra.com_factura_no || 'N/A'}</p>
                        <p><strong>Fecha:</strong> ${compra.com_fecha ? new Date(compra.com_fecha).toLocaleString() : '-'}</p>
                        ${tabla}
                        <div style="text-align:right;margin-top:15px;font-size:18px;">
                            <strong>TOTAL: $${parseFloat(compra.com_total).toFixed(2)}</strong>
                        </div>
                    </div>`,
                width: '600px',
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#080522'
            });
        })
        .catch(err => {
            console.error("Error:", err);
            Swal.fire("Error", "No se pudo cargar el detalle", "error");
        });
}


function abrirNuevaCompra() {
    const modal = document.getElementById("modalCompra");
    if (modal) modal.style.display = "flex";
}

function cerrarModalCompra() {
    const modal = document.getElementById("modalCompra");
    if (modal) modal.style.display = "none";
    
    carritoCompra = [];
    proveedorSeleccionadoID = null;
    productoSeleccionado = null;
    
    const factura = document.getElementById("factura_no");
    if (factura) factura.value = "";
    
    const buscarProv = document.getElementById("buscarProveedor");
    if (buscarProv) buscarProv.value = "";
    
    actualizarTablaDetalleCompra();
}

function limpiarCamposProducto() {
    productoSeleccionado = null;
    
    const buscarProd = document.getElementById("buscarProductoCompra");
    if (buscarProd) buscarProd.value = "";
    
    const cantCompra = document.getElementById("cant_compra");
    if (cantCompra) cantCompra.value = 1;
    
    const costoUnitario = document.getElementById("costo_unitario");
    if (costoUnitario) costoUnitario.value = "0.00";
    
    const subtotalItem = document.getElementById("subtotal_item_compra");
    if (subtotalItem) subtotalItem.innerText = "0.00";
}


window.seleccionarProveedor = seleccionarProveedor;
window.seleccionarProductoCompra = seleccionarProductoCompra;
window.agregarArticuloCompra = agregarArticuloCompra;
window.quitarArticuloCompra = quitarArticuloCompra;
window.finalizarCompra = finalizarCompra;
window.listarCompras = listarCompras;
window.verDetalleCompra = verDetalleCompra;
window.abrirNuevaCompra = abrirNuevaCompra;
window.cerrarModalCompra = cerrarModalCompra;