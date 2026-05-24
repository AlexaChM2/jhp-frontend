const API_CATEGORIAS = "https://jhpapi-production.up.railway.app/api/categorias";


listarCategorias();

function listarCategorias() {
    fetch(API_CATEGORIAS)
        .then(res => res.json())
        .then(response => {
            const data = response.success ? response.data : response;
            const categorias = Array.isArray(data) ? data : [];
            
            let tabla = "";
            categorias.forEach(c => {
                tabla += `
                <tr>
                    <td>${c.id_categoria}</td>
                    <td>${c.cat_nombre}</td>
                    <td>${c.cat_descripcion}</td>
                    <td>
                        <button onclick="window.eliminarCategoria(${c.id_categoria})"
                            style="background:#d41f12;color:white;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;margin:2px;">
                            <i class="fa-regular fa-trash-can"></i></button>
                    </td>
                </tr>`;
            });
            document.getElementById("tablaCategorias").innerHTML = tabla || '<tr><td colspan="4" class="text-center py-3">No hay categorías</td></tr>';
        })
        .catch(err => console.error("Error al listar categorias:", err));
}
//CI
function guardarCategorias() {
    const categorias = {
        // IDs
        cat_nombre: document.getElementById("categoria_nombre").value,
        cat_descripcion: document.getElementById("categoria_descripcion").value
    };

    fetch(API_CATEGORIAS, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categorias)
    })
 .then(res => res.json())
    .then(() => {
       Swal.fire({        
            icon: "success",
            title: "categoria guardada",
            showConfirmButton: false,
            timer: 1500
        }); 
  document.getElementById("categoria_nombre").value="";
       document.getElementById("categoria_descripcion").value="";
       listarCategorias();
})
 .catch(err => {
        Swal.fire({
            icon: "error",
            title: "Error al guardar",
            text: "No se pudo conectar con el servidor"
        });
    });
}
function eliminarCategoria(id_categoria) {
    Swal.fire({
        title: "¿seguro?",
        text: "¡no se podra recuperar!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: " #080522",
        cancelButtonColor: "#b30505",
        confirmButtonText: "Si eliminar",
        cancelButtonText: "Cancelar"
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(API_CATEGORIAS + "/" + id_categoria, { method: "DELETE" })
            .then(() => {
                Swal.fire("¡Eliminado!", "El registro ha sido borrado.", "success");
                listarCategorias();
            });
        }
    });
}

// Exponer
window.listarCategorias = listarCategorias;
window.guardarCategorias = guardarCategorias;
window.eliminarCategoria = eliminarCategoria;

// Inicialización
function intentarInicializar() {
    if (document.getElementById("tablaCategorias")) {
        listarCategorias();
    }
}

intentarInicializar();

document.addEventListener('vista-cargada', function(e) {
    if (e.detail && e.detail.vista && e.detail.vista.includes('categoria')) {
        setTimeout(listarCategorias, 300);
    }
});

setTimeout(intentarInicializar, 500);