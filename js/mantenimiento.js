const API_MANT = "https://jhpapi-production.up.railway.app/api/mantenimiento";
const API_CLI = "https://jhpapi-production.up.railway.app/api/clientes";
const API_EMP = "https://jhpapi-production.up.railway.app/api/empleados";
const API_SERV = "https://jhpapi-production.up.railway.app/api/servicios";
const API_PROD = "https://jhpapi-production.up.railway.app/api/producto";

let serviciosMant = [];
let insumosMant = [];
let insumosOriginalesMap = new Map();

// ==========================================
// ASEGURAR LIBRERÍAS PDF
// ==========================================
async function asegurarLibreriasPDF() {
    let jsPDFLib = null;
    
    if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
        jsPDFLib = window.jspdf.jsPDF;
    } else if (typeof jspdf !== 'undefined') {
        jsPDFLib = jspdf;
    } else if (typeof window.jsPDF !== 'undefined') {
        jsPDFLib = window.jsPDF;
    }
    
    if (!jsPDFLib) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        await new Promise(r => setTimeout(r, 100));
    }
    
    return jsPDFLib || window.jspdf?.jsPDF || jspdf || window.jsPDF;
}

// ==========================================
// LISTAR MANTENIMIENTOS
// ==========================================
async function listarMantenimiento() {
    const tbody = document.getElementById("tablaMantenimiento");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></td></tr>';

    try {
        const res = await fetch(API_MANT);
        const response = await res.json();
        const data = response.success ? (response.data?.data || response.data) : response;
        const lista = Array.isArray(data) ? data : [];

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3">No hay mantenimientos</td></tr>';
            document.getElementById("totalMantPendientes").textContent = '0';
            document.getElementById("totalMantCompletados").textContent = '0';
            document.getElementById("totalMantProximos").textContent = '-';
            return;
        }

        tbody.innerHTML = lista.map(m => {
            const estadoClass = m.estado_servicio === 'Terminado' || m.estado_servicio === 'Entregado' ? 'success' :
                               m.estado_servicio === 'En Proceso' ? 'info' : 'warning';
            return `
            <tr>
                <td><strong>#${m.id_mantenimiento}</strong></td>
                <td>${m.cliente ? (m.cliente.cli_nombre||'')+' '+(m.cliente.cli_apaterno||'') : 'S/D'}</td>
                <td>${m.moto_modelo || 'N/A'}</td>
                <td>${m.mecanico ? m.mecanico.emp_nombre : 'S/D'}</td>
                <td>$${parseFloat(m.mantenimiento_total||0).toFixed(2)}</td>
                <td><span class="badge bg-${estadoClass}">${m.estado_servicio||'Pendiente'}</span></td>
                <td>
                    <button onclick="window.verMantenimiento(${m.id_mantenimiento})" title="Ver Detalle"
                        style="background:#1756b6;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="window.editarMantenimiento(${m.id_mantenimiento})" title="Editar"
                        style="background:#ffc107;color:#000;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.descargarPDFMantenimiento(${m.id_mantenimiento})" title="Ver PDF"
                        style="background:#17791f;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="window.eliminarMantenimiento(${m.id_mantenimiento})" title="Eliminar"
                        style="background:#dc3545;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        const pendientes = lista.filter(s => s.estado_servicio !== 'Terminado' && s.estado_servicio !== 'Entregado').length;
        const completados = lista.filter(s => s.estado_servicio === 'Terminado' || s.estado_servicio === 'Entregado').length;

        document.getElementById("totalMantPendientes").textContent = pendientes;
        document.getElementById("totalMantCompletados").textContent = completados;
        document.getElementById("totalMantProximos").textContent = '-';

    } catch (e) {
        console.error('❌ Error listando:', e);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar</td></tr>';
    }
}

// ==========================================
// CARGAR SELECTS
// ==========================================
async function cargarSelectsMant() {
    try {
        const [resCli, resEmp] = await Promise.all([fetch(API_CLI), fetch(API_EMP)]);
        const dataCli = await resCli.json();
        const dataEmp = await resEmp.json();
        const clientes = dataCli.success ? (dataCli.data?.data || dataCli.data) : dataCli;
        const empleados = dataEmp.success ? (dataEmp.data?.data || dataEmp.data) : dataEmp;
        const listaCli = Array.isArray(clientes) ? clientes : [];
        const listaEmp = Array.isArray(empleados) ? empleados : [];

        const selCli = document.getElementById("id_cliente_mant");
        const selMec = document.getElementById("id_mecanico_mant");
        if (selCli) selCli.innerHTML = '<option value="">Seleccione...</option>' + listaCli.map(c => `<option value="${c.id_cliente}">${c.cli_nombre||''} ${c.cli_apaterno||''}</option>`).join('');
        if (selMec) selMec.innerHTML = '<option value="">Seleccione...</option>' + listaEmp.filter(e => e.emp_rol==='Mecanico'||e.emp_rol==='Mecánico').map(e => `<option value="${e.id_empleados}">${e.emp_nombre}</option>`).join('');
    } catch (e) { console.error('Error selects:', e); }
}

// ==========================================
// CARGAR CATÁLOGO DE SERVICIOS
// ==========================================
async function cargarCatalogoServiciosMant() {
    try {
        const res = await fetch(API_SERV);
        const data = await res.json();
        const lista = data.success ? (data.data?.data || data.data) : data;
        const servicios = Array.isArray(lista) ? lista : [];
        const sel = document.getElementById("servicio_id_mant");
        if (sel) sel.innerHTML = '<option value="">Seleccione...</option>' + servicios.map(s => `<option value="${s.id_servicio}" data-precio="${s.ser_precio_mano_obra}">${s.ser_nombre} - $${parseFloat(s.ser_precio_mano_obra).toFixed(2)}</option>`).join('');
    } catch(e) { console.error('Error servicios:', e); }
}

// ==========================================
// AGREGAR SERVICIO
// ==========================================
window.agregarServicioMant = function() {
    const sel = document.getElementById("servicio_id_mant");
    const precio = parseFloat(document.getElementById("servicio_precio_mant")?.value) || 0;
    if (!sel?.value || precio <= 0) return Swal.fire("Aviso", "Selecciona un servicio y asigna precio", "warning");
    
    serviciosMant.push({
        id_servicio: parseInt(sel.value),
        nombre: sel.options[sel.selectedIndex].text.split(' - ')[0],
        precio_aplicado: precio
    });
    
    sel.value = "";
    document.getElementById("servicio_precio_mant").value = "0";
    actualizarTotalesMant();
};

// ==========================================
// BUSCAR INSUMO
// ==========================================
window.buscarInsumoMant = function(valor) {
    const lista = document.getElementById("listaResultadosInsumosMant");
    if (!lista || valor.trim().length < 2) { 
        if (lista) lista.style.display = "none"; 
        return; 
    }
    
    fetch(API_PROD).then(res => res.json()).then(response => {
        const productos = response.success ? (response.data?.data || response.data) : response;
        const datos = Array.isArray(productos) ? productos : [];
        const filtrados = datos.filter(p => 
            p.pro_nombre?.toLowerCase().includes(valor.toLowerCase()) || 
            p.pro_codigo?.toLowerCase().includes(valor.toLowerCase())
        );
        
        lista.innerHTML = filtrados.map(p => `
            <button type="button" class="list-group-item list-group-item-action" 
                onclick="window.seleccionarInsumoMant(${p.id_producto},'${p.pro_nombre.replace(/'/g, "\\'")}',${p.pro_precio_venta},${p.pro_stock})">
                ${p.pro_nombre} - $${parseFloat(p.pro_precio_venta).toFixed(2)} (Stock: ${p.pro_stock})
            </button>`).join('');
        lista.style.display = filtrados.length ? "block" : "none";
    });
};

window.seleccionarInsumoMant = function(id, nombre, precio, stock) {
    document.getElementById("buscarInsumoMant").value = nombre;
    document.getElementById("buscarInsumoMant").dataset.idProducto = id;
    document.getElementById("buscarInsumoMant").dataset.stock = stock;
    document.getElementById("insumo_precio_mant").value = precio;
    document.getElementById("listaResultadosInsumosMant").style.display = "none";
};

// ==========================================
// AGREGAR INSUMO (PERMITE AGREGAR MÁS)
// ==========================================
window.agregarInsumoMant = function() {
    const id = document.getElementById("buscarInsumoMant").dataset.idProducto;
    const nombre = document.getElementById("buscarInsumoMant").value;
    const cantidad = parseInt(document.getElementById("insumo_cantidad_mant").value) || 1;
    const precio = parseFloat(document.getElementById("insumo_precio_mant").value) || 0;
    const stock = parseInt(document.getElementById("buscarInsumoMant").dataset.stock) || 0;
    
    if (!id || !nombre) return Swal.fire("Aviso", "Busca y selecciona un producto", "warning");
    if (cantidad <= 0) return Swal.fire("Aviso", "La cantidad debe ser mayor a 0", "warning");
    
    const existente = insumosMant.find(i => i.id_producto === parseInt(id));
    
    if (existente) {
        const cantidadTotal = existente.insumo_cantidad + cantidad;
        const stockDisponible = stock - existente.insumo_cantidad;
        
        if (cantidad > stockDisponible) {
            return Swal.fire("Aviso", `Stock insuficiente. Disponible adicional: ${stockDisponible}`, "warning");
        }
        
        Swal.fire({
            title: 'Producto existente',
            html: `
                <p><strong>${nombre}</strong> ya está en la lista con ${existente.insumo_cantidad} unidad(es).</p>
                <p>¿Deseas agregar ${cantidad} más?</p>
                <p class="text-muted">Total: ${cantidadTotal} unidad(es)</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, agregar más',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745'
        }).then((result) => {
            if (result.isConfirmed) {
                existente.insumo_cantidad += cantidad;
                existente.modificado = true;
                
                document.getElementById("buscarInsumoMant").value = "";
                delete document.getElementById("buscarInsumoMant").dataset.idProducto;
                document.getElementById("insumo_cantidad_mant").value = 1;
                document.getElementById("insumo_precio_mant").value = 0;
                
                actualizarTotalesMant();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Cantidad actualizada',
                    text: `Ahora tienes ${existente.insumo_cantidad} unidad(es) de ${nombre}`,
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        });
    } else {
        if (cantidad > stock) {
            return Swal.fire("Aviso", `Stock insuficiente. Disponible: ${stock}`, "warning");
        }
        
        insumosMant.push({ 
            id_producto: parseInt(id), 
            nombre, 
            insumo_cantidad: cantidad, 
            insumo_precio_unitario: precio,
            esOriginal: false,
            modificado: true
        });
        
        document.getElementById("buscarInsumoMant").value = "";
        delete document.getElementById("buscarInsumoMant").dataset.idProducto;
        document.getElementById("insumo_cantidad_mant").value = 1;
        document.getElementById("insumo_precio_mant").value = 0;
        
        actualizarTotalesMant();
        
        Swal.fire({
            icon: 'success',
            title: 'Producto agregado',
            timer: 1000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }
};

// ==========================================
// ACTUALIZAR TOTALES
// ==========================================
function actualizarTotalesMant() {
    // Servicios
    const totalServ = serviciosMant.reduce((s, i) => s + i.precio_aplicado, 0);
    const elServ = document.getElementById("total_mano_obra_mant");
    if (elServ) elServ.textContent = totalServ.toFixed(2);
    
    const divS = document.getElementById("listaServiciosAgregadosMant");
    if (divS) {
        divS.innerHTML = serviciosMant.map((s, i) => `
            <div class="d-flex justify-content-between align-items-center bg-light p-2 mb-1 rounded">
                <span><i class="fas fa-wrench text-success me-2"></i>${s.nombre}</span>
                <span>$${s.precio_aplicado.toFixed(2)} 
                    <button class="btn btn-sm text-danger" onclick="window.quitarServicioMant(${i})" title="Eliminar servicio">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
            </div>`).join('');
    }

    // Insumos
    const totalIns = insumosMant.reduce((s, i) => s + (i.insumo_cantidad * i.insumo_precio_unitario), 0);
    const elIns = document.getElementById("total_insumos_mant");
    if (elIns) elIns.textContent = totalIns.toFixed(2);
    
    const divI = document.getElementById("listaInsumosAgregadosMant");
    if (divI) {
        divI.innerHTML = insumosMant.map((item, i) => {
            const esOriginal = item.esOriginal && !item.modificado;
            let botones = '';
            
            if (esOriginal) {
                botones = `
                    <span class="badge bg-warning text-dark ms-2" title="Insumo original - No modificable">
                        <i class="fas fa-lock"></i> Original
                    </span>`;
            } else if (item.esOriginal && item.modificado) {
                const cantidadOriginal = insumosOriginalesMap.get(item.id_producto) || item.insumo_cantidad;
                botones = `
                    <button class="btn btn-sm btn-outline-warning ms-1" onclick="window.restaurarCantidadInsumo(${i})" title="Restaurar cantidad original (${cantidadOriginal})">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="btn btn-sm text-danger ms-1" onclick="window.reducirInsumoMant(${i})" title="Reducir cantidad">
                        <i class="fas fa-minus"></i>
                    </button>`;
            } else {
                botones = `
                    <button class="btn btn-sm text-danger" onclick="window.quitarInsumoMant(${i})" title="Eliminar insumo">
                        <i class="fas fa-trash"></i>
                    </button>`;
            }
            
            const claseFila = esOriginal ? 'border border-warning' : (item.modificado ? 'border border-info' : '');
            
            return `
            <div class="d-flex justify-content-between align-items-center bg-light p-2 mb-1 rounded ${claseFila}">
                <span>
                    <i class="fas fa-box text-primary me-2"></i>
                    ${item.nombre} 
                    <strong>x${item.insumo_cantidad}</strong>
                </span>
                <span>
                    $${(item.insumo_cantidad * item.insumo_precio_unitario).toFixed(2)}
                    ${botones}
                </span>
            </div>`;
        }).join('');
    }

    // Total general
    const elTotal = document.getElementById("total_general_mant");
    if (elTotal) elTotal.textContent = (totalServ + totalIns).toFixed(2);
}

// ==========================================
// QUITAR SERVICIO
// ==========================================
window.quitarServicioMant = function(i) { 
    serviciosMant.splice(i, 1); 
    actualizarTotalesMant(); 
};

// ==========================================
// QUITAR INSUMO (SOLO NUEVOS)
// ==========================================
window.quitarInsumoMant = function(i) { 
    const item = insumosMant[i];
    
    if (item.esOriginal && !item.modificado) {
        Swal.fire({
            icon: 'warning',
            title: 'No se puede eliminar',
            text: 'Este insumo ya fue registrado. No se puede eliminar, solo modificar.',
            confirmButtonColor: '#3085d6'
        });
        return;
    }
    
    insumosMant.splice(i, 1); 
    actualizarTotalesMant(); 
};

// ==========================================
// REDUCIR CANTIDAD DE INSUMO
// ==========================================
window.reducirInsumoMant = function(i) {
    const item = insumosMant[i];
    
    Swal.fire({
        title: 'Reducir cantidad',
        html: `
            <p>Cantidad actual: <strong>${item.insumo_cantidad}</strong></p>
            <input type="number" id="nuevaCantidad" class="form-control" 
                   min="1" max="${item.insumo_cantidad}" value="${item.insumo_cantidad}">
        `,
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        preConfirm: () => {
            const nuevaCantidad = parseInt(document.getElementById('nuevaCantidad').value);
            if (!nuevaCantidad || nuevaCantidad < 1) {
                Swal.showValidationMessage('Cantidad inválida');
                return false;
            }
            return nuevaCantidad;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            item.insumo_cantidad = result.value;
            item.modificado = true;
            actualizarTotalesMant();
        }
    });
};

// ==========================================
// RESTAURAR CANTIDAD ORIGINAL
// ==========================================
window.restaurarCantidadInsumo = function(i) {
    const item = insumosMant[i];
    const cantidadOriginal = insumosOriginalesMap.get(item.id_producto);
    
    if (cantidadOriginal) {
        item.insumo_cantidad = cantidadOriginal;
        item.modificado = false;
        actualizarTotalesMant();
        
        Swal.fire({
            icon: 'success',
            title: 'Restaurado',
            text: 'Cantidad restaurada a la original',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }
};

// ==========================================
// ABRIR MODAL
// ==========================================
window.abrirModalMantenimiento = function() {
    const form = document.getElementById("formMantenimientoPrev");
    if (form) form.reset();
    delete form?.dataset.editarId;
    
    serviciosMant = [];
    insumosMant = [];
    insumosOriginalesMap = new Map();
    
    actualizarTotalesMant();
    cargarSelectsMant();
    cargarCatalogoServiciosMant();
    
    document.getElementById("tituloModalMant").textContent = "Nuevo Mantenimiento";
    document.getElementById("btnGuardarMant").innerHTML = '<i class="fas fa-save me-2"></i>Guardar';
    
    new bootstrap.Modal(document.getElementById('modalMantenimientoPrev')).show();
};

// ==========================================
// GUARDAR MANTENIMIENTO (EL BACKEND MANEJA EL STOCK)
// ==========================================
window.guardarMantenimiento = async function() {
    const form = document.getElementById("formMantenimientoPrev");
    const idEditar = form?.dataset?.editarId;
    const idCliente = document.getElementById("id_cliente_mant")?.value;
    const idMecanico = document.getElementById("id_mecanico_mant")?.value;
    const modelo = document.getElementById("moto_modelo_mant")?.value;
    const descripcion = document.getElementById("moto_llegada_descripcion_mant")?.value;
    const trabajo = document.getElementById("trabajo_realizado_mant")?.value;
    const estado = document.getElementById("estado_servicio_mant")?.value || "En Proceso";

    if (!idCliente || !idMecanico || !modelo) {
        return Swal.fire("Aviso", "Cliente, Mecánico y Modelo son obligatorios", "warning");
    }

    const url = idEditar ? `${API_MANT}/${idEditar}` : API_MANT;
    const method = idEditar ? 'PUT' : 'POST';

    const body = {
        id_cliente: parseInt(idCliente),
        id_mecanico: parseInt(idMecanico),
        moto_modelo: modelo,
        moto_llegada_descripcion: descripcion,
        trabajo_realizado: trabajo,
        estado_servicio: estado,
        servicios: serviciosMant,
        insumos: insumosMant.map(i => ({
            id_producto: i.id_producto,
            insumo_cantidad: i.insumo_cantidad,
            insumo_precio_unitario: i.insumo_precio_unitario
        }))
    };

    try {
        Swal.fire({
            title: 'Guardando...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(body)
        });
        
        const result = await res.json();
        
        if (result.success || res.ok) {
            Swal.fire({ 
                icon: 'success', 
                title: idEditar ? '¡Actualizado!' : '¡Registrado!', 
                timer: 1500, 
                showConfirmButton: false 
            });
            
            bootstrap.Modal.getInstance(document.getElementById('modalMantenimientoPrev'))?.hide();
            listarMantenimiento();
        } else {
            throw new Error(result.message || 'Error del servidor');
        }
    } catch (e) { 
        console.error('Error:', e);
        Swal.fire("Error", e.message, "error"); 
    }
};

// ==========================================
// VER MANTENIMIENTO
// ==========================================
window.verMantenimiento = async function(id) {
    try {
        const res = await fetch(`${API_MANT}/${id}`);
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
                <tr><td style="padding:5px;font-weight:bold;">Trabajo:</td><td>${m.trabajo_realizado||'Pendiente'}</td></tr>
                <tr><td style="padding:5px;font-weight:bold;">Estado:</td><td><span style="background:${estadoColor};color:white;padding:3px 10px;border-radius:12px;">${m.estado_servicio||'Pendiente'}</span></td></tr>
            </table>`;

        if (m.servicios?.length > 0) {
            html += `<hr><strong>🔧 Mano de Obra:</strong>
            <table style="width:100%;font-size:12px;margin-top:5px;">
                <tr style="background:#d3a934;color:white;"><th style="padding:5px;">Servicio</th><th style="padding:5px;text-align:right;">Precio</th></tr>`;
            let totalServ = 0;
            m.servicios.forEach(s => {
                totalServ += parseFloat(s.precio_aplicado||0);
                html += `<tr><td style="padding:5px;">${s.servicio?.ser_nombre||'Servicio #'+s.id_servicio}</td><td style="text-align:right;">$${parseFloat(s.precio_aplicado||0).toFixed(2)}</td></tr>`;
            });
            html += `<tr style="font-weight:bold;background:#f8f9fa;"><td style="text-align:right;">Total:</td><td style="text-align:right;">$${totalServ.toFixed(2)}</td></tr></table>`;
        }

        if (m.insumos?.length > 0) {
            html += `<br><strong>📦 Insumos:</strong>
            <table style="width:100%;font-size:12px;margin-top:5px;">
                <tr style="background:#1b297a;color:white;"><th style="padding:5px;">Producto</th><th style="text-align:center;">Cant</th><th style="text-align:right;">P.Unit</th><th style="text-align:right;">Sub</th></tr>`;
            let totalIns = 0;
            m.insumos.forEach(i => {
                const sub = (i.insumo_cantidad||0)*(i.insumo_precio_unitario||0);
                totalIns += sub;
                html += `<tr><td style="padding:5px;">${i.producto?.pro_nombre||'Producto'}</td><td style="text-align:center;">${i.insumo_cantidad}</td><td style="text-align:right;">$${parseFloat(i.insumo_precio_unitario||0).toFixed(2)}</td><td style="text-align:right;">$${sub.toFixed(2)}</td></tr>`;
            });
            html += `<tr style="font-weight:bold;background:#f8f9fa;"><td colspan="3" style="text-align:right;">Total:</td><td style="text-align:right;">$${totalIns.toFixed(2)}</td></tr></table>`;
        }

        html += `<div style="text-align:right;margin-top:15px;font-size:18px;"><strong>TOTAL: $${parseFloat(m.mantenimiento_total||0).toFixed(2)}</strong></div></div>`;

        Swal.fire({ title: `Mantenimiento #${m.id_mantenimiento}`, html: html, width: '650px', confirmButtonColor: '#080522' });
    } catch (e) { Swal.fire("Error", "No se pudo cargar", "error"); }
};

// ==========================================
// EDITAR MANTENIMIENTO
// ==========================================
window.editarMantenimiento = async function(id) {
    try {
        await cargarSelectsMant();
        await cargarCatalogoServiciosMant();
        
        const res = await fetch(`${API_MANT}/${id}`);
        const response = await res.json();
        const m = response.success ? response.data : response;

        document.getElementById("id_cliente_mant").value = m.id_cliente || "";
        document.getElementById("id_mecanico_mant").value = m.id_mecanico || "";
        document.getElementById("moto_modelo_mant").value = m.moto_modelo || "";
        document.getElementById("moto_llegada_descripcion_mant").value = m.moto_llegada_descripcion || "";
        document.getElementById("trabajo_realizado_mant").value = m.trabajo_realizado || "";
        document.getElementById("estado_servicio_mant").value = m.estado_servicio || "En Proceso";

        serviciosMant = m.servicios?.map(s => ({ 
            id_servicio: s.id_servicio, 
            nombre: s.servicio?.ser_nombre||'Servicio', 
            precio_aplicado: parseFloat(s.precio_aplicado||0) 
        })) || [];
        
        insumosMant = m.insumos?.map(i => ({ 
            id_producto: i.id_producto, 
            nombre: i.producto?.pro_nombre||'Producto', 
            insumo_cantidad: i.insumo_cantidad, 
            insumo_precio_unitario: parseFloat(i.insumo_precio_unitario||0),
            esOriginal: true,
            modificado: false
        })) || [];
        
        insumosOriginalesMap = new Map();
        insumosMant.forEach(item => {
            insumosOriginalesMap.set(item.id_producto, item.insumo_cantidad);
        });
        
        actualizarTotalesMant();

        document.getElementById("formMantenimientoPrev").dataset.editarId = id;
        document.getElementById("tituloModalMant").textContent = `Editar Mantenimiento #${id}`;
        document.getElementById("btnGuardarMant").innerHTML = '<i class="fas fa-save me-2"></i>Actualizar';
        
        new bootstrap.Modal(document.getElementById('modalMantenimientoPrev')).show();
        
    } catch (e) { 
        console.error('Error editar:', e);
        Swal.fire("Error", "No se pudo cargar", "error"); 
    }
};

// ==========================================
// ELIMINAR MANTENIMIENTO
// ==========================================
window.eliminarMantenimiento = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar mantenimiento?',
        text: 'Se devolverá el stock de los productos',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        Swal.fire({
            title: 'Eliminando...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const resDel = await fetch(`${API_MANT}/${id}`, { method: 'DELETE' });
        
        if (resDel.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'Mantenimiento eliminado y stock restaurado',
                timer: 2000,
                showConfirmButton: false
            });
            listarMantenimiento();
        } else {
            throw new Error('Error al eliminar');
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar', 'error');
    }
};

// ==========================================
// DESCARGAR PDF
// ==========================================
window.descargarPDFMantenimiento = async function(id) {
    try {
        const jsPDFLib = await asegurarLibreriasPDF();
        if (!jsPDFLib) throw new Error('No se pudo cargar jsPDF');
        
        const res = await fetch(`${API_MANT}/${id}`);
        const response = await res.json();
        const m = response.success ? response.data : response;
        
        const doc = new jsPDFLib({ unit: 'mm', format: 'a4' });
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("JHP - Taller Mecánico", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Orden de Mantenimiento", 105, 22, { align: "center" });
        doc.line(10, 25, 200, 25);
        
        let y = 32;
        
        function addPDFLine(doc, label, value, y) {
            doc.setFont("helvetica", "bold");
            doc.text(label, 15, y);
            doc.setFont("helvetica", "normal");
            doc.text(value || '-', 65, y);
            return y + 7;
        }
        
        function formatearFecha(fecha) {
            if (!fecha) return '-';
            const d = new Date(fecha);
            return d.toLocaleDateString('es-MX');
        }
        
        y = addPDFLine(doc, "Folio:", `#${m.id_mantenimiento}`, y);
        y = addPDFLine(doc, "Fecha:", formatearFecha(m.fecha_inicio), y);
        y = addPDFLine(doc, "Cliente:", m.cliente ? `${m.cliente.cli_nombre} ${m.cliente.cli_apaterno}` : 'S/D', y);
        y = addPDFLine(doc, "Mecánico:", m.mecanico ? m.mecanico.emp_nombre : 'S/D', y);
        y = addPDFLine(doc, "Modelo:", m.moto_modelo || 'N/A', y);
        y = addPDFLine(doc, "Estado:", m.estado_servicio || 'Pendiente', y);
        y = addPDFLine(doc, "Descripción:", m.moto_llegada_descripcion || '-', y);
        y = addPDFLine(doc, "Trabajo Realizado:", m.trabajo_realizado || 'Pendiente', y);
        
        if (m.servicios?.length > 0) {
            y += 5;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Servicios (Mano de Obra)", 15, y);
            y += 6;
            
            const filas = m.servicios.map(s => [
                s.servicio?.ser_nombre || 'Servicio #' + s.id_servicio,
                `$${parseFloat(s.precio_aplicado || 0).toFixed(2)}`
            ]);
            const total = m.servicios.reduce((sum, s) => sum + parseFloat(s.precio_aplicado || 0), 0);
            filas.push(["TOTAL MANO DE OBRA", `$${total.toFixed(2)}`]);
            
            if (typeof doc.autoTable === 'function') {
                doc.autoTable({
                    startY: y,
                    head: [['Servicio', 'Precio']],
                    body: filas,
                    theme: 'striped',
                    headStyles: { fillColor: [253, 126, 20] },
                    margin: { left: 15, right: 15 },
                    styles: { fontSize: 9 }
                });
                y = doc.lastAutoTable.finalY + 5;
            }
        }
        
        if (m.insumos?.length > 0) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Insumos Utilizados", 15, y);
            y += 6;
            
            const filas = m.insumos.map(i => {
                const sub = (i.insumo_cantidad || 0) * (i.insumo_precio_unitario || 0);
                return [
                    i.producto?.pro_nombre || 'Producto',
                    String(i.insumo_cantidad || 0),
                    `$${parseFloat(i.insumo_precio_unitario || 0).toFixed(2)}`,
                    `$${sub.toFixed(2)}`
                ];
            });
            const total = m.insumos.reduce((sum, i) => sum + (i.insumo_cantidad || 0) * (i.insumo_precio_unitario || 0), 0);
            filas.push(["TOTAL INSUMOS", "", "", `$${total.toFixed(2)}`]);
            
            if (typeof doc.autoTable === 'function') {
                doc.autoTable({
                    startY: y,
                    head: [['Producto', 'Cant', 'P. Unit.', 'Subtotal']],
                    body: filas,
                    theme: 'striped',
                    headStyles: { fillColor: [13, 110, 253] },
                    margin: { left: 15, right: 15 },
                    styles: { fontSize: 9 }
                });
                y = doc.lastAutoTable.finalY + 8;
            }
        }
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL: $${parseFloat(m.mantenimiento_total || 0).toFixed(2)}`, 190, y, { align: "right" });
        
        doc.setFontSize(8);
        doc.text("JHP Taller Mecánico - Orden de Mantenimiento", 105, 285, { align: "center" });
        
        const pdfBlob = doc.output('blob');
        window.open(URL.createObjectURL(pdfBlob), '_blank');
        
    } catch (e) {
        console.error('Error PDF:', e);
        Swal.fire("Error", "No se pudo generar el PDF: " + e.message, "error");
    }
};

// ==========================================
// EXPONER FUNCIONES GLOBALES
// ==========================================
window.listarMantenimiento = listarMantenimiento;
window.agregarServicioMant = window.agregarServicioMant;
window.buscarInsumoMant = window.buscarInsumoMant;
window.seleccionarInsumoMant = window.seleccionarInsumoMant;
window.agregarInsumoMant = window.agregarInsumoMant;
window.quitarServicioMant = window.quitarServicioMant;
window.quitarInsumoMant = window.quitarInsumoMant;
window.reducirInsumoMant = window.reducirInsumoMant;
window.restaurarCantidadInsumo = window.restaurarCantidadInsumo;
window.abrirModalMantenimiento = window.abrirModalMantenimiento;
window.guardarMantenimiento = window.guardarMantenimiento;
window.verMantenimiento = window.verMantenimiento;
window.editarMantenimiento = window.editarMantenimiento;
window.eliminarMantenimiento = window.eliminarMantenimiento;
window.descargarPDFMantenimiento = window.descargarPDFMantenimiento;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('vista-cargada', function(e) {
    if (e.detail && e.detail.vista && 
        (e.detail.vista.includes('mantenimiento') || e.detail.vista.includes('Mantenimiento'))) {
        setTimeout(listarMantenimiento, 300);
    }
});

if (document.getElementById("tablaMantenimiento")) {
    listarMantenimiento();
}

console.log('✅ Módulo de mantenimiento cargado (v2.0 - Stock manejado por backend)');