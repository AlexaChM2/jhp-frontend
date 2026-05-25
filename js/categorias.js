var API_CATEGORIAS_CAT = "https://jhpapi-production.up.railway.app/api/categorias";
var API_MARCAS = "https://jhpapi-production.up.railway.app/api/marcas";

if (typeof extraerArray === 'undefined') {
    var extraerArray = function(response) {
        if (Array.isArray(response)) return response;
        if (response.success && Array.isArray(response.data)) return response.data;
        if (response.success && response.data && Array.isArray(response.data.data)) return response.data.data;
        if (response.data && Array.isArray(response.data)) return response.data;
        return [];
    };
}

// ==========================================
// PESTAÑAS
// ==========================================
function mostrarTab(tab) {
    document.querySelectorAll('.nav-tabs .nav-link').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-categorias').style.display = tab === 'categorias' ? 'block' : 'none';
    document.getElementById('tab-marcas').style.display = tab === 'marcas' ? 'block' : 'none';
    
    // Activar el botón correcto
    if (tab === 'categorias') {
        document.querySelectorAll('.nav-tabs .nav-link')[0].classList.add('active');
        listarCategorias();
    } else {
        document.querySelectorAll('.nav-tabs .nav-link')[1].classList.add('active');
        listarMarcas();
    }
}

window.mostrarTab = mostrarTab;

// ==========================================
// CATEGORÍAS
// ==========================================
function listarCategorias() {
    fetch(API_CATEGORIAS_CAT)
        .then(res => res.json())
        .then(response => {
            const categorias = extraerArray(response);
            let tabla = "";
            categorias.forEach(c => {
                tabla += `
                <tr>
                    <td>${c.id_categoria}</td>
                    <td>${c.cat_nombre}</td>
                    <td>${c.cat_descripcion || '-'}</td>
                    <td>
                        <button onclick="editarCategoria(${c.id_categoria})"
                            style="background:#ee8a2d;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="eliminarCategoria(${c.id_categoria})"
                            style="background:#d41f12;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                </tr>`;
            });
            document.getElementById("tablaCategorias").innerHTML = tabla || '<tr><td colspan="4" class="text-center py-3">No hay categorías</td><tr>';
        })
        .catch(err => console.error("Error al listar categorías:", err));
}

function guardarCategorias() {
    const nombre = document.getElementById("categoria_nombre").value.trim();
    if (!nombre) return Swal.fire('Aviso', 'El nombre es obligatorio', 'warning');

    const data = {
        cat_nombre: nombre,
        cat_descripcion: document.getElementById("categoria_descripcion").value.trim()
    };

    fetch(API_CATEGORIAS_CAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error');
        return json;
    })
    .then(() => {
        Swal.fire({ icon: "success", title: "Categoría guardada", showConfirmButton: false, timer: 1500 });
        document.getElementById("categoria_nombre").value = "";
        document.getElementById("categoria_descripcion").value = "";
        listarCategorias();
    })
    .catch(err => Swal.fire({ icon: "error", title: "Error", text: err.message }));
}

function editarCategoria(id) {
    // Obtener los datos actuales de la categoría
    fetch(`${API_CATEGORIAS_CAT}/${id}`)
        .then(res => res.json())
        .then(response => {
            const categoria = response.data || response;
            
            Swal.fire({
                title: 'Editar Categoría',
                html: `
                    <input id="swal-categoria-nombre" class="form-control mb-2" placeholder="Nombre" value="${categoria.cat_nombre || ''}">
                    <input id="swal-categoria-descripcion" class="form-control mb-2" placeholder="Descripción" value="${categoria.cat_descripcion || ''}">
                `,
                showCancelButton: true,
                confirmButtonText: 'Actualizar',
                preConfirm: () => {
                    const nombre = document.getElementById('swal-categoria-nombre').value.trim();
                    if (!nombre) {
                        Swal.showValidationMessage('El nombre es requerido');
                        return false;
                    }
                    return {
                        cat_nombre: nombre,
                        cat_descripcion: document.getElementById('swal-categoria-descripcion').value.trim()
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`${API_CATEGORIAS_CAT}/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(result.value)
                    })
                    .then(async res => {
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.message || 'Error al actualizar');
                        return json;
                    })
                    .then(() => {
                        Swal.fire('¡Actualizada!', 'La categoría ha sido actualizada', 'success');
                        listarCategorias();
                    })
                    .catch(err => Swal.fire('Error', err.message, 'error'));
                }
            });
        })
        .catch(err => Swal.fire('Error', 'No se pudo cargar la categoría', 'error'));
}

function eliminarCategoria(id) {
    Swal.fire({
        title: "¿Seguro?", text: "¡No se podrá recuperar!", icon: "warning",
        showCancelButton: true, confirmButtonColor: "#d33", cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar"
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${API_CATEGORIAS_CAT}/${id}`, { method: "DELETE" })
                .then(() => {
                    Swal.fire("¡Eliminado!", "", "success");
                    listarCategorias();
                });
        }
    });
}

// ==========================================
// MARCAS
// ==========================================
function listarMarcas() {
    fetch(API_MARCAS)
        .then(res => res.json())
        .then(response => {
            const marcas = extraerArray(response);
            let tabla = "";
            marcas.forEach(m => {
                const estadoClass = m.mar_estado === 'Activo' ? 'success' : 'secondary';
                tabla += `
                <tr>
                    <td>${m.id_marca}</td>
                    <td>${m.mar_nombre}</td>
                    <td>${m.mar_descripcion || '-'}</td>
                    <td><span class="badge bg-${estadoClass}">${m.mar_estado || 'Activo'}</span></td>
                    <td>
                        <button onclick="editarMarca(${m.id_marca})"
                            style="background:#ee8a2d;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="eliminarMarca(${m.id_marca})"
                            style="background:#d41f12;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                </tr>`;
            });
            document.getElementById("tablaMarcas").innerHTML = tabla || '</table><td colspan="5" class="text-center py-3">No hay marcas</td><tr>';
        })
        .catch(err => console.error("Error al listar marcas:", err));
}

function guardarMarca() {
    const nombre = document.getElementById("marca_nombre").value.trim();
    if (!nombre) return Swal.fire('Aviso', 'El nombre es obligatorio', 'warning');

    const data = {
        mar_nombre: nombre,
        mar_descripcion: document.getElementById("marca_descripcion").value.trim(),
        mar_estado: document.getElementById("marca_estado").value
    };

    fetch(API_MARCAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Error');
        return json;
    })
    .then(() => {
        Swal.fire({ icon: "success", title: "Marca guardada", showConfirmButton: false, timer: 1500 });
        document.getElementById("marca_nombre").value = "";
        document.getElementById("marca_descripcion").value = "";
        listarMarcas();
    })
    .catch(err => Swal.fire({ icon: "error", title: "Error", text: err.message }));
}

function editarMarca(id) {
    // Obtener los datos actuales de la marca
    fetch(`${API_MARCAS}/${id}`)
        .then(res => res.json())
        .then(response => {
            const marca = response.data || response;
            
            Swal.fire({
                title: 'Editar Marca',
                html: `
                    <input id="swal-marca-nombre" class="form-control mb-2" placeholder="Nombre" value="${marca.mar_nombre || ''}">
                    <input id="swal-marca-descripcion" class="form-control mb-2" placeholder="Descripción" value="${marca.mar_descripcion || ''}">
                    <select id="swal-marca-estado" class="form-select">
                        <option value="Activo" ${marca.mar_estado === 'Activo' ? 'selected' : ''}>Activo</option>
                        <option value="Inactivo" ${marca.mar_estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                    </select>`,
                showCancelButton: true,
                confirmButtonText: 'Actualizar',
                preConfirm: () => {
                    const nombre = document.getElementById('swal-marca-nombre').value.trim();
                    if (!nombre) {
                        Swal.showValidationMessage('El nombre es requerido');
                        return false;
                    }
                    return {
                        mar_nombre: nombre,
                        mar_descripcion: document.getElementById('swal-marca-descripcion').value.trim(),
                        mar_estado: document.getElementById('swal-marca-estado').value
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`${API_MARCAS}/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(result.value)
                    })
                    .then(async res => {
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.message || 'Error al actualizar');
                        return json;
                    })
                    .then(() => {
                        Swal.fire('¡Actualizada!', 'La marca ha sido actualizada', 'success');
                        listarMarcas();
                    })
                    .catch(err => Swal.fire('Error', err.message, 'error'));
                }
            });
        })
        .catch(err => Swal.fire('Error', 'No se pudo cargar la marca', 'error'));
}

function eliminarMarca(id) {
    Swal.fire({
        title: "¿Seguro?", text: "¡No se podrá recuperar!", icon: "warning",
        showCancelButton: true, confirmButtonColor: "#d33", cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar"
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${API_MARCAS}/${id}`, { method: "DELETE" })
                .then(async res => {
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.message || 'Error');
                    return json;
                })
                .then(() => {
                    Swal.fire("¡Eliminado!", "", "success");
                    listarMarcas();
                })
                .catch(err => Swal.fire('Error', err.message, 'error'));
        }
    });
}

// ==========================================
// INICIALIZAR
// ==========================================
// No es necesario exponer con window.xxx si usamos las funciones directamente
// Las funciones ya están en el ámbito global

if (document.getElementById("tablaCategorias")) {
    listarCategorias();
}

document.addEventListener('vista-cargada', function(e) {
    if (e.detail?.vista?.includes('categoria')) {
        setTimeout(listarCategorias, 300);
    }
});