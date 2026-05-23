const API_CATEGORIAS = "https://jhpapi-production.up.railway.app/api/categorias";


listarCategorias();

function listarCategorias() {
   
    fetch(API_CATEGORIAS)
        .then(res => res.json())
        .then(data => {
            
            let tabla = "";
            data.forEach(c => {
                tabla += `
                <tr>
                    <td>${c.id_categoria}</td>
                    <td>${c.cat_nombre}</td>
                    <td>${c.cat_descripcion}</td>
                    <td>
                        <button  onclick="eliminarCategoria(${c.id_categoria})"
           style="background: #d41f12; color: white; border: none; border-radius: 10px; padding: 8px 12px; cursor: pointer; margin: 2px;">                    
                        <i class="fa-regular fa-trash-can"></i></button>
                    </td>
                </tr>`;
            });


            
      document.getElementById("tablaCategorias").innerHTML = tabla;
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