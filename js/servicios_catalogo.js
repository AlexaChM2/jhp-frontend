const API_SERVICIOS = "https://jhpapi-production.up.railway.app/api/servicios";
const API_CATEGORIAS = "https://jhpapi-production.up.railway.app/api/categorias";

// Cargar lista
async function listarServiciosCat() {
    const tbody = document.getElementById("tablaServiciosCat");
    if (!tbody) return;

    try {
        const res = await fetch(API_SERVICIOS);
        const data = await res.json();
        const servicios = data.success ? (data.data?.data || data.data) : data;
        const lista = Array.isArray(servicios) ? servicios : [];

        tbody.innerHTML = lista.map(s => `
            <tr>
                <td>${s.id_servicio}</td>
                <td><strong>${s.ser_nombre}</strong></td>
                <td>${s.ser_descripcion || '-'}</td>
                <td>$${parseFloat(s.ser_precio_mano_obra || 0).toFixed(2)}</td>
                <td>${s.categoria?.cat_nombre || 'Sin categoría'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editarServicioCat(${s.id_servicio})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarServicioCat(${s.id_servicio})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="text-center py-3">No hay servicios registrados</td></tr>';
    } catch (e) {
        console.error(e);
    }
}

// Cargar categorías
async function cargarCategorias() {
    try {
        const res = await fetch(API_CATEGORIAS);
        const data = await res.json();
        const cats = data.success ? (data.data?.data || data.data) : data;
        const lista = Array.isArray(cats) ? cats : [];
        
        const sel = document.getElementById("ser_categoria");
        if (sel) sel.innerHTML = '<option value="">Seleccione...</option>' + 
            lista.map(c => `<option value="${c.id_categoria}">${c.cat_nombre}</option>`).join('');
    } catch (e) {
        console.error(e);
    }
}

// Abrir modal para nuevo
function abrirModalServicioCat() {
    document.getElementById("formServicioCat").reset();
    document.getElementById("servicio_edit_id").value = "";
    document.getElementById("tituloModalServicio").textContent = "Nuevo Servicio";
    cargarCategorias();
    new bootstrap.Modal(document.getElementById('modalServicioCat')).show();
}

// Guardar (crear o editar)
async function guardarServicioCat() {
    const id = document.getElementById("servicio_edit_id").value;
    const nombre = document.getElementById("ser_nombre").value.trim();
    const descripcion = document.getElementById("ser_descripcion").value.trim();
    const precio = parseFloat(document.getElementById("ser_precio").value) || 0;
    const categoria = document.getElementById("ser_categoria").value || null;

    if (!nombre || precio <= 0) {
        return Swal.fire("Aviso", "Nombre y precio son obligatorios", "warning");
    }

    const url = id ? `${API_SERVICIOS}/${id}` : API_SERVICIOS;
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                ser_nombre: nombre,
                ser_descripcion: descripcion,
                ser_precio_mano_obra: precio,
                id_categoria: categoria
            })
        });
        const result = await res.json();
        if (result.success || result.message) {
            Swal.fire({ icon: 'success', title: id ? 'Actualizado' : 'Creado', timer: 1500, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modalServicioCat')).hide();
            listarServiciosCat();
        }
    } catch (e) {
        Swal.fire("Error", e.message, "error");
    }
}

// Editar
async function editarServicioCat(id) {
    try {
        await cargarCategorias();
        const res = await fetch(`${API_SERVICIOS}/${id}`);
        const response = await res.json();
        const s = response.success ? response.data : response;

        document.getElementById("servicio_edit_id").value = s.id_servicio;
        document.getElementById("ser_nombre").value = s.ser_nombre || "";
        document.getElementById("ser_descripcion").value = s.ser_descripcion || "";
        document.getElementById("ser_precio").value = s.ser_precio_mano_obra || 0;
        document.getElementById("ser_categoria").value = s.id_categoria || "";
        document.getElementById("tituloModalServicio").textContent = "Editar Servicio";
        new bootstrap.Modal(document.getElementById('modalServicioCat')).show();
    } catch (e) {
        Swal.fire("Error", "No se pudo cargar", "error");
    }
}

// Eliminar
async function eliminarServicioCat(id) {
    const result = await Swal.fire({
        title: '¿Eliminar?',
        text: 'Este servicio se eliminará del catálogo',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    });
    if (!result.isConfirmed) return;

    try {
        await fetch(`${API_SERVICIOS}/${id}`, { method: 'DELETE' });
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500 });
        listarServiciosCat();
    } catch (e) {
        Swal.fire("Error", "No se pudo eliminar", "error");
    }
}

// Filtrar
function filtrarServicios() {
    const q = document.getElementById("buscarServicioCat")?.value?.toLowerCase() || '';
    document.querySelectorAll("#tablaServiciosCat tr").forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

// Exponer
window.abrirModalServicioCat = abrirModalServicioCat;
window.guardarServicioCat = guardarServicioCat;
window.editarServicioCat = editarServicioCat;
window.eliminarServicioCat = eliminarServicioCat;
window.filtrarServicios = filtrarServicios;

// Init
if (document.getElementById("tablaServiciosCat")) {
    listarServiciosCat();
}