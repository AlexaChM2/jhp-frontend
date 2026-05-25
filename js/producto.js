window.API_PRODUCTOS = window.API_PRODUCTOS || "https://jhpapi-production.up.railway.app/api/producto";
window.API_CATEGORIAS = window.API_CATEGORIAS || "https://jhpapi-production.up.railway.app/api/categorias";
window.API_PROVEEDORES = window.API_PROVEEDORES || "https://jhpapi-production.up.railway.app/api/proveedores";
window.API_MARCAS = window.API_MARCAS || "https://jhpapi-production.up.railway.app/api/marcas";

let productoEnEdicion = null;
let todosLosProductos = [];

(function() {
    console.log("🚀 Iniciando productos.js...");

    if (!document.getElementById('tablaProductos')) {
        console.log("No se encontró la tabla de productos");
        return;
    }

    console.log("Vista de productos detectada");

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarModulo);
    } else {
        inicializarModulo();
    }
})();

function inicializarModulo() {
    console.log("Inicializando módulo de productos");

    if (window._categoriasCache && window._categoriasCache.length > 0) {
        llenarSelectCategorias(window._categoriasCache);
    }
    if (window._proveedoresCache && window._proveedoresCache.length > 0) {
        llenarSelectProveedores(window._proveedoresCache);
    }
    if (window._marcasCache && window._marcasCache.length > 0) {
        llenarSelectMarcas(window._marcasCache);
    }

    verificarConexionAPI();
}

function verificarConexionAPI() {
    console.log("Verificando conexión con API...");
    fetch(window.API_PRODUCTOS)
        .then(res => {
            if (res.ok) {
                console.log("API disponible");
                cargarCategorias();
                cargarProveedores();
                cargarMarcas();
                listarProductos();
            } else {
                console.error("API no disponible:", res.status);
                mostrarErrorAPI();
            }
        })
        .catch(err => {
            console.error("Error de conexión:", err);
            mostrarErrorAPI();
        });
}

