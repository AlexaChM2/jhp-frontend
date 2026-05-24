var API_CITA_CITAS = "https://jhpapi-production.up.railway.app/api/citas";
var API_CLI_CITAS = "https://jhpapi-production.up.railway.app/api/clientes";
var API_EMP_CITAS = "https://jhpapi-production.up.railway.app/api/empleados";

let clienteIdCita = null;
let empleadoIdCita = null;
let editandoCitaId = null;
let citasExistentes = [];
let calendarVisual = null;
let calendarSelector = null;
let fechaSeleccionadaGlobal = null;
let isLoadingCitas = false;
let isInitialized = false;

const CONFIG = {
    HORARIO: {
        INICIO: 9,
        FIN: 18,
        DIAS_LABORALES: [1, 2, 3, 4, 5],
        DURACION_MINIMA_HORAS: 3
    },
    COLORES: {
        DISPONIBLE: '#28a745',
        NO_DISPONIBLE: '#dc3545',
        PARCIAL: '#ffc107'
    }
};

// ========== FUNCIÓN PRINCIPAL DE INICIALIZACIÓN ==========
async function inicializarVistaCitas() {
    console.log('🔄 Inicializando vista de citas...');
    
    // Limpiar estado anterior completamente
    limpiarEstado();
    
    try {
        // Cargar datos necesarios en paralelo
        await Promise.all([
            cargarCitasExistentes(),
            cargarSelectEmpleadosAsync()
        ]);
        
        // Inicializar componentes visuales
        inicializarCalendarioVisual();
        listarCitas();
        configurarBusquedaLocal();
        
        // Marcar como inicializado
        isInitialized = true;
        console.log('✅ Vista de citas inicializada correctamente');
        
    } catch (err) {
        console.error('❌ Error al inicializar vista de citas:', err);
        // Inicializar de todos modos para no dejar la vista vacía
        inicializarCalendarioVisual();
        listarCitas();
        isInitialized = true;
    }
}

function limpiarEstado() {
    // Destruir calendarios existentes para evitar duplicados y fugas de memoria
    if (calendarVisual) {
        try {
            calendarVisual.destroy();
        } catch(e) {
            console.warn('Error al destruir calendarVisual:', e);
        }
        calendarVisual = null;
    }
    
    if (calendarSelector) {
        try {
            calendarSelector.destroy();
        } catch(e) {
            console.warn('Error al destruir calendarSelector:', e);
        }
        calendarSelector = null;
    }
    
    // Limpiar variables de estado
    citasExistentes = [];
    clienteIdCita = null;
    empleadoIdCita = null;
    editandoCitaId = null;
    fechaSeleccionadaGlobal = null;
    isLoadingCitas = false;
    isInitialized = false;
}

// ========== INICIALIZAR CALENDARIO VISUAL (CITAS REGISTRADAS) ==========
async function inicializarCalendarioVisual() {
    const calendarEl = document.getElementById('calendarioVisual');
    if (!calendarEl) {
        console.warn('⚠️ Elemento calendarioVisual no encontrado en el DOM');
        return;
    }
    
    // Destruir instancia anterior si existe
    if (calendarVisual) {
        try {
            calendarVisual.destroy();
        } catch(e) {
            console.warn('Error al destruir calendario visual anterior:', e);
        }
        calendarVisual = null;
    }
    
    try {
        await cargarCitasExistentes();
        
        const eventos = citasExistentes.map(cita => {
            const cliente = cita.cliente ? 
                `${cita.cliente.cli_nombre || ''} ${cita.cliente.cli_apaterno || ''}`.trim() : 
                'Cliente sin asignar';
            
            let color = '#17a2b8'; // Color por defecto para Pendiente
            if (cita.cita_estado === 'Realizada') color = '#28a745';
            if (cita.cita_estado === 'Cancelada') color = '#dc3545';
            if (cita.cita_estado === 'Confirmada') color = '#007bff';
            
            // Validar que la fecha sea válida
            const fechaCita = new Date(cita.cita_fecha_programada);
            if (isNaN(fechaCita.getTime())) {
                console.warn(`Fecha inválida para cita #${cita.id_cita}:`, cita.cita_fecha_programada);
                return null;
            }
            
            return {
                id: cita.id_cita,
                title: `${cliente.substring(0, 20)} - ${(cita.cita_motivo || 'Cita').substring(0, 30)}`,
                start: cita.cita_fecha_programada,
                backgroundColor: color,
                borderColor: color,
                textColor: 'white',
                extendedProps: {
                    estado: cita.cita_estado || 'Pendiente',
                    empleado: cita.empleado?.emp_nombre || 'Sin asignar',
                    cliente: cliente,
                    motivo: cita.cita_motivo || 'Sin motivo'
                }
            };
        }).filter(evento => evento !== null); // Filtrar eventos con fechas inválidas
        
        calendarVisual = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            height: 'auto',
            events: eventos,
            eventClick: function(info) {
                const props = info.event.extendedProps;
                Swal.fire({
                    title: `Cita #${info.event.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Cliente:</strong> ${props.cliente}</p>
                            <p><strong>Fecha:</strong> ${info.event.start.toLocaleString('es-MX')}</p>
                            <p><strong>Estado:</strong> 
                                <span class="badge bg-${props.estado === 'Realizada' ? 'success' : 
                                    props.estado === 'Cancelada' ? 'danger' : 
                                    props.estado === 'Confirmada' ? 'primary' : 'warning'}">
                                    ${props.estado}
                                </span>
                            </p>
                            <p><strong>Empleado:</strong> ${props.empleado}</p>
                            <p><strong>Motivo:</strong> ${props.motivo}</p>
                        </div>
                    `,
                    icon: 'info',
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#3085d6'
                });
            },
            eventDidMount: function(info) {
                // Agregar tooltip
                const props = info.event.extendedProps;
                info.el.title = `${props.cliente}\nEstado: ${props.estado}\nEmpleado: ${props.empleado}`;
            }
        });
        
        calendarVisual.render();
        console.log('✅ Calendario visual renderizado con', eventos.length, 'eventos');
        
    } catch (error) {
        console.error('❌ Error al inicializar calendario visual:', error);
        // Mostrar mensaje de error en el contenedor del calendario
        if (calendarEl) {
            calendarEl.innerHTML = `
                <div class="alert alert-warning m-3">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Error al cargar el calendario. Por favor, recargue la página.
                </div>
            `;
        }
    }
}

// ========== INICIALIZAR CALENDARIO SELECCIONABLE (EN MODAL) ==========
async function inicializarCalendarioSelector() {
    const calendarEl = document.getElementById('calendarioSelector');
    if (!calendarEl) {
        console.warn('⚠️ Elemento calendarioSelector no encontrado');
        return;
    }
    
    // Destruir instancia anterior si existe
    if (calendarSelector) {
        try {
            calendarSelector.destroy();
        } catch(e) {
            console.warn('Error al destruir calendario selector anterior:', e);
        }
        calendarSelector = null;
    }
    
    try {
        await cargarCitasExistentes();
        
        calendarSelector = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: ''
            },
            height: 'auto',
            validRange: {
                start: new Date()
            },
            dateClick: function(info) {
                seleccionarFecha(info.date);
            },
            dayCellDidMount: function(info) {
                aplicarColorDiaSelector(info);
            },
            datesSet: function() {
                // Re-aplicar colores cuando cambia el mes
                setTimeout(() => {
                    document.querySelectorAll('.fc-daygrid-day').forEach(dayEl => {
                        const dateStr = dayEl.getAttribute('data-date');
                        if (dateStr) {
                            const fecha = new Date(dateStr + 'T00:00:00');
                            const info = { date: fecha, el: dayEl };
                            aplicarColorDiaSelector(info);
                        }
                    });
                }, 100);
            }
        });
        
        calendarSelector.render();
        console.log('✅ Calendario selector renderizado');
        
    } catch (error) {
        console.error('❌ Error al inicializar calendario selector:', error);
        if (calendarEl) {
            calendarEl.innerHTML = `
                <div class="alert alert-warning m-3">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Error al cargar el selector de fechas.
                </div>
            `;
        }
    }
}

function aplicarColorDiaSelector(info) {
    const fecha = info.date;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Días pasados
    if (fecha < hoy) {
        info.el.style.backgroundColor = '#e9ecef';
        info.el.style.pointerEvents = 'none';
        info.el.style.opacity = '0.5';
        info.el.style.cursor = 'not-allowed';
        return;
    }
    
    // Validar día laboral
    const diaSemana = fecha.getDay();
    let diaJS = diaSemana === 0 ? 7 : diaSemana;
    
    if (!CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS)) {
        info.el.style.backgroundColor = '#e9ecef';
        info.el.style.color = '#6c757d';
        info.el.style.borderRadius = '8px';
        info.el.style.cursor = 'not-allowed';
        info.el.style.opacity = '0.6';
        info.el.title = 'No laborable';
        return;
    }
    
    // Verificar disponibilidad
    const disponibilidad = obtenerDisponibilidadDia(fecha);
    
    switch(disponibilidad) {
        case 'completa':
            info.el.style.backgroundColor = CONFIG.COLORES.DISPONIBLE;
            info.el.style.color = 'white';
            info.el.style.borderRadius = '8px';
            info.el.style.cursor = 'pointer';
            info.el.style.opacity = '1';
            info.el.title = 'Disponible';
            break;
        case 'parcial':
            info.el.style.backgroundColor = CONFIG.COLORES.PARCIAL;
            info.el.style.color = 'black';
            info.el.style.borderRadius = '8px';
            info.el.style.cursor = 'pointer';
            info.el.style.opacity = '1';
            info.el.title = 'Disponibilidad parcial';
            break;
        case 'no_disponible':
            info.el.style.backgroundColor = CONFIG.COLORES.NO_DISPONIBLE;
            info.el.style.color = 'white';
            info.el.style.borderRadius = '8px';
            info.el.style.opacity = '0.7';
            info.el.style.cursor = 'not-allowed';
            info.el.title = 'Sin disponibilidad';
            break;
    }
}

function obtenerDisponibilidadDia(fecha) {
    const diaSemana = fecha.getDay();
    let diaJS = diaSemana === 0 ? 7 : diaSemana;
    
    if (!CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS)) {
        return 'no_disponible';
    }
    
    const horariosDisponibles = obtenerHorariosDisponiblesSync(fecha);
    const totalHorarios = CONFIG.HORARIO.FIN - CONFIG.HORARIO.INICIO - CONFIG.HORARIO.DURACION_MINIMA_HORAS + 1;
    
    if (horariosDisponibles.length === 0) {
        return 'no_disponible';
    } else if (horariosDisponibles.length < totalHorarios * 0.5) {
        return 'parcial';
    } else {
        return 'completa';
    }
}

function obtenerHorariosDisponiblesSync(fecha) {
    const fechaStr = fecha.toDateString();
    const citasDia = citasExistentes.filter(cita => {
        if (!cita.cita_fecha_programada) return false;
        const fechaCita = new Date(cita.cita_fecha_programada);
        return !isNaN(fechaCita.getTime()) && fechaCita.toDateString() === fechaStr;
    });
    
    const horasOcupadas = new Set();
    citasDia.forEach(cita => {
        const fechaCita = new Date(cita.cita_fecha_programada);
        const inicio = fechaCita.getHours();
        for (let i = 0; i < CONFIG.HORARIO.DURACION_MINIMA_HORAS; i++) {
            horasOcupadas.add(inicio + i);
        }
    });
    
    const horariosDisponibles = [];
    for (let hora = CONFIG.HORARIO.INICIO; hora <= CONFIG.HORARIO.FIN - CONFIG.HORARIO.DURACION_MINIMA_HORAS; hora++) {
        let ocupado = false;
        for (let h = hora; h < hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS; h++) {
            if (horasOcupadas.has(h)) {
                ocupado = true;
                break;
            }
        }
        if (!ocupado) {
            horariosDisponibles.push({
                inicio: hora,
                fin: hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS,
                texto: `${hora.toString().padStart(2, '0')}:00 - ${(hora + CONFIG.HORARIO.DURACION_MINIMA_HORAS).toString().padStart(2, '0')}:00`
            });
        }
    }
    
    return horariosDisponibles;
}

async function seleccionarFecha(fecha) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fecha < hoy) {
        Swal.fire({
            icon: 'warning',
            title: 'Fecha no válida',
            text: 'No se pueden seleccionar fechas pasadas',
            confirmButtonColor: '#3085d6'
        });
        return;
    }
    
    // Validar día laboral
    const diaSemana = fecha.getDay();
    let diaJS = diaSemana === 0 ? 7 : diaSemana;
    if (!CONFIG.HORARIO.DIAS_LABORALES.includes(diaJS)) {
        Swal.fire({
            icon: 'warning',
            title: 'Día no laborable',
            text: 'Solo se agendan citas de lunes a viernes',
            confirmButtonColor: '#3085d6'
        });
        return;
    }
    
    fechaSeleccionadaGlobal = fecha;
    const horariosDisponibles = obtenerHorariosDisponiblesSync(fecha);
    
    if (horariosDisponibles.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Sin disponibilidad',
            text: 'No hay horarios disponibles para esta fecha',
            confirmButtonColor: '#3085d6'
        });
        return;
    }
    
    mostrarHorariosDisponiblesModal(horariosDisponibles, fecha);
}

function mostrarHorariosDisponiblesModal(horarios, fecha) {
    const container = document.getElementById('listaHorariosDisponibles');
    const horariosContainer = document.getElementById('horariosContainer');
    
    if (!container || !horariosContainer) {
        console.error('❌ Contenedores de horarios no encontrados');
        return;
    }
    
    // Limpiar selección anterior
    document.getElementById("cita_fecha").value = "";
    
    const fechaFormateada = fecha.toLocaleDateString('es-MX', {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    container.innerHTML = `
        <div class="w-100 mb-2">
            <small class="text-muted">
                <i class="fas fa-calendar-day"></i> ${fechaFormateada} - 
                ${horarios.length} horario(s) disponible(s)
            </small>
        </div>
        ${horarios.map(horario => `
            <button type="button" 
                    class="btn btn-outline-success seleccionar-horario-btn" 
                    data-inicio="${horario.inicio}"
                    data-fin="${horario.fin}"
                    style="border-radius: 8px; padding: 10px 20px; transition: all 0.3s;">
                <i class="fas fa-clock me-1"></i> ${horario.texto}
            </button>
        `).join('')}
    `;
    
    horariosContainer.style.display = 'block';
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.seleccionar-horario-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const horaInicio = parseInt(this.dataset.inicio);
            const fechaHora = new Date(fecha);
            fechaHora.setHours(horaInicio, 0, 0, 0);
            
            // Formatear fecha para el input
            const año = fechaHora.getFullYear();
            const mes = String(fechaHora.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaHora.getDate()).padStart(2, '0');
            const hora = String(horaInicio).padStart(2, '0');
            
            const fechaFormateada = `${año}-${mes}-${dia}T${hora}:00`;
            document.getElementById("cita_fecha").value = fechaFormateada;
            
            // Actualizar estilos visuales
            document.querySelectorAll('.seleccionar-horario-btn').forEach(b => {
                b.classList.remove('btn-success');
                b.classList.add('btn-outline-success');
            });
            this.classList.remove('btn-outline-success');
            this.classList.add('btn-success');
            
            // Mostrar confirmación
            Swal.fire({
                icon: 'success',
                title: 'Horario seleccionado',
                text: `Cita programada para el ${fechaHora.toLocaleString('es-MX', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`,
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        });
    });
}

// ========== CARGAR CITAS EXISTENTES ==========
async function cargarCitasExistentes() {
    try {
        const res = await fetch(API_CITA_CITAS);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        
        const response = await res.json();
        
        if (response.success) {
            const data = response.data?.data || response.data || [];
            citasExistentes = Array.isArray(data) ? data : [];
        } else {
            citasExistentes = Array.isArray(response) ? response : [];
        }
        
        console.log(`📋 ${citasExistentes.length} citas cargadas`);
        return citasExistentes;
        
    } catch (error) {
        console.error("❌ Error cargando citas:", error);
        citasExistentes = [];
        return [];
    }
}

// ========== LISTAR CITAS EN TABLA ==========
async function listarCitas() {
    const tbody = document.getElementById("tablaCitas");
    if (!tbody) {
        console.warn('⚠️ Elemento tablaCitas no encontrado');
        return;
    }
    
    // Evitar llamadas concurrentes
    if (isLoadingCitas) {
        console.log('⏳ Carga de citas en progreso, esperando...');
        return;
    }
    
    isLoadingCitas = true;
    
    try {
        // Mostrar indicador de carga
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2 text-muted">Cargando citas...</p>
                </td>
            </tr>
        `;
        
        const filtro = document.getElementById("inputBuscarCitaLocal")?.value.toLowerCase().trim() || '';
        
        const res = await fetch(API_CITA_CITAS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const response = await res.json();
        const data = response.success ? (response.data?.data || response.data) : response;
        let citas = Array.isArray(data) ? data : [];
        
        // Aplicar filtro si existe
        if (filtro) {
            citas = citas.filter(c => {
                const folio = `#${c.id_cita}`;
                const cliente = c.cliente ? 
                    `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.toLowerCase() : '';
                const empleado = c.empleado?.emp_nombre?.toLowerCase() || '';
                const motivo = c.cita_motivo?.toLowerCase() || '';
                
                return folio.includes(filtro) || 
                       cliente.includes(filtro) || 
                       empleado.includes(filtro) ||
                       motivo.includes(filtro);
            });
        }

        // Mostrar mensaje si no hay resultados
        if (citas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <p class="text-muted">${filtro ? 'No se encontraron citas con el filtro aplicado' : 'No hay citas registradas'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Renderizar tabla
        tbody.innerHTML = citas.map(c => {
            const cliente = c.cliente ? 
                `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() : 
                'Sin cliente';
            const empleado = c.empleado?.emp_nombre || 'Sin asignar';
            const estadoClass = c.cita_estado === 'Realizada' ? 'success' : 
                               c.cita_estado === 'Cancelada' ? 'danger' : 
                               c.cita_estado === 'Confirmada' ? 'primary' : 'warning';
            const fechaStr = c.cita_fecha_programada ? 
                new Date(c.cita_fecha_programada).toLocaleString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '-';

            return `
            <tr class="cita-row" data-id="${c.id_cita}">
                <td><strong>#${c.id_cita}</strong></td>
                <td>${fechaStr}</td>
                <td>${cliente}</td>
                <td>${empleado}</td>
                <td>${c.cita_motivo || 'N/A'}</td>
                <td><span class="badge bg-${estadoClass}">${c.cita_estado || 'Pendiente'}</span></td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-success" 
                                onclick="window.prepararServicio(${c.id_cita})" 
                                title="Iniciar Servicio"
                                ${c.cita_estado === 'Cancelada' ? 'disabled' : ''}>
                            <i class="fas fa-tools"></i>
                        </button>
                        <button class="btn btn-warning" 
                                onclick="window.editarCita(${c.id_cita})" 
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" 
                                onclick="window.eliminarCita(${c.id_cita})" 
                                title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        
        console.log(`📊 Tabla actualizada con ${citas.length} citas`);
        
    } catch (err) {
        console.error("❌ Error al listar citas:", err);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <p class="text-danger">Error al cargar las citas</p>
                    <button class="btn btn-primary btn-sm" onclick="window.listarCitas()">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </td>
            </tr>
        `;
    } finally {
        isLoadingCitas = false;
    }
}

// ========== CARGAR SELECT DE EMPLEADOS ==========
async function cargarSelectEmpleadosAsync() {
    try {
        const res = await fetch(API_EMP_CITAS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const response = await res.json();
        const empleados = response.success ? (response.data?.data || response.data) : response;
        const datos = Array.isArray(empleados) ? empleados : [];
        
        const sel = document.getElementById("id_empleado_select");
        if (sel) {
            sel.innerHTML = '<option value="">Seleccione empleado...</option>' +
                datos.map(e => 
                    `<option value="${e.id_empleados}">${e.emp_nombre} ${e.emp_apaterno || ''} (${e.emp_rol || 'Sin rol'})</option>`
                ).join('');
            console.log(`👥 ${datos.length} empleados cargados en select`);
        }
        return datos;
        
    } catch (err) {
        console.error("❌ Error cargando empleados:", err);
        const sel = document.getElementById("id_empleado_select");
        if (sel) {
            sel.innerHTML = '<option value="">Error al cargar empleados</option>';
        }
        return [];
    }
}

// Mantener función original para compatibilidad
function cargarSelectEmpleados() {
    cargarSelectEmpleadosAsync();
}

// ========== BUSCAR CLIENTE ==========
function buscarClienteCita(v) {
    const lista = document.getElementById("resCliCita");
    if (!lista) return;
    
    if (v.length < 2) { 
        lista.style.display = "none"; 
        return; 
    }

    lista.style.display = "block";
    lista.innerHTML = `
        <div class="list-group-item text-center text-muted">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            Buscando...
        </div>
    `;

    fetch(API_CLI_CITAS)
        .then(res => res.json())
        .then(response => {
            const clientes = response.success ? (response.data?.data || response.data) : response;
            const datos = Array.isArray(clientes) ? clientes : [];
            const filtrados = datos.filter(c => {
                const nombre = `${c.cli_nombre || ''} ${c.cli_apaterno || ''}`.toLowerCase();
                return nombre.includes(v.toLowerCase());
            });
            
            if (filtrados.length === 0) {
                lista.innerHTML = `
                    <div class="list-group-item text-center text-muted">
                        <i class="fas fa-user-slash"></i> No se encontraron clientes
                    </div>
                `;
            } else {
                lista.innerHTML = filtrados.map(c => {
                    const nombre = `${c.cli_nombre || ''} ${c.cli_apaterno || ''}`.trim();
                    return `
                    <button type="button" class="list-group-item list-group-item-action" 
                        onclick="window.seleccionarClienteCita(${c.id_cliente}, '${nombre.replace(/'/g, "\\'")}')">
                        <i class="fas fa-user me-2"></i>${nombre || 'Sin nombre'}
                        ${c.cli_telefono ? `<small class="text-muted d-block">📞 ${c.cli_telefono}</small>` : ''}
                    </button>`;
                }).join('');
            }
            lista.style.display = "block";
        })
        .catch(err => {
            console.error("Error buscando clientes:", err);
            lista.innerHTML = `
                <div class="list-group-item text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i> Error al buscar
                </div>
            `;
        });
}

function seleccionarClienteCita(id, nombre) {
    clienteIdCita = id;
    const inputBusqueda = document.getElementById("busCliCita");
    if (inputBusqueda) {
        inputBusqueda.value = nombre;
    }
    const lista = document.getElementById("resCliCita");
    if (lista) {
        lista.style.display = "none";
    }
    console.log(`👤 Cliente seleccionado: ${nombre} (ID: ${id})`);
}

function seleccionarEmpleadoCita(id, nombre) {
    empleadoIdCita = parseInt(id);
    console.log(`👨‍💼 Empleado seleccionado: ${nombre} (ID: ${id})`);
}

// ========== PREPARAR SERVICIO ==========
function prepararServicio(idCita) {
    localStorage.setItem('id_cita_seleccionada', idCita);
    if (typeof window.cargarVista === 'function') {
        window.cargarVista('views/servicios.html');
    } else {
        console.warn('⚠️ Función cargarVista no disponible');
        Swal.fire({
            icon: 'info',
            title: 'Redirigiendo',
            text: 'Cargando vista de servicios...',
            timer: 1500
        });
    }
}

// ========== ABRIR MODAL ==========
async function abrirModalCita() {
    const modal = document.getElementById("modalCita");
    if (!modal) {
        console.error('❌ Modal no encontrado');
        return;
    }
    
    try {
        modal.style.display = "flex";
        document.getElementById("tituloModalCita").textContent = "Nueva Cita";
        
        // Resetear formulario
        document.getElementById("busCliCita").value = "";
        document.getElementById("cita_motivo").value = "";
        document.getElementById("cita_estado").value = "Pendiente";
        document.getElementById("cita_tipo").value = "Servicio";
        document.getElementById("cita_fecha").value = "";
        
        const horariosContainer = document.getElementById("horariosContainer");
        if (horariosContainer) {
            horariosContainer.style.display = "none";
        }
        
        // Resetear IDs
        editandoCitaId = null;
        clienteIdCita = null;
        empleadoIdCita = null;
        fechaSeleccionadaGlobal = null;
        
        // Cargar datos
        await cargarSelectEmpleadosAsync();
        await cargarCitasExistentes();
        
        // Pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
            inicializarCalendarioSelector();
        }, 200);
        
        console.log('✅ Modal de cita abierto');
        
    } catch (error) {
        console.error('❌ Error al abrir modal:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo abrir el formulario de cita'
        });
    }
}

function cerrarModalCita() {
    const modal = document.getElementById("modalCita");
    if (modal) {
        modal.style.display = "none";
    }
    
    // Limpiar calendario selector
    if (calendarSelector) {
        try {
            calendarSelector.destroy();
        } catch(e) {
            console.warn('Error al destruir calendario selector:', e);
        }
        calendarSelector = null;
    }
    
    // Resetear variables
    editandoCitaId = null;
    clienteIdCita = null;
    empleadoIdCita = null;
    fechaSeleccionadaGlobal = null;
    
    console.log('🔒 Modal de cita cerrado');
}

// ========== GUARDAR CITA ==========
async function guardarCita(e) {
    if (e) e.preventDefault();
    
    // Validar empleado
    const selEmp = document.getElementById("id_empleado_select");
    if (selEmp && selEmp.value) {
        empleadoIdCita = parseInt(selEmp.value);
    }
    
    // Validaciones
    if (!clienteIdCita) {
        return Swal.fire({
            icon: 'warning',
            title: 'Cliente requerido',
            text: 'Selecciona un cliente para la cita'
        });
    }
    
    if (!empleadoIdCita) {
        return Swal.fire({
            icon: 'warning',
            title: 'Empleado requerido',
            text: 'Selecciona un empleado para la cita'
        });
    }
    
    const fechaSeleccionada = document.getElementById("cita_fecha").value;
    if (!fechaSeleccionada) {
        return Swal.fire({
            icon: 'warning',
            title: 'Fecha requerida',
            text: 'Selecciona una fecha y horario para la cita'
        });
    }
    
    // Preparar datos
    const data = {
        id_cliente: parseInt(clienteIdCita),
        id_empleado: parseInt(empleadoIdCita),
        cita_fecha_programada: fechaSeleccionada,
        cita_estado: document.getElementById("cita_estado").value || 'Pendiente',
        cita_tipo: document.getElementById("cita_tipo")?.value || 'Servicio',
        cita_motivo: document.getElementById("cita_motivo").value || ''
    };
    
    const url = editandoCitaId ? `${API_CITA_CITAS}/${editandoCitaId}` : API_CITA_CITAS;
    const metodo = editandoCitaId ? "PUT" : "POST";
    
    // Mostrar loading
    Swal.fire({
        title: 'Guardando...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 
                "Content-Type": "application/json", 
                "Accept": "application/json" 
            },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        
        if (result.success || result.message || res.ok) {
            Swal.fire({
                icon: 'success',
                title: editandoCitaId ? 'Cita actualizada' : 'Cita registrada',
                text: editandoCitaId ? 'La cita se ha actualizado correctamente' : 'La cita se ha registrado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
            
            cerrarModalCita();
            listarCitas();
            inicializarCalendarioVisual();
        } else {
            throw new Error(result.message || 'Error al guardar la cita');
        }
    } catch (err) {
        console.error('❌ Error al guardar cita:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message || 'No se pudo guardar la cita. Verifique los datos e intente nuevamente.'
        });
    }
}

// ========== EDITAR CITA ==========
async function editarCita(id) {
    try {
        Swal.fire({
            title: 'Cargando...',
            text: 'Obteniendo datos de la cita',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const res = await fetch(`${API_CITA_CITAS}/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const response = await res.json();
        const c = response.success ? response.data : response;
        
        if (!c) {
            throw new Error('No se encontró la cita');
        }
        
        Swal.close();
        
        // Configurar edición
        editandoCitaId = id;
        clienteIdCita = c.id_cliente;
        empleadoIdCita = c.id_empleado;
        
        // Abrir modal
        await abrirModalCita();
        
        // Cambiar título
        document.getElementById("tituloModalCita").textContent = `Editar Cita #${id}`;
        
        // Llenar formulario
        const nombreCliente = c.cliente ? 
            `${c.cliente.cli_nombre || ''} ${c.cliente.cli_apaterno || ''}`.trim() : '';
        document.getElementById("busCliCita").value = nombreCliente;
        document.getElementById("cita_estado").value = c.cita_estado || 'Pendiente';
        document.getElementById("cita_tipo").value = c.cita_tipo || 'Servicio';
        document.getElementById("cita_motivo").value = c.cita_motivo || '';
        
        // Configurar fecha si existe
        if (c.cita_fecha_programada) {
            const fecha = new Date(c.cita_fecha_programada);
            if (!isNaN(fecha.getTime())) {
                await seleccionarFecha(fecha);
                
                // Formatear fecha para el input
                const fechaInput = new Date(c.cita_fecha_programada);
                const año = fechaInput.getFullYear();
                const mes = String(fechaInput.getMonth() + 1).padStart(2, '0');
                const dia = String(fechaInput.getDate()).padStart(2, '0');
                const hora = String(fechaInput.getHours()).padStart(2, '0');
                const minutos = String(fechaInput.getMinutes()).padStart(2, '0');
                
                document.getElementById("cita_fecha").value = `${año}-${mes}-${dia}T${hora}:${minutos}`;
            }
        }
        
        // Seleccionar empleado después de cargar el select
        setTimeout(() => {
            const selEmp = document.getElementById("id_empleado_select");
            if (selEmp && c.id_empleado) {
                selEmp.value = c.id_empleado;
            }
        }, 500);
        
        console.log(`✏️ Editando cita #${id}`);
        
    } catch (err) {
        console.error('❌ Error al cargar cita para editar:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los datos de la cita'
        });
    }
}

// ========== ELIMINAR CITA ==========
async function eliminarCita(id) {
    const result = await Swal.fire({
        title: '¿Eliminar cita?',
        html: `¿Está seguro de eliminar la cita <strong>#${id}</strong>?<br><small class="text-danger">Esta acción no se puede deshacer</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: '<i class="fas fa-trash"></i> Sí, eliminar',
        cancelButtonText: '<i class="fas fa-times"></i> Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Eliminando...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            const res = await fetch(`${API_CITA_CITAS}/${id}`, { 
                method: 'DELETE',
                headers: { "Accept": "application/json" }
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            Swal.fire({
                icon: 'success',
                title: 'Eliminada',
                text: 'La cita ha sido eliminada correctamente',
                timer: 2000,
                showConfirmButton: false
            });
            
            listarCitas();
            inicializarCalendarioVisual();
            
        } catch (err) {
            console.error('❌ Error al eliminar cita:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar la cita'
            });
        }
    }
}

// ========== CONFIGURAR BÚSQUEDA LOCAL ==========
function configurarBusquedaLocal() {
    const inputBuscar = document.getElementById("inputBuscarCitaLocal");
    if (inputBuscar && !inputBuscar.hasAttribute('data-listener')) {
        inputBuscar.setAttribute('data-listener', 'true');
        
        // Debounce para evitar muchas llamadas
        let timeoutId;
        inputBuscar.addEventListener('input', function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                listarCitas();
            }, 300);
        });
        
        console.log('🔍 Búsqueda local configurada');
    }
}

// ========== EXPONER FUNCIONES GLOBALES ==========
window.listarCitas = listarCitas;
window.abrirModalCita = abrirModalCita;
window.cerrarModalCita = cerrarModalCita;
window.buscarClienteCita = buscarClienteCita;
window.seleccionarClienteCita = seleccionarClienteCita;
window.seleccionarEmpleadoCita = seleccionarEmpleadoCita;
window.guardarCita = guardarCita;
window.editarCita = editarCita;
window.eliminarCita = eliminarCita;
window.prepararServicio = prepararServicio;
window.inicializarVistaCitas = inicializarVistaCitas;

// ========== INICIALIZACIÓN MEJORADA ==========
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!isInitialized) {
            inicializarVistaCitas();
        }
    }, 300);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (!isInitialized) {
                inicializarVistaCitas();
            }
        }, 300);
    });
}

// Observar cambios de visibilidad para SPAs
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 
        document.getElementById('tablaCitas') && 
        !isInitialized) {
        console.log('👁️ Vista visible, reinicializando...');
        inicializarVistaCitas();
    }
});

console.log('📦 Módulo de citas cargado');