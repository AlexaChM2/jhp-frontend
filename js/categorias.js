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
    document.querySelector(`.nav-link`).classList.add('active');
    if (tab === 'categorias') listarCategorias();
    if (tab === 'marcas') listarMarcas();
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
                        <button onclick="window.eliminarCategoria(${c.id_categoria})"
                            style="background:#d41f12;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fa-regular fa-trash-can"></i></button>
                    </td>
                </tr>`;
            });
            document.getElementById("tablaCategorias").innerHTML = tabla || '<tr><td colspan="4" class="text-center py-3">No hay categorías</td></tr>';
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

//editar categoria
// ==========================================
// EDITAR CATEGORÍA
// ==========================================
function editarCategoria(id) {
    // Primero obtener los datos actuales de la categoría
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
                        listarCategorias(); // Recargar la tabla
                    })
                    .catch(err => Swal.fire('Error', err.message, 'error'));
                }
            });
        })
        .catch(err => Swal.fire('Error', 'No se pudo cargar la categoría', 'error'));
}

// Exponer la función globalmente
window.editarCategoria = editarCategoria;

// ==========================================
// MARCAS
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
                        <button onclick="window.editarCategoria(${c.id_categoria})"
                            style="background:#ee8a2d;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.eliminarCategoria(${c.id_categoria})"
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
    Swal.fire({
        title: 'Editar Marca',
        html: `
            <input id="swal-marca-nombre" class="form-control mb-2" placeholder="Nombre">
            <input id="swal-marca-descripcion" class="form-control mb-2" placeholder="Descripción">
            <select id="swal-marca-estado" class="form-select">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
            </select>`,
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        preConfirm: () => {
            const nombre = document.getElementById('swal-marca-nombre').value.trim();
            if (!nombre) { Swal.showValidationMessage('Nombre requerido'); return false; }
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
            .then(res => res.json())
            .then(() => {
                Swal.fire('Actualizado', '', 'success');
                listarMarcas();
            });
        }
    });
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
// EXPONER E INICIALIZAR
// ==========================================
window.listarCategorias = listarCategorias;
window.guardarCategorias = guardarCategorias;
window.eliminarCategoria = eliminarCategoria;
window.listarMarcas = listarMarcas;
window.guardarMarca = guardarMarca;
window.editarMarca = editarMarca;
window.eliminarMarca = eliminarMarca;

if (document.getElementById("tablaCategorias")) listarCategorias();

document.addEventListener('vista-cargada', function(e) {
    if (e.detail?.vista?.includes('categoria')) {
        setTimeout(listarCategorias, 300);
    }
});