function mostrarErrorAPI() {
    const tbody = document.getElementById('tablaProductos');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-triangle fa-2x mb-3"></i><br>
            <strong>Error de conexión con el servidor</strong><br>
            <small>URL: ${window.API_PRODUCTOS}</small></td></tr>`;
    }
}

// ==========================================
// CATEGORÍAS
// ==========================================
function cargarCategorias() {
    fetch(window.API_CATEGORIAS)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(response => {
            let categorias = [];
            if (response.success && response.data) {
                categorias = response.data.data || response.data;
            } else if (response.data) {
                categorias = response.data.data || response.data;
            } else if (Array.isArray(response)) {
                categorias = response;
            }
            if (!Array.isArray(categorias)) categorias = [];
            window._categoriasCache = categorias;
            llenarSelectCategorias(categorias);
        })
        .catch(err => {
            console.error("Error al cargar categorías:", err);
            if (window._categoriasCache && window._categoriasCache.length > 0) {
                llenarSelectCategorias(window._categoriasCache);
            }
        });
}

function llenarSelectCategorias(categorias) {
    const selectModal = document.getElementById('producto_categoria');
    const selectFiltro = document.getElementById('filtro_categoria_print');
    if (selectModal) {
        selectModal.innerHTML = '<option value="">Seleccionar categoría...</option>';
        categorias.forEach(cat => {
            selectModal.innerHTML += `<option value="${cat.id_categoria}">${cat.cat_nombre || 'Sin nombre'}</option>`;
        });
    }
    if (selectFiltro) {
        const valorActual = selectFiltro.value;
        selectFiltro.innerHTML = '<option value="">-- Todas las categorías --</option>';
        categorias.forEach(cat => {
            selectFiltro.innerHTML += `<option value="${cat.id_categoria}">${cat.cat_nombre || 'Sin nombre'}</option>`;
        });
        if (valorActual) selectFiltro.value = valorActual;
    }
}

// ==========================================
// PROVEEDORES
// ==========================================
function cargarProveedores() {
    fetch(window.API_PROVEEDORES)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(response => {
            let proveedores = [];
            if (response.success && response.data) {
                proveedores = response.data.data || response.data;
            } else if (response.data) {
                proveedores = response.data.data || response.data;
            } else if (Array.isArray(response)) {
                proveedores = response;
            }
            if (!Array.isArray(proveedores)) proveedores = [];
            window._proveedoresCache = proveedores;
            llenarSelectProveedores(proveedores);
        })
        .catch(err => {
            console.error("Error al cargar proveedores:", err);
            if (window._proveedoresCache && window._proveedoresCache.length > 0) {
                llenarSelectProveedores(window._proveedoresCache);
            }
        });
}

function llenarSelectProveedores(proveedores) {
    const select = document.getElementById('producto_proveedor');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar proveedor...</option>';
    proveedores.forEach(prov => {
        select.innerHTML += `<option value="${prov.id_proveedor}">${prov.prov_nombre || 'Sin nombre'}</option>`;
    });
}

// ==========================================
// MARCAS (NUEVO)
// ==========================================
function cargarMarcas() {
    console.log("📥 Cargando marcas desde:", window.API_MARCAS);
    fetch(window.API_MARCAS)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(response => {
            let marcas = [];
            if (response.success && response.data) {
                marcas = response.data.data || response.data;
            } else if (response.data) {
                marcas = response.data.data || response.data;
            } else if (Array.isArray(response)) {
                marcas = response;
            }
            if (!Array.isArray(marcas)) marcas = [];
            console.log(`Marcas cargadas: ${marcas.length}`);
            window._marcasCache = marcas;
            llenarSelectMarcas(marcas);
        })
        .catch(err => {
            console.error("Error al cargar marcas:", err);
            if (window._marcasCache && window._marcasCache.length > 0) {
                llenarSelectMarcas(window._marcasCache);
            }
        });
}

function llenarSelectMarcas(marcas) {
    const select = document.getElementById('producto_marca_select');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar marca...</option>';
    marcas.forEach(marca => {
        select.innerHTML += `<option value="${marca.id_marca}">${marca.mar_nombre || 'Sin nombre'}</option>`;
    });
    console.log("Select de marcas actualizado");
}

// ==========================================
// LISTAR PRODUCTOS
// ==========================================
function listarProductos() {
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;
    fetch(window.API_PRODUCTOS)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(response => {
            let productos = [];
            if (response.success && response.data) {
                productos = response.data.data || response.data;
            } else if (response.data) {
                productos = response.data.data || response.data;
            } else if (Array.isArray(response)) {
                productos = response;
            }
            if (!Array.isArray(productos)) productos = [];
            todosLosProductos = productos;
            if (productos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center py-3">No hay productos registrados</td></tr>';
                actualizarEstadisticas([]);
                return;
            }
            actualizarEstadisticas(productos);
            renderizarTabla(productos);
        })
        .catch(err => {
            console.error("Error al listar productos:", err);
            tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger py-3">Error: ${err.message}</td></tr>`;
        });
}

function renderizarTabla(productos) {
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;
    let html = '';
    productos.forEach(p => {
        let stockClass = 'bg-success';
        if (p.pro_stock <= 0) stockClass = 'bg-danger';
        else if (p.pro_stock <= 5) stockClass = 'bg-warning text-dark';
        html += `
            <tr>
                <td>${p.id_producto || ''}</td>
                <td><span class="badge bg-secondary">${p.pro_codigo || ''}</span></td>
                <td>${p.pro_nombre || ''}</td>
                <td>${p.pro_tipo || '-'}</td>
                <td>${p.pro_marca || (p.marca ? p.marca.mar_nombre : '-')}</td>
                <td>${p.pro_descripcion ? p.pro_descripcion.substring(0, 30) + '...' : '-'}</td>
                <td><span class="badge bg-primary">$${parseFloat(p.pro_precio_venta || 0).toFixed(2)}</span></td>
                <td><span class="badge ${stockClass}">${p.pro_stock || 0}</span></td>
                <td>${p.categoria ? p.categoria.cat_nombre : '-'}</td>
                <td>${p.proveedor ? p.proveedor.prov_nombre : '-'}</td>
                <td>
                    <div class="d-flex gap-1 justify-content-center">
                        <button onclick="window.verProducto(${p.id_producto})" title="Ver"
                            style="background:#144879;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-eye"></i></button>
                        <button onclick="window.editarProducto(${p.id_producto})" title="Editar"
                            style="background:#ee8a2d;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-edit"></i></button>
                        <button onclick="window.confirmarEliminar(${p.id_producto})" title="Eliminar"
                            style="background:#c5341a;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
}

function actualizarEstadisticas(productos) {
    const totalProductos = productos.length;
    const totalStock = productos.reduce((sum, p) => sum + (parseInt(p.pro_stock) || 0), 0);
    const valorInventario = productos.reduce((sum, p) => sum + ((parseInt(p.pro_stock) || 0) * (parseFloat(p.pro_precio_venta) || 0)), 0);
    const elTotal = document.getElementById('totalProductos');
    const elStock = document.getElementById('totalStock');
    const elValor = document.getElementById('valorInventario');
    if (elTotal) elTotal.innerText = totalProductos;
    if (elStock) elStock.innerText = totalStock;
    if (elValor) elValor.innerText = `$${valorInventario.toFixed(2)}`;
}

window.buscarEnTiempoReal = function() {
    const input = document.getElementById('inputBuscarProducto');
    if (!input) return;
    const filtro = input.value.toLowerCase().trim();
    if (filtro === '') { renderizarTabla(todosLosProductos); return; }
    const filtrados = todosLosProductos.filter(p =>
        (p.pro_codigo && p.pro_codigo.toLowerCase().includes(filtro)) ||
        (p.pro_nombre && p.pro_nombre.toLowerCase().includes(filtro)) ||
        (p.pro_marca && p.pro_marca.toLowerCase().includes(filtro)) ||
        (p.pro_tipo && p.pro_tipo.toLowerCase().includes(filtro))
    );
    renderizarTabla(filtrados);
};

window.buscarProductos = function() { window.buscarEnTiempoReal(); };

// ==========================================
// ABRIR MODAL
// ==========================================
window.abrirModalProducto = function() {
    productoEnEdicion = null;
    document.getElementById('modalProductoTitle').innerHTML = '<i class="fas fa-box me-2"></i> Registrar Nuevo Producto';
    limpiarFormulario();
    new bootstrap.Modal(document.getElementById('modalProducto')).show();
};

function limpiarFormulario() {
    ['producto_codigo', 'producto_nombre', 'producto_tipo',
     'producto_descripcion', 'producto_precio', 'producto_stock',
     'producto_categoria', 'producto_proveedor', 'producto_marca_select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ==========================================
// GUARDAR PRODUCTO
// ==========================================
window.guardarProducto = function() {
    const codigo = document.getElementById('producto_codigo')?.value?.trim();
    const nombre = document.getElementById('producto_nombre')?.value?.trim();
    const precio = document.getElementById('producto_precio')?.value;

    if (!codigo || !nombre || !precio) {
        Swal.fire('Validación', 'Código, Nombre y Precio son obligatorios', 'warning');
        return;
    }

    const marcaSelect = document.getElementById('producto_marca_select');

    const producto = {
        pro_codigo: codigo,
        pro_nombre: nombre,
        pro_tipo: document.getElementById('producto_tipo')?.value?.trim() || null,
        pro_marca: marcaSelect?.value ? marcaSelect.options[marcaSelect.selectedIndex].text : null,
        id_marca: marcaSelect?.value || null,
        pro_descripcion: document.getElementById('producto_descripcion')?.value?.trim() || null,
        pro_precio_venta: parseFloat(precio),
        pro_stock: parseInt(document.getElementById('producto_stock')?.value) || 0,
        id_categoria: document.getElementById('producto_categoria')?.value || null,
        id_proveedor: document.getElementById('producto_proveedor')?.value || null
    };

    const url = productoEnEdicion
        ? `${window.API_PRODUCTOS}/${productoEnEdicion.id_producto}`
        : window.API_PRODUCTOS;
    const method = productoEnEdicion ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
    })
    .then(res => res.json())
    .then(data => {
        Swal.fire({ icon: 'success', title: '¡Éxito!', timer: 1500, showConfirmButton: false });
        bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
        listarProductos();
    })
    .catch(err => {
        console.error("Error:", err);
        Swal.fire('Error', 'No se pudo guardar', 'error');
    });
};

// ==========================================
// EDITAR PRODUCTO
// ==========================================
window.editarProducto = function(id) {
    const producto = todosLosProductos.find(p => p.id_producto === id);
    if (!producto) return;

    productoEnEdicion = producto;
    document.getElementById('modalProductoTitle').innerHTML = '<i class="fas fa-edit me-2"></i> Editar Producto';

    document.getElementById('producto_codigo').value = producto.pro_codigo || '';
    document.getElementById('producto_nombre').value = producto.pro_nombre || '';
    document.getElementById('producto_tipo').value = producto.pro_tipo || '';
    document.getElementById('producto_marca').value = producto.pro_marca || '';
    document.getElementById('producto_descripcion').value = producto.pro_descripcion || '';
    document.getElementById('producto_precio').value = producto.pro_precio_venta || '';
    document.getElementById('producto_stock').value = producto.pro_stock || 0;
    document.getElementById('producto_categoria').value = producto.id_categoria || '';
    document.getElementById('producto_proveedor').value = producto.id_proveedor || '';

    const selectMarca = document.getElementById('producto_marca_select');
    if (selectMarca) selectMarca.value = producto.id_marca || '';

    new bootstrap.Modal(document.getElementById('modalProducto')).show();
};

// ==========================================
// VER PRODUCTO
// ==========================================
window.verProducto = function(id) {
    const p = todosLosProductos.find(prod => prod.id_producto === id);
    if (!p) return;
    Swal.fire({
        title: `${p.pro_nombre}`,
        html: `<div style="text-align:left;">
            <p><strong>Código:</strong> ${p.pro_codigo}</p>
            <p><strong>Tipo:</strong> ${p.pro_tipo || '-'}</p>
            <p><strong>Marca:</strong> ${p.pro_marca || (p.marca ? p.marca.mar_nombre : '-')}</p>
            <p><strong>Precio:</strong> $${parseFloat(p.pro_precio_venta).toFixed(2)}</p>
            <p><strong>Stock:</strong> ${p.pro_stock}</p>
            <p><strong>Categoría:</strong> ${p.categoria?.cat_nombre || '-'}</p>
            <p><strong>Proveedor:</strong> ${p.proveedor?.prov_nombre || '-'}</p>
            <p><strong>Descripción:</strong> ${p.pro_descripcion || '-'}</p></div>`,
        icon: 'info',
        confirmButtonColor: '#144879'
    });
};

// ==========================================
// ELIMINAR PRODUCTO
// ==========================================
window.confirmarEliminar = function(id) {
    Swal.fire({
        title: '¿Eliminar producto?',
        text: 'Esta acción no se puede revertir',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${window.API_PRODUCTOS}/${id}`, { method: 'DELETE' })
                .then(() => { Swal.fire('Eliminado', '', 'success'); listarProductos(); })
                .catch(() => Swal.fire('Error', 'No se pudo eliminar', 'error'));
        }
    });
};

// ==========================================
// IMPRIMIR INVENTARIO
// ==========================================
window.imprimirInventarioTicket = function() {
    const selectFiltro = document.getElementById('filtro_categoria_print');
    if (!selectFiltro || selectFiltro.options.length <= 1) {
        if (window._categoriasCache && window._categoriasCache.length > 0) {
            llenarSelectCategorias(window._categoriasCache);
        } else {
            cargarCategorias();
            Swal.fire('Atención', 'Cargando categorías...', 'info');
            return;
        }
    }
    const categoriaId = selectFiltro ? selectFiltro.value : "";
    const categoriaNombre = selectFiltro?.options[selectFiltro.selectedIndex]?.text || "TODAS";
    let productosAImprimir = todosLosProductos;
    if (categoriaId !== "") {
        productosAImprimir = todosLosProductos.filter(p => p.id_categoria == categoriaId);
    }
    if (productosAImprimir.length === 0) { Swal.fire('Atención', 'No hay productos', 'info'); return; }

    const grupos = productosAImprimir.reduce((acc, p) => {
        const catNombre = p.categoria ? p.categoria.cat_nombre : 'SIN CATEGORÍA';
        if (!acc[catNombre]) acc[catNombre] = [];
        acc[catNombre].push(p);
        return acc;
    }, {});

    const { jsPDF } = window.jspdf;
    const numCategorias = Object.keys(grupos).length;
    const altoEstimado = 35 + (numCategorias * 15) + (productosAImprimir.length * 8) + 15;
    const altoFinal = Math.max(100, Math.min(altoEstimado, 280));
    const doc = new jsPDF({ unit: 'mm', format: [80, altoFinal] });
    let y = 8;

    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("JHP MOTOCICLETAS", 40, y, { align: "center" }); y += 5;
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("INVENTARIO FÍSICO", 40, y, { align: "center" }); y += 5;
    doc.setFontSize(7);
    doc.text(`Categoria: ${categoriaNombre}`, 40, y, { align: "center" }); y += 3.5;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 40, y, { align: "center" }); y += 4;
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(5, y, 75, y); y += 5;

    let primeraCategoria = true;
    for (const categoria in grupos) {
        const productos = grupos[categoria];
        if (!primeraCategoria) y += 3;
        primeraCategoria = false;
        const espacioNecesario = (productos.length * 7) + 10;
        if (y + espacioNecesario > altoFinal - 15) { doc.addPage([80, altoFinal]); y = 8; }
        doc.setFontSize(8); doc.setFont("helvetica", "bold");
        doc.text(categoria.toUpperCase(), 5, y); y += 4;
        doc.setDrawColor(100); doc.setLineWidth(0.2); doc.line(5, y, 75, y); y += 3;
        const filas = productos.map(p => [
            { content: `[___] ${p.pro_stock || 0}`, styles: { fontStyle: 'bold', fontSize: 7 } },
            { content: `${p.pro_nombre || 'Sin nombre'}\n${p.pro_codigo || ''}  |  $${parseFloat(p.pro_precio_venta || 0).toFixed(2)}`, styles: { fontSize: 6.5 } }
        ]);
        doc.autoTable({
            startY: y, head: [[
                { content: 'Stock', styles: { fontSize: 6.5, fontStyle: 'bold', halign: 'left' } },
                { content: 'Producto', styles: { fontSize: 6.5, fontStyle: 'bold', halign: 'left' } }
            ]], body: filas, theme: 'plain', margin: { left: 5, right: 5 }, tableWidth: 70,
            styles: { fontSize: 7, cellPadding: 1, lineColor: [220, 220, 220], lineWidth: 0.1, overflow: 'linebreak' },
            headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], lineWidth: 0.3, lineColor: [180, 180, 180], cellPadding: 1.5 },
            columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 48 } },
            bodyStyles: { valign: 'middle', minCellHeight: 6 },
            didDrawCell: function(data) {
                if (data.row.index < filas.length - 1 && data.column.index === 0) {
                    const x = data.cell.x; const rowY = data.cell.y + data.cell.height;
                    doc.setDrawColor(220); doc.setLineDash([0.5, 0.5]);
                    doc.line(x, rowY, x + 70, rowY); doc.setLineDash([]);
                }
            }
        });
        y = doc.lastAutoTable.finalY + 2;
    }

    if (y + 20 > altoFinal) { doc.addPage([80, 40]); y = 8; }
    y += 3; doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(5, y, 75, y); y += 5;
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(`Total productos: ${productosAImprimir.length}`, 40, y, { align: "center" }); y += 7;
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("_________________________", 40, y, { align: "center" }); y += 4;
    doc.text("Firma responsable", 40, y, { align: "center" });
    window.open(doc.output('bloburl'), '_blank');
};