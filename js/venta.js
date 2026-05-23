
window.API_VENTAS = window.API_VENTAS || "https://jhpapi-production.up.railway.app/api/ventas";
window.API_PRODUCTOS = window.API_PRODUCTOS || "https://jhpapi-production.up.railway.app/api/producto";
window.API_CLIENTES = window.API_CLIENTES || "https://jhpapi-production.up.railway.app/api/clientes";
window.API_CAJA = window.API_CAJA || "https://jhpapi-production.up.railway.app/api/control_caja";

var carrito = [];
var productoSeleccionado = null;
var clienteSeleccionadoID = null;
var cajaActual = null;


function verificarCajaParaVenta() {
    return fetch(`${window.API_CAJA}/estado`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.caja_abierta === true) {
                cajaActual = data;
                console.log(" Caja abierta, ID:", data.id_caja);
                return true;
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Caja Cerrada',
                    text: 'Debes abrir caja antes de vender.',
                    confirmButtonColor: '#3085d6'
                });
                return false;
            }
        })
        .catch(err => {
            console.error("Error al verificar caja:", err);
            return false;
        });
}


(function() {
    if (!document.getElementById('tablaVentas') && !document.querySelector('.ventas-container')) {
        console.log("No es la vista de ventas");
        return;
    }

    console.log(" Inicializando venta.js");

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', configurarEventListeners);
    } else {
        configurarEventListeners();
    }
})();

function configurarEventListeners() {
   
    document.addEventListener("click", (e) => {
        const listaCliente = document.getElementById("listaResultadosCliente");
        const listaProd = document.getElementById("listaResultadosProd");

        if (e.target.id !== "buscarCliente" && listaCliente) {
            listaCliente.style.display = "none";
        }
        if (e.target.id !== "buscarProducto" && listaProd) {
            listaProd.style.display = "none";
        }
    });

    listarVentas();
}


function listarVentas() {
    const contenedor = document.getElementById("tablaVentas");
    if (!contenedor) return;

    fetch(window.API_VENTAS)
        .then(res => res.json())
        .then(response => {
           
            const ventas = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(ventas) ? ventas : [];

            let tabla = "";
            datos.forEach(v => {
                tabla += `
                <tr>
                    <td>${v.id_venta || ''}</td>
                    <td>${v.ven_fecha ? new Date(v.ven_fecha).toLocaleString() : '-'}</td>
                    <td>$${parseFloat(v.ven_total || 0).toFixed(2)}</td>
                    <td>${v.tipo_pago || '-'}</td>
                    <td>
                        <button onclick="verVenta(${v.id_venta})" title="Ver Detalle"
                            style="background:#144879;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="imprimirTicket(${v.id_venta})" title="Imprimir"
                            style="background:#17791f;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-print"></i>
                        </button>
                        <button onclick="confirmarEliminar(${v.id_venta})" title="Eliminar"
                            style="background:#b30505;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
            });
            contenedor.innerHTML = tabla || '<tr><td colspan="5" class="text-center">No hay ventas registradas</td></tr>';
        })
        .catch(err => console.error("Error en listarVentas:", err));
}


function seleccionarCliente(valor) {
    const listaResultados = document.getElementById("listaResultadosCliente");
    if (!listaResultados) return;

    if (valor.length < 2) {
        clienteSeleccionadoID = null;
        listaResultados.style.display = "none";
        return;
    }

    fetch(window.API_CLIENTES)
        .then(res => res.json())
        .then(response => {
           
            const clientes = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(clientes) ? clientes : [];

            listaResultados.innerHTML = "";

            const filtrados = datos.filter(c => {
                const nombreCompleto = `${c.cli_nombre || ''} ${c.cli_apaterno || ''} ${c.cli_amaterno || ''}`.toLowerCase();
                return nombreCompleto.includes(valor.toLowerCase()) || 
                       (c.id_cliente && c.id_cliente.toString().includes(valor));
            });

            if (filtrados.length > 0) {
                listaResultados.style.display = "block";
                filtrados.forEach(c => {
                    const nombreCompleto = `${c.cli_nombre || ''} ${c.cli_apaterno || ''} ${c.cli_amaterno || ''}`.trim() || 'Sin nombre';

                    const item = document.createElement("button");
                    item.type = "button";
                    item.className = "list-group-item list-group-item-action";
                    item.innerText = nombreCompleto;

                    item.onclick = () => {
                        const input = document.getElementById("buscarCliente");
                        if (input) input.value = nombreCompleto;
                        clienteSeleccionadoID = c.id_cliente;
                        listaResultados.style.display = "none";
                    };

                    listaResultados.appendChild(item);
                });
            } else {
                listaResultados.style.display = "none";
            }
        })
        .catch(err => console.error("Error al cargar clientes:", err));
}


function seleccionarProducto(valor) {
    const listaProd = document.getElementById("listaResultadosProd");
    if (!listaProd) return;

    if (valor.trim().length === 0) {
        listaProd.style.display = "none";
        return;
    }

    fetch(window.API_PRODUCTOS)
        .then(res => res.json())
        .then(response => {
            
            const productos = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(productos) ? productos : [];

            listaProd.innerHTML = "";

            const filtrados = datos.filter(p =>
                (p.pro_nombre && p.pro_nombre.toLowerCase().includes(valor.toLowerCase())) ||
                (p.pro_codigo && p.pro_codigo.toString().includes(valor))
            );

            if (filtrados.length > 0) {
                listaProd.style.display = "block";
                filtrados.forEach(p => {
                    const item = document.createElement("button");
                    item.type = "button";
                    item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";

                    item.innerHTML = `
                        <span>${p.pro_nombre || 'Sin nombre'}</span>
                        <span class="badge bg-primary rounded-pill">$${parseFloat(p.pro_precio_venta || 0).toFixed(2)}</span>
                    `;

                    item.onclick = () => {
                        const input = document.getElementById("buscarProducto");
                        const precioSpan = document.getElementById("precio_unitario");
                        if (input) input.value = p.pro_nombre || '';
                        if (precioSpan) precioSpan.innerText = parseFloat(p.pro_precio_venta || 0).toFixed(2);

                        productoSeleccionado = p;
                        recalcularSubtotal();

                        listaProd.style.display = "none";
                    };
                    listaProd.appendChild(item);
                });
            } else {
                listaProd.style.display = "none";
            }
        })
        .catch(err => console.error("Error al cargar productos:", err));
}


function recalcularSubtotal() {
    const cant = document.getElementById("cant_venta");
    const subtotalSpan = document.getElementById("subtotal_item");
    if (!cant || !subtotalSpan) return;

    const cantidad = parseInt(cant.value) || 0;
    const precio = productoSeleccionado ? (parseFloat(productoSeleccionado.pro_precio_venta) || 0) : 0;
    subtotalSpan.innerText = (cantidad * precio).toFixed(2);
}


function agregarArticulo() {
    if (!productoSeleccionado) {
        Swal.fire("Aviso", "Selecciona un producto", "warning");
        return;
    }

    const cantInput = document.getElementById("cant_venta");
    const cantidad = parseInt(cantInput?.value) || 0;

    if (cantidad <= 0) {
        Swal.fire("Aviso", "Ingresa una cantidad válida", "warning");
        return;
    }

    carrito.push({
        id_producto: productoSeleccionado.id_producto,
        nombre: productoSeleccionado.pro_nombre || 'Producto',
        cantidad: cantidad,
        precio: parseFloat(productoSeleccionado.pro_precio_venta) || 0,
        subtotal: cantidad * (parseFloat(productoSeleccionado.pro_precio_venta) || 0)
    });

    actualizarTablaDetalle();

 
    const buscarProd = document.getElementById("buscarProducto");
    if (buscarProd) buscarProd.value = "";
    if (cantInput) cantInput.value = 1;
    const precioUnitario = document.getElementById("precio_unitario");
    if (precioUnitario) precioUnitario.innerText = "0.00";
    const subtotalItem = document.getElementById("subtotal_item");
    if (subtotalItem) subtotalItem.innerText = "0.00";

    productoSeleccionado = null;
}


function actualizarTablaDetalle() {
    const tbody = document.querySelector("#detalleTemporal tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    let total = 0;

    carrito.forEach((p, index) => {
        total += p.subtotal || 0;
        tbody.innerHTML += `
            <tr>
                <td>${p.nombre || 'Producto'}</td>
                <td>${p.cantidad || 0}</td>
                <td>$${(p.subtotal || 0).toFixed(2)}</td>
                <td>
                    <button onclick="quitarArticulo(${index})"
                        style="background:none;border:none;color:red;cursor:pointer;font-size:18px;">
                        ✕
                    </button>
                </td>
            </tr>`;
    });

    const totalFinal = document.getElementById("total_final");
    if (totalFinal) totalFinal.innerText = total.toFixed(2);
}

function quitarArticulo(index) {
    if (index >= 0 && index < carrito.length) {
        carrito.splice(index, 1);
        actualizarTablaDetalle();
    }
}


function finalizarVenta() {
    if (carrito.length === 0) {
        Swal.fire("Aviso", "Agrega productos al carrito", "warning");
        return;
    }

    verificarCajaParaVenta().then(cajaValida => {
        if (!cajaValida) return;

        const totalFinal = document.getElementById("total_final");
        const tipoPago = document.getElementById("tipo_pago");

        if (!totalFinal || !tipoPago) return;

        const venta = {
            id_cliente: clienteSeleccionadoID,
            id_empleado: 1,
            id_caja: cajaActual.id_caja,
            ven_total: parseFloat(totalFinal.innerText) || 0,
            tipo_pago: tipoPago.value,
            detalles: carrito.map(p => ({
                id_producto: p.id_producto,
                cantidad: p.cantidad,
                precio: p.precio
            }))
        };

        fetch(window.API_VENTAS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(venta)
        })
        .then(res => res.json())
        .then(data => {
            Swal.fire({
                icon: 'success',
                title: '¡Venta registrada!',
                timer: 1500,
                showConfirmButton: false
            });
            cerrarModal();
            listarVentas();
        })
        .catch(err => {
            console.error("Error:", err);
            Swal.fire("Error", "No se pudo registrar la venta", "error");
        });
    });
}


function abrirNuevaVenta() {
    verificarCajaParaVenta().then(cajaValida => {
        if (cajaValida) {
            const modal = document.getElementById("modalVenta");
            if (modal) modal.style.display = "flex";
        }
    });
}

function cerrarModal() {
    const modal = document.getElementById("modalVenta");
    if (modal) modal.style.display = "none";

    carrito = [];
    clienteSeleccionadoID = null;
    productoSeleccionado = null;

    ["buscarCliente", "buscarProducto", "referencia"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const cantVenta = document.getElementById("cant_venta");
    if (cantVenta) cantVenta.value = 1;

    ["precio_unitario", "subtotal_item", "total_final"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "0.00";
    });

    actualizarTablaDetalle();
}


function buscarHistorial() {
    const query = document.getElementById("inputBuscarVenta")?.value?.toLowerCase() || '';
    const filas = document.querySelectorAll("#tablaVentas tr");
    filas.forEach(f => {
        f.style.display = f.innerText.toLowerCase().includes(query) ? "" : "none";
    });
}


// VER VENTA

function verVenta(id) {
    fetch(`${window.API_VENTAS}/${id}`)
        .then(res => res.json())
        .then(response => {
            const venta = response.success ? response.data : response;
            
            if (!venta || !venta.detalles) {
                return Swal.fire("Aviso", "Esta venta no tiene detalles", "info");
            }

            let tabla = `<table style="width:100%;border-collapse:collapse;margin-top:10px;">
                <thead><tr style="background:#7a85dd;color:white;">
                    <th style="padding:8px;">Producto</th>
                    <th style="padding:8px;">Cant.</th>
                    <th style="padding:8px;">Precio</th>
                    <th style="padding:8px;">Subtotal</th>
                </tr></thead><tbody>`;

            venta.detalles.forEach(d => {
                const nombre = d.producto?.pro_nombre || 'Producto';
                const sub = (d.det_cantidad * d.det_precio_unitario).toFixed(2);
                tabla += `<tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px;">${nombre}</td>
                    <td style="padding:8px;">${d.det_cantidad}</td>
                    <td style="padding:8px;">$${parseFloat(d.det_precio_unitario).toFixed(2)}</td>
                    <td style="padding:8px;">$${sub}</td>
                </tr>`;
            });

            tabla += `</tbody></table>`;

            Swal.fire({
                title: `Venta #${venta.id_venta}`,
                html: `
                    <div style="text-align:left;font-size:14px;">
                        <p><strong>Cliente:</strong> ${venta.cliente?.cli_nombre || 'Público General'}</p>
                        <p><strong>Fecha:</strong> ${venta.ven_fecha ? new Date(venta.ven_fecha).toLocaleString() : '-'}</p>
                        <p><strong>Método:</strong> ${venta.tipo_pago || '-'}</p>
                        ${tabla}
                        <div style="text-align:right;margin-top:15px;font-size:18px;">
                            <strong>TOTAL: $${parseFloat(venta.ven_total).toFixed(2)}</strong>
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


// IMPRIMIR TICKET

function imprimirTicket(id) {
    fetch(`${window.API_VENTAS}/${id}`)
        .then(res => res.json())
        .then(response => {
            const venta = response.success ? response.data : response;
            if (!venta) return;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: [80, 150] });

            doc.setFontSize(12);
            doc.text("JHP - Motocicletas", 40, 10, { align: "center" });
            doc.line(5, 12, 75, 12);

            doc.setFontSize(8);
            doc.text(`Folio: ${venta.id_venta}`, 10, 18);
            doc.text(`Fecha: ${venta.ven_fecha ? new Date(venta.ven_fecha).toLocaleDateString() : '-'}`, 10, 23);
            doc.text(`Cliente: ${venta.cliente?.cli_nombre || 'Público General'}`, 10, 28);

            const filas = venta.detalles.map(d => [
                d.producto?.pro_nombre?.substring(0, 18) || 'Producto',
                d.det_cantidad,
                `$${parseFloat(d.det_precio_unitario).toFixed(2)}`,
                `$${(d.det_cantidad * d.det_precio_unitario).toFixed(2)}`
            ]);

            doc.autoTable({
                startY: 33,
                head: [['Art.', 'Cant', 'Precio', 'Sub']],
                body: filas,
                theme: 'plain',
                margin: { left: 5, right: 5 },
                styles: { fontSize: 7, cellPadding: 1 }
            });

            const finalY = doc.lastAutoTable.finalY + 5;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL: $${parseFloat(venta.ven_total).toFixed(2)}`, 70, finalY + 7, { align: "right" });

            window.open(doc.output('bloburl'), '_blank');
        })
        .catch(err => console.error("Error al imprimir:", err));
}


// ELIMINAR VENTA

function confirmarEliminar(id) {
    Swal.fire({
        title: '¿Eliminar venta?',
        text: `Se eliminará la venta #${id}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) eliminarVenta(id);
    });
}

function eliminarVenta(id) {
    fetch(`${window.API_VENTAS}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500 });
        listarVentas();
    })
    .catch(err => Swal.fire('Error', 'No se pudo eliminar', 'error'));
}

window.listarVentas = listarVentas;