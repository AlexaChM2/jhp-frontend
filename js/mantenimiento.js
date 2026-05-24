const API_MANT = "https://jhpapi-production.up.railway.app/api/mantenimiento";
const API_CLI = "https://jhpapi-production.up.railway.app/api/clientes";
const API_EMP = "https://jhpapi-production.up.railway.app/api/empleados";
const API_SERV = "https://jhpapi-production.up.railway.app/api/servicios";
const API_PROD = "https://jhpapi-production.up.railway.app/api/producto";

let serviciosMant = [];
let insumosMant = [];

async function listarMantenimiento() {
    const tbody = document.getElementById("tablaMantenimiento");
    if (!tbody) return;
    try {
        const res = await fetch(API_MANT);
        const data = await res.json();
        const lista = data.success ? (data.data?.data || data.data) : data;
        const mant = Array.isArray(lista) ? lista.filter(m => m.tipo === 'Preventivo') : [];
        
        tbody.innerHTML = mant.map(m => `
            <tr>
                <td><strong>#${m.id_mantenimiento}</strong></td>
                <td>${m.cliente?.cli_nombre||''} ${m.cliente?.cli_apaterno||''}</td>
                <td>${m.moto_modelo||'N/A'}</td>
                <td>${m.mecanico?.emp_nombre||'S/D'}</td>
                <td>${m.kilometraje_actual||'-'}</td>
                <td>${m.proximo_kilometraje||'-'}</td>
                <td>$${parseFloat(m.mantenimiento_total||0).toFixed(2)}</td>
                <td><span class="badge bg-${m.estado_servicio==='Terminado'?'success':'info'}">${m.estado_servicio}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="window.verMantenimiento(${m.id_mantenimiento})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="window.editarMantenimiento(${m.id_mantenimiento})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="9" class="text-center">No hay mantenimientos</td></tr>';
    } catch(e) { console.error(e); }
}

// ... (funciones similares a servicios.js pero con IDs _mant)

window.listarMantenimiento = listarMantenimiento;

if (document.getElementById("tablaMantenimiento")) listarMantenimiento();