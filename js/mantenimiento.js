const API_MANT = "https://jhpapi-production.up.railway.app/api/mantenimiento";
const API_CLI = "https://jhpapi-production.up.railway.app/api/clientes";
const API_EMP = "https://jhpapi-production.up.railway.app/api/empleados";
const API_SERV = "https://jhpapi-production.up.railway.app/api/servicios";
const API_PROD = "https://jhpapi-production.up.railway.app/api/producto";

let serviciosMant = [];
let insumosMant = [];

// ==========================================
// LISTAR MANTENIMIENTOS
// ==========================================
async function listarMantenimiento() {
    const tbody = document.getElementById("tablaMantenimiento");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></td></tr>';

    try {
        const res = await fetch(API_MANT);
        const response = await res.json();
        const data = response.success ? (response.data?.data || response.data) : response;
        const lista = Array.isArray(data) ? data : [];

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-3">No hay mantenimientos</td></tr>';
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
                    <button class="btn btn-sm btn-info" onclick="window.verMantenimiento(${m.id_mantenimiento})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="window.editarMantenimiento(${m.id_mantenimiento})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>`;
        }).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error al cargar</td></tr>';
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
    } catch (e) { console.error(e); }
}

// ==========================================
// CATÁLOGO DE SERVICIOS
// ==========================================
async function cargarCatalogoServiciosMant() {
    try {
        const res = await fetch(API_SERV);
        const data = await res.json();
        const lista = data.success ? (data.data?.data || data.data) : data;
        const servicios = Array.isArray(lista) ? lista : [];
        const sel = document.getElementById("servicio_id_mant");
        if (sel) sel.innerHTML = '<option value="">Seleccione...</option>' + servicios.map(s => `<option value="${s.id_servicio}" data-precio="${s.ser_precio_mano_obra}">${s.ser_nombre} - $${parseFloat(s.ser_precio_mano_obra).toFixed(2)}</option>`).join('');
    } catch(e) { console.error(e); }
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
    if (!lista || valor.trim().length < 2) { if (lista) lista.style.display = "none"; return; }
    fetch(API_PROD).then(res => res.json()).then(response => {
        const productos = response.success ? (response.data?.data || response.data) : response;
        const datos = Array.isArray(productos) ? productos : [];
        const filtrados = datos.filter(p => p.pro_nombre?.toLowerCase().includes(valor.toLowerCase()) || p.pro_codigo?.toLowerCase().includes(valor.toLowerCase()));
        lista.innerHTML = filtrados.map(p => `<button type="button" class="list-group-item list-group-item-action" onclick="window.seleccionarInsumoMant(${p.id_producto},'${p.pro_nombre}',${p.pro_precio_venta})">${p.pro_nombre} - $${parseFloat(p.pro_precio_venta).toFixed(2)} (Stock: ${p.pro_stock})</button>`).join('');
        lista.style.display = filtrados.length ? "block" : "none";
    });
};

window.seleccionarInsumoMant = function(id, nombre, precio) {
    document.getElementById("buscarInsumoMant").value = nombre;
    document.getElementById("buscarInsumoMant").dataset.idProducto = id;
    document.getElementById("insumo_precio_mant").value = precio;
    document.getElementById("listaResultadosInsumosMant").style.display = "none";
};

// ==========================================
// AGREGAR INSUMO
// ==========================================
window.agregarInsumoMant = function() {
    const id = document.getElementById("buscarInsumoMant").dataset.idProducto;
    const nombre = document.getElementById("buscarInsumoMant").value;
    const cantidad = parseInt(document.getElementById("insumo_cantidad_mant").value) || 1;
    const precio = parseFloat(document.getElementById("insumo_precio_mant").value) || 0;
    if (!id || !nombre) return Swal.fire("Aviso", "Busca y selecciona un producto", "warning");
    insumosMant.push({ id_producto: parseInt(id), nombre, insumo_cantidad: cantidad, insumo_precio_unitario: precio });
    document.getElementById("buscarInsumoMant").value = "";
    delete document.getElementById("buscarInsumoMant").dataset.idProducto;
    document.getElementById("insumo_cantidad_mant").value = 1;
    document.getElementById("insumo_precio_mant").value = 0;
    actualizarTotalesMant();
};

// ==========================================
// ACTUALIZAR TOTALES
// ==========================================
function actualizarTotalesMant() {
    const totalServ = serviciosMant.reduce((s, i) => s + i.precio_aplicado, 0);
    document.getElementById("total_mano_obra_mant").textContent = totalServ.toFixed(2);
    const divS = document.getElementById("listaServiciosAgregadosMant");
    if (divS) divS.innerHTML = serviciosMant.map((s, i) => `<div class="d-flex justify-content-between bg-light p-2 mb-1 rounded"><span>${s.nombre}</span><span>$${s.precio_aplicado.toFixed(2)} <button class="btn btn-sm text-danger" onclick="window.quitarServicioMant(${i})">✕</button></span></div>`).join('');

    const totalIns = insumosMant.reduce((s, i) => s + (i.insumo_cantidad * i.insumo_precio_unitario), 0);
    document.getElementById("total_insumos_mant").textContent = totalIns.toFixed(2);
    const divI = document.getElementById("listaInsumosAgregadosMant");
    if (divI) divI.innerHTML = insumosMant.map((item, i) => `<div class="d-flex justify-content-between bg-light p-2 mb-1 rounded"><span>${item.nombre} x${item.insumo_cantidad}</span><span>$${(item.insumo_cantidad*item.insumo_precio_unitario).toFixed(2)} <button class="btn btn-sm text-danger" onclick="window.quitarInsumoMant(${i})">✕</button></span></div>`).join('');

    document.getElementById("total_general_mant").textContent = (totalServ + totalIns).toFixed(2);
}

window.quitarServicioMant = function(i) { serviciosMant.splice(i, 1); actualizarTotalesMant(); };
window.quitarInsumoMant = function(i) { insumosMant.splice(i, 1); actualizarTotalesMant(); };

// ==========================================
// ABRIR MODAL
// ==========================================
window.abrirModalMantenimiento = function() {
    const form = document.getElementById("formMantenimientoPrev");
    if (form) form.reset();
    serviciosMant = [];
    insumosMant = [];
    actualizarTotalesMant();
    cargarSelectsMant();
    cargarCatalogoServiciosMant();
    new bootstrap.Modal(document.getElementById('modalMantenimientoPrev')).show();
};

// ==========================================
// GUARDAR
// ==========================================
window.guardarMantenimiento = async function() {
    const idCliente = document.getElementById("id_cliente_mant")?.value;
    const idMecanico = document.getElementById("id_mecanico_mant")?.value;
    const modelo = document.getElementById("moto_modelo_mant")?.value;
    const descripcion = document.getElementById("moto_llegada_descripcion_mant")?.value;
    const trabajo = document.getElementById("trabajo_realizado_mant")?.value;
    const estado = document.getElementById("estado_servicio_mant")?.value || "En Proceso";

    if (!idCliente || !idMecanico || !modelo) return Swal.fire("Aviso", "Cliente, Mecánico y Modelo son obligatorios", "warning");

    const body = {
        id_cliente: parseInt(idCliente),
        id_mecanico: parseInt(idMecanico),
        moto_modelo: modelo,
        moto_llegada_descripcion: descripcion,
        trabajo_realizado: trabajo,
        estado_servicio: estado,
        servicios: serviciosMant,
        insumos: insumosMant
    };

    try {
        const res = await fetch(API_MANT, {
            method: 'POST',
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (result.success || result.message) {
            Swal.fire({ icon: 'success', title: '¡Registrado!', timer: 1500, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modalMantenimientoPrev'))?.hide();
            listarMantenimiento();
        }
    } catch (e) { Swal.fire("Error", e.message, "error"); }
};

// ==========================================
// VER DETALLE
// ==========================================
window.verMantenimiento = async function(id) {
    try {
        const res = await fetch(`${API_MANT}/${id}`);
        const response = await res.json();
        const m = response.success ? response.data : response;
        let html = `<div style="font-size:14px;"><table style="width:100%;">
            <tr><td><b>Folio:</b></td><td>#${m.id_mantenimiento}</td></tr>
            <tr><td><b>Cliente:</b></td><td>${m.cliente?.cli_nombre||'S/D'} ${m.cliente?.cli_apaterno||''}</td></tr>
            <tr><td><b>Mecánico:</b></td><td>${m.mecanico?.emp_nombre||'S/D'}</td></tr>
            <tr><td><b>Modelo:</b></td><td>${m.moto_modelo||'N/A'}</td></tr>
            <tr><td><b>Estado:</b></td><td>${m.estado_servicio}</td></tr>
            <tr><td><b>Total:</b></td><td><strong>$${parseFloat(m.mantenimiento_total||0).toFixed(2)}</strong></td></tr>
        </table></div>`;
        Swal.fire({ title: `Mantenimiento #${m.id_mantenimiento}`, html, width: '500px', confirmButtonColor: '#080522' });
    } catch (e) { Swal.fire("Error", "No se pudo cargar", "error"); }
};

// ==========================================
// EDITAR
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

        serviciosMant = m.servicios?.map(s => ({ id_servicio: s.id_servicio, nombre: s.servicio?.ser_nombre||'Servicio', precio_aplicado: parseFloat(s.precio_aplicado||0) })) || [];
        insumosMant = m.insumos?.map(i => ({ id_producto: i.id_producto, nombre: i.producto?.pro_nombre||'Producto', insumo_cantidad: i.insumo_cantidad, insumo_precio_unitario: parseFloat(i.insumo_precio_unitario||0) })) || [];
        actualizarTotalesMant();

        document.getElementById("formMantenimientoPrev").dataset.editarId = id;
        new bootstrap.Modal(document.getElementById('modalMantenimientoPrev')).show();
    } catch (e) { Swal.fire("Error", "No se pudo cargar", "error"); }
};

// ==========================================
// INICIALIZAR
// ==========================================
window.listarMantenimiento = listarMantenimiento;

if (document.getElementById("tablaMantenimiento")) {
    listarMantenimiento();
}