let seccionActual = "Clientes";
let editandoID = null;

const DIAS_SEMANA = [
    { valor: 0, nombre: 'Domingo' },
    { valor: 1, nombre: 'Lunes' },
    { valor: 2, nombre: 'Martes' },
    { valor: 3, nombre: 'Miércoles' },
    { valor: 4, nombre: 'Jueves' },
    { valor: 5, nombre: 'Viernes' },
    { valor: 6, nombre: 'Sábado' },
];

const CONFIG = {
    Clientes: {
        api: "https://jhpapi-production.up.railway.app/api/clientes",
        campos: [
            "cli_nombre", "cli_apaterno", "cli_amaterno", 
            "cli_telefono", "cli_correo", "cli_direccion",
            "cli_password", "cli_password_confirmation", "cli_estado"
        ],
        labels: [
            "Nombre *", "A. Paterno *", "A. Materno", 
            "Teléfono", "Correo *", "Dirección",
            "Contraseña *", "Confirmar Contraseña *", "Estado"
        ],
        columnas: ["ID", "Nombre Completo", "Teléfono", "Correo", "Estado", "Acciones"],
        extraerDatos: (response) => {
            if (response.success && Array.isArray(response.data)) return response.data;
            return [];
        },
        getId: (reg) => reg.id_cliente,
        formatearFila: (reg) => `
            <td>${reg.id_cliente || ''}</td>
            <td>${reg.cli_nombre || ''} ${reg.cli_apaterno || ''} ${reg.cli_amaterno || ''}</td>
            <td>${reg.cli_telefono || 'N/A'}</td>
            <td>${reg.cli_correo || 'N/A'}</td>
            <td><span class="badge bg-${reg.cli_estado === 'Activo' ? 'success' : 'secondary'}">${reg.cli_estado || 'N/A'}</span></td>
        `
    },
    Proveedores: {
        api: "https://jhpapi-production.up.railway.app/api/proveedores",
        apiVisitas: "https://jhpapi-production.up.railway.app/api/proveedor-visitas",
        campos: ["prov_nombre", "prov_contacto", "prov_telefono", "prov_email", "prov_direccion"],
        labels: ["Empresa/Nombre *", "Contacto", "Teléfono", "Email", "Dirección"],
        columnas: ["ID", "Proveedor", "Contacto", "Teléfono", "Email", "Próx. Visita", "Acciones"],
        extraerDatos: (response) => {
            if (Array.isArray(response)) return response;
            if (response.success && Array.isArray(response.data)) return response.data;
            return [];
        },
        getId: (reg) => reg.id_proveedor,
        formatearFila: (reg) => `
            <td>${reg.id_proveedor || ''}</td>
            <td>${reg.prov_nombre || 'N/A'}</td>
            <td>${reg.prov_contacto || 'N/A'}</td>
            <td>${reg.prov_telefono || 'N/A'}</td>
            <td>${reg.prov_email || 'N/A'}</td>
            <td id="proxima-visita-${reg.id_proveedor}" class="text-center">
                <span class="text-muted small">Cargando...</span>
            </td>
        `
    },
    Empleados: {
        api: "https://jhpapi-production.up.railway.app/api/empleados",
        campos: [
            "emp_nombre", "emp_apaterno", "emp_amaterno", 
            "emp_telefono", "emp_rol", "emp_correo", 
            "emp_direccion", "emp_password", "emp_password_confirmation", "emp_estado"
        ],
        labels: [
            "Nombre *", "A. Paterno *", "A. Materno", 
            "Teléfono", "Rol *", "Correo *", 
            "Dirección", "Contraseña *", "Confirmar Contraseña *", "Estado"
        ],
        columnas: ["ID", "Empleado", "Rol", "Correo", "Estado", "Acciones"],
        extraerDatos: (response) => {
            if (response.success && Array.isArray(response.data)) return response.data;
            return [];
        },
        getId: (reg) => reg.id_empleados,
        formatearFila: (reg) => `
            <td>${reg.id_empleados || ''}</td>
            <td>${reg.emp_nombre || ''} ${reg.emp_apaterno || ''} ${reg.emp_amaterno || ''}</td>
            <td>
                <span class="badge bg-${reg.emp_rol === 'Administrador' ? 'danger' : (reg.emp_rol === 'Vendedor' ? 'primary' : 'info')}">
                    ${reg.emp_rol || 'N/A'}
                </span>
            </td>
            <td>${reg.emp_correo || 'N/A'}</td>
            <td>
                <span class="badge bg-${reg.emp_estado === 'Activo' ? 'success' : 'secondary'}">
                    ${reg.emp_estado || 'N/A'}
                </span>
            </td>
        `
    }
};

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

function cargarSeccion(nombre) {
    seccionActual = nombre;
    editandoID = null;
    const btnLabel = document.getElementById("btnLabelRegistro");
    if (btnLabel) btnLabel.innerText = nombre;
    document.querySelectorAll(".nav-link").forEach(btn => {
        btn.classList.toggle("active", btn.innerText.trim() === nombre);
    });
    dibujarCabecera();
    listarRegistros();
}

function dibujarCabecera() {
    const thead = document.getElementById("theadDinamico");
    if (!thead) return;
    let html = "<tr>";
    CONFIG[seccionActual].columnas.forEach(col => html += `<th>${col}</th>`);
    html += "</tr>";
    thead.innerHTML = html;
}

function listarRegistros() {
    const token = localStorage.getItem('token');
    const config = CONFIG[seccionActual];
    fetch(config.api, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(response => {
        const datos = config.extraerDatos(response);
        const registros = Array.isArray(datos) ? datos : [];
        const tbody = document.getElementById("tbodyDinamico");
        if (!tbody) return;
        tbody.innerHTML = "";
        if (registros.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${config.columnas.length}" class="text-center py-4">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p class="text-muted">No hay registros en ${seccionActual}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="window.abrirModalRegistro()">
                    <i class="fas fa-plus"></i> Agregar ${seccionActual.slice(0, -1)}
                </button></td></tr>`;
            return;
        }
        registros.forEach(reg => {
            const fila = document.createElement('tr');
            fila.innerHTML = config.formatearFila(reg);
            const tdAcciones = document.createElement('td');
            tdAcciones.style.whiteSpace = 'nowrap';

            // Botón de visitas (solo Proveedores)
            if (seccionActual === 'Proveedores') {
                const btnVisitas = document.createElement('button');
                btnVisitas.className = 'btn btn-sm btn-info me-1';
                btnVisitas.innerHTML = '<i class="fas fa-calendar-alt"></i>';
                btnVisitas.title = 'Días de visita';
                btnVisitas.onclick = () => abrirModalVisitas(config.getId(reg), reg.prov_nombre);
                tdAcciones.appendChild(btnVisitas);
            }

            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn btn-sm btn-warning me-1';
            btnEditar.innerHTML = '<i class="fas fa-edit"></i>';
            btnEditar.title = 'Editar';
            btnEditar.onclick = () => prepararEdicion(reg);
            tdAcciones.appendChild(btnEditar);

            const esAdmin = seccionActual === 'Empleados' && reg.emp_rol === 'Administrador';
            if (!esAdmin) {
                const btnEliminar = document.createElement('button');
                btnEliminar.className = 'btn btn-sm btn-danger';
                btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
                btnEliminar.title = 'Eliminar';
                btnEliminar.onclick = () => eliminarRegistro(config.getId(reg), reg);
                tdAcciones.appendChild(btnEliminar);
            }
            fila.appendChild(tdAcciones);
            tbody.appendChild(fila);
        });

        // Cargar próximas visitas si es Proveedores
        if (seccionActual === 'Proveedores') {
            setTimeout(cargarProximasVisitas, 500);
        }
    })
    .catch(error => {
        const tbody = document.getElementById("tbodyDinamico");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${CONFIG[seccionActual].columnas.length}" class="text-center py-4">
                <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                <p class="text-danger mb-2">Error al cargar los datos</p>
                <small class="text-muted">${error.message}</small>
                <br><button class="btn btn-sm btn-outline-primary mt-2" onclick="window.listarRegistros()">
                <i class="fas fa-sync"></i> Reintentar</button></td></tr>`;
        }
    });
}

// ==========================================
// PRÓXIMAS VISITAS (PROVEEDORES)
// ==========================================

async function cargarProximasVisitas() {
    const token = localStorage.getItem('token');
    const filas = document.querySelectorAll('#tbodyDinamico tr');

    for (const fila of filas) {
        const celdaVisita = fila.querySelector('[id^="proxima-visita-"]');
        if (!celdaVisita) continue;
        const idProveedor = celdaVisita.id.replace('proxima-visita-', '');

        try {
            const res = await fetch(`${CONFIG.Proveedores.api}/${idProveedor}/proxima-visita`, {
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.data && data.data.fecha_proxima) {
                const fecha = new Date(data.data.fecha_proxima);
                const hoy = new Date();
                const diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

                let badgeClass = 'bg-success';
                if (diffDias <= 1) badgeClass = 'bg-danger';
                else if (diffDias <= 3) badgeClass = 'bg-warning text-dark';

                celdaVisita.innerHTML = `
                    <span class="badge ${badgeClass}">${data.data.dia_nombre}</span><br>
                    <small>${fecha.toLocaleDateString('es-MX')} ${data.data.hora?.substring(0, 5)}</small>
                `;
            } else {
                celdaVisita.innerHTML = `<span class="text-muted small">Sin visita</span>`;
            }
        } catch (e) {
            celdaVisita.innerHTML = `<span class="text-muted small">-</span>`;
        }
    }
}

async function abrirModalVisitas(idProveedor, nombreProveedor) {
    const token = localStorage.getItem('token');

    let visitas = [];
    try {
        const res = await fetch(`${CONFIG.Proveedores.api}/${idProveedor}/visitas`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        visitas = data.success ? data.data : [];
    } catch (e) {}

    let visitasHTML = visitas.length > 0
        ? visitas.map(v => `
            <div class="d-flex align-items-center justify-content-between bg-light p-2 mb-1 rounded">
                <span>
                    <strong>${DIAS_SEMANA[v.dia_semana]?.nombre || '?'}</strong> 
                    a las ${v.hora_visita?.substring(0, 5)}
                </span>
                <button class="btn btn-sm btn-danger" onclick="eliminarVisita(${v.id_visita}, ${idProveedor})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('')
        : '<p class="text-muted text-center">Sin días de visita</p>';

    const { value: formValues } = await Swal.fire({
        title: `📅 Visitas - ${nombreProveedor}`,
        html: `
            <div class="mb-3">
                <label class="form-label fw-bold">Días programados:</label>
                <div id="listaVisitasActuales" style="max-height:150px;overflow-y:auto;">
                    ${visitasHTML}
                </div>
            </div>
            <hr>
            <p class="fw-bold mb-2">Agregar día:</p>
            <div class="row">
                <div class="col-7">
                    <select id="swal-dia-semana" class="form-select">
                        ${DIAS_SEMANA.map(d => `<option value="${d.valor}">${d.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="col-5">
                    <input type="time" id="swal-hora-visita" class="form-control" value="09:00">
                </div>
            </div>
            <input type="hidden" id="swal-id-proveedor" value="${idProveedor}">
        `,
        showCancelButton: true,
        confirmButtonText: 'Agregar día',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#28a745',
        preConfirm: async () => {
            const dia = document.getElementById('swal-dia-semana').value;
            const hora = document.getElementById('swal-hora-visita').value;
            const idProv = document.getElementById('swal-id-proveedor').value;

            if (!hora) { Swal.showValidationMessage('Selecciona una hora'); return false; }

            try {
                const res = await fetch(CONFIG.Proveedores.apiVisitas, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id_proveedor: parseInt(idProv), dia_semana: parseInt(dia), hora_visita: hora + ':00' })
                });
                if (!res.ok) throw new Error('Error al guardar');
                return true;
            } catch (e) {
                Swal.showValidationMessage(e.message);
                return false;
            }
        }
    });

    if (formValues) {
        Swal.fire({ icon: 'success', title: 'Día agregado', timer: 1000, showConfirmButton: false });
        cargarProximasVisitas();
    }
}

async function eliminarVisita(idVisita, idProveedor) {
    const result = await Swal.fire({
        title: '¿Eliminar día?', icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33',
        confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
        await fetch(`${CONFIG.Proveedores.apiVisitas}/${idVisita}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false });
        cargarProximasVisitas();
    } catch (e) {
        Swal.fire('Error', 'No se pudo eliminar', 'error');
    }
}

// ==========================================
// MODAL DE REGISTRO
// ==========================================

function abrirModalRegistro() {
    editandoID = null;
    const titulo = document.getElementById("modalTitulo");
    if (titulo) titulo.innerText = "Nuevo " + seccionActual.slice(0, -1);
    const modal = document.getElementById("modalCatalogo");
    if (modal) { modal.style.display = "flex"; setTimeout(() => generarInputs(), 100); }
}

function generarInputs(datos = null) {
    const contenedor = document.getElementById("inputsDinamicos");
    if (!contenedor) return;
    contenedor.innerHTML = "";
    const config = CONFIG[seccionActual];
    config.campos.forEach((campo, index) => {
        const valor = datos ? (datos[campo] || '') : '';
        let inputHtml = '';
        if (campo === "emp_rol") {
            inputHtml = `<select class="form-select" name="${campo}" required>
                <option value="">Seleccionar rol...</option>
                <option value="Vendedor" ${valor === 'Vendedor' ? 'selected' : ''}>Vendedor</option>
                <option value="Administrador" ${valor === 'Administrador' ? 'selected' : ''}>Administrador</option>
                <option value="Mecanico" ${valor === 'Mecanico' ? 'selected' : ''}>Mecánico</option></select>`;
        } else if (campo === "cli_estado" || campo === "emp_estado") {
            inputHtml = `<select class="form-select" name="${campo}">
                <option value="Activo" ${valor === 'Activo' ? 'selected' : ''}>Activo</option>
                <option value="Inactivo" ${valor === 'Inactivo' ? 'selected' : ''}>Inactivo</option></select>`;
        } else if (campo.includes("direccion")) {
            inputHtml = `<textarea class="form-control" name="${campo}" rows="3" maxlength="255">${valor}</textarea>`;
        } else if (campo.includes("password_confirmation")) {
            const required = editandoID ? '' : 'required';
            const placeholder = editandoID ? 'Repetir nueva contraseña' : 'Repetir contraseña';
            inputHtml = `<input type="password" class="form-control" name="${campo}" placeholder="${placeholder}" ${required} minlength="6" maxlength="50">`;
        } else if (campo.includes("password")) {
            const required = editandoID ? '' : 'required';
            const placeholder = editandoID ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres';
            inputHtml = `<input type="password" class="form-control" name="${campo}" placeholder="${placeholder}" ${required} minlength="6" maxlength="50">
                <small class="text-muted">Debe tener: 1 mayúscula, 1 minúscula, 1 número, 6+ caracteres</small>`;
        } else if (campo.includes("telefono")) {
            inputHtml = `<input type="tel" class="form-control" name="${campo}" value="${valor}" maxlength="10" minlength="10"
                pattern="[0-9]{10}" title="Debe ingresar exactamente 10 dígitos numéricos"
                oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10)" placeholder="Ej: 5512345678">`;
        } else if (campo.includes("email") || campo.includes("correo")) {
            inputHtml = `<input type="email" class="form-control" name="${campo}" value="${valor}" required placeholder="ej: usuario@dominio.com">`;
        } else if (campo.includes("nombre") || campo.includes("apaterno") || campo.includes("amaterno")) {
            const required = (campo === 'emp_amaterno' || campo === 'cli_amaterno') ? '' : 'required';
            const maxlength = campo.includes('nombre') && !campo.includes('apaterno') && !campo.includes('amaterno') ? '100' : '50';
            inputHtml = `<input type="text" class="form-control" name="${campo}" value="${valor}" ${required} maxlength="${maxlength}"
                oninput="this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')"
                placeholder="${campo.includes('amaterno') ? 'Opcional' : 'Requerido'}">`;
        } else {
            const required = (campo === 'emp_amaterno' || campo === 'cli_amaterno' || campo === 'cli_direccion' || campo === 'emp_direccion') ? '' : 'required';
            inputHtml = `<input type="text" class="form-control" name="${campo}" value="${valor}" ${required}>`;
        }
        contenedor.innerHTML += `<div class="mb-3">
            <label class="form-label small fw-bold">${config.labels[index]}</label>
            ${inputHtml}</div>`;
    });
}

function guardarRegistro(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const objeto = Object.fromEntries(formData.entries());
    const passwordField = seccionActual === 'Empleados' ? 'emp_password' : 'cli_password';
    const confirmField = passwordField + '_confirmation';
    const emailField = seccionActual === 'Empleados' ? 'emp_correo' : 'cli_correo';
    const telefonoField = seccionActual === 'Empleados' ? 'emp_telefono' : 'cli_telefono';

    if (objeto[passwordField] && objeto[confirmField]) {
        if (objeto[passwordField] !== objeto[confirmField]) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Las contraseñas no coinciden' }); return;
        }
        const password = objeto[passwordField];
        const errores = [];
        if (password.length < 6) errores.push('• Al menos 6 caracteres');
        if (!/[A-Z]/.test(password)) errores.push('• Al menos una mayúscula (A-Z)');
        if (!/[a-z]/.test(password)) errores.push('• Al menos una minúscula (a-z)');
        if (!/[0-9]/.test(password)) errores.push('• Al menos un número (0-9)');
        if (errores.length > 0) {
            Swal.fire({ icon: 'error', title: 'Contraseña débil', html: 'La contraseña debe cumplir:<br>' + errores.join('<br>') }); return;
        }
    }
    if ((objeto[passwordField] && !objeto[confirmField]) || (!objeto[passwordField] && objeto[confirmField])) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Debe llenar ambos campos de contraseña' }); return;
    }
    if (objeto[telefonoField] && !/^\d{10}$/.test(objeto[telefonoField])) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'El teléfono debe tener exactamente 10 dígitos' }); return;
    }
    if (objeto[emailField] && !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(objeto[emailField])) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Ingrese un correo electrónico válido' }); return;
    }

    Object.keys(objeto).forEach(key => {
        if (objeto[key] === '' && key !== 'cli_estado' && key !== 'emp_estado') delete objeto[key];
    });
    if (editandoID && (!objeto[passwordField] || objeto[passwordField] === '')) {
        delete objeto[passwordField];
        delete objeto[confirmField];
    }

    const token = localStorage.getItem('token');
    const metodo = editandoID ? "PUT" : "POST";
    const url = editandoID ? `${CONFIG[seccionActual].api}/${editandoID}` : CONFIG[seccionActual].api;

    fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(objeto)
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) {
            if (data.errors) throw new Error(Object.values(data.errors).flat().join('<br>'));
            throw new Error(data.message || 'Error del servidor');
        }
        return data;
    })
    .then(data => {
        Swal.fire({ icon: 'success', title: '¡Éxito!', text: data.message || 'Guardado', timer: 1500, showConfirmButton: false });
        cerrarModalCatalogo();
        listarRegistros();
    })
    .catch(error => Swal.fire({ icon: 'error', title: 'Error', html: error.message || 'No se pudo guardar' }));
}

function prepararEdicion(reg) {
    editandoID = CONFIG[seccionActual].getId(reg);
    const titulo = document.getElementById("modalTitulo");
    if (titulo) titulo.innerText = "Editar " + seccionActual.slice(0, -1);
    const modal = document.getElementById("modalCatalogo");
    if (modal) { modal.style.display = "flex"; setTimeout(() => generarInputs(reg), 100); }
}

function eliminarRegistro(id, reg) {
    if (seccionActual === 'Empleados' && reg && reg.emp_rol === 'Administrador') {
        Swal.fire({ icon: 'error', title: 'Acción no permitida', text: 'No se puede eliminar a un Administrador.' }); return;
    }
    Swal.fire({
        title: '¿Eliminar registro?', text: 'Esta acción no se puede deshacer', icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const token = localStorage.getItem('token');
            fetch(`${CONFIG[seccionActual].api}/${id}`, {
                method: "DELETE",
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
            })
            .then(() => {
                Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
                listarRegistros();
            })
            .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar' }));
        }
    });
}

function cerrarModalCatalogo() {
    const modal = document.getElementById("modalCatalogo");
    if (modal) modal.style.display = "none";
    const form = document.getElementById("formCatalogo");
    if (form) form.reset();
    editandoID = null;
}

function filtrarTabla() {
    const filtro = document.getElementById("inputBuscarGral")?.value?.toLowerCase() || '';
    document.querySelectorAll("#tbodyDinamico tr").forEach(fila => {
        fila.style.display = fila.innerText.toLowerCase().includes(filtro) ? "" : "none";
    });
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
setTimeout(() => cargarSeccion('Clientes'), 100);

window.cargarSeccion = cargarSeccion;
window.abrirModalRegistro = abrirModalRegistro;
window.guardarRegistro = guardarRegistro;
window.prepararEdicion = prepararEdicion;
window.eliminarRegistro = eliminarRegistro;
window.cerrarModalCatalogo = cerrarModalCatalogo;
window.filtrarTabla = filtrarTabla;
window.listarRegistros = listarRegistros;