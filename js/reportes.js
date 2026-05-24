var API_REPORTES = "https://jhpapi-production.up.railway.app/api/reportes-detallados";
var API_VENTAS_R = "https://jhpapi-production.up.railway.app/api/ventas";
var API_COMPRAS_R = "https://jhpapi-production.up.railway.app/api/compras";
var API_PRODUCTOS_R = "https://jhpapi-production.up.railway.app/api/producto";

let chartVentasCompras = null;
let chartTopProductos = null;
let chartInventario = null;
let reportesIniciados = false;

// ========== INICIALIZACION ==========
(function() {
    document.addEventListener('vista-cargada', function(e) {
        if (e.detail && e.detail.vista && 
            (e.detail.vista.includes('reporte') || e.detail.vista.includes('Reporte'))) {
            reportesIniciados = false;
            setTimeout(cargarTodo, 500);
        }
    });
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const canvas = document.getElementById('chartVentasCompras');
        const tarjetas = document.getElementById('txtIngresos');
        if (canvas || tarjetas) {
            setTimeout(cargarTodo, 300);
        }
    }
})();

// ========== UTILIDAD ==========
function extraerArray(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data) {
        if (Array.isArray(response.data)) return response.data;
        if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
    }
    return [];
}

// ========== ALERTA STOCK BAJO ==========
function mostrarAlertaStockBajo() {
    fetch(API_PRODUCTOS_R)
        .then(res => res.json())
        .then(response => {
            const productos = extraerArray(response);
            const bajos = productos.filter(p => p.pro_stock <= 5 && p.pro_stock > 0);
            const agotados = productos.filter(p => p.pro_stock <= 0);
            const totalAlertas = bajos.length + agotados.length;

            if (totalAlertas > 0) {
                let mensaje = '';
                if (agotados.length > 0) {
                    mensaje += '<div style="margin-bottom:10px;">' +
                        '<strong style="color:#dc3545;">AGOTADOS (' + agotados.length + '):</strong><br>' +
                        agotados.map(p => '• ' + p.pro_nombre + ' (Stock: 0)').join('<br>') +
                        '</div>';
                }
                if (bajos.length > 0) {
                    mensaje += '<div>' +
                        '<strong style="color:#ffc107;">STOCK BAJO (' + bajos.length + '):</strong><br>' +
                        bajos.map(p => '• ' + p.pro_nombre + ' (Stock: ' + p.pro_stock + ')').join('<br>') +
                        '</div>';
                }
                Swal.fire({
                    title: 'Alerta de Inventario',
                    html: mensaje,
                    icon: 'warning',
                    confirmButtonText: 'Ir a Inventario',
                    confirmButtonColor: '#080522',
                    showCancelButton: true,
                    cancelButtonText: 'Cerrar',
                    cancelButtonColor: '#6c757d'
                }).then((result) => {
                    if (result.isConfirmed && typeof window.cargarVista === 'function') {
                        window.cargarVista('views/inventarios.html');
                    }
                });
            }
        })
        .catch(err => console.error("Error al verificar stock:", err));
}

// ========== CARGAR TODO ==========
async function cargarTodo() {
    try {
        await Promise.all([
            cargarResumen(),
            cargarInventario(),
            cargarMovimientosDia()
        ]);
        setTimeout(mostrarAlertaStockBajo, 1000);
        reportesIniciados = true;
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        reportesIniciados = false;
    }
}

// ========== RESUMEN ==========
async function cargarResumen() {
    try {
        const [resVentas, resCompras] = await Promise.all([
            fetch(API_VENTAS_R).then(r => r.json()),
            fetch(API_COMPRAS_R).then(r => r.json())
        ]);
        const ventas = extraerArray(resVentas);
        const compras = extraerArray(resCompras);

        const totalVentas = ventas.reduce((s, v) => s + parseFloat(v.ven_total || 0), 0);
        const totalCompras = compras.reduce((s, c) => s + parseFloat(c.com_total || 0), 0);

        const txtIngresos = document.getElementById("txtIngresos");
        const txtEgresos = document.getElementById("txtEgresos");
        const txtBalance = document.getElementById("txtBalance");
        const txtNumVentas = document.getElementById("txtNumVentas");
        const txtNumCompras = document.getElementById("txtNumCompras");

        if (txtIngresos) txtIngresos.textContent = '$' + totalVentas.toFixed(2);
        if (txtEgresos) txtEgresos.textContent = '$' + totalCompras.toFixed(2);
        if (txtBalance) txtBalance.textContent = '$' + (totalVentas - totalCompras).toFixed(2);
        if (txtNumVentas) txtNumVentas.textContent = ventas.length + ' ventas';
        if (txtNumCompras) txtNumCompras.textContent = compras.length + ' compras';

        renderVentasCompras(ventas, compras);
        await cargarTopProductos();
    } catch (error) {
        console.error("Error al cargar resumen:", error);
    }
}

function renderVentasCompras(ventas, compras) {
    const ctx = document.getElementById('chartVentasCompras')?.getContext('2d');
    if (!ctx) return;

    if (chartVentasCompras) { chartVentasCompras.destroy(); chartVentasCompras = null; }

    const agruparPorDia = (lista, campoFecha, campoTotal) => {
        const mapa = {};
        lista.forEach(item => {
            const fecha = item[campoFecha] ? new Date(item[campoFecha]).toLocaleDateString('es-MX') : 'Sin fecha';
            mapa[fecha] = (mapa[fecha] || 0) + parseFloat(item[campoTotal] || 0);
        });
        return mapa;
    };

    const ventasPorDia = agruparPorDia(ventas, 'ven_fecha', 'ven_total');
    const comprasPorDia = agruparPorDia(compras, 'com_fecha', 'com_total');
    const todasLasFechas = [...new Set([...Object.keys(ventasPorDia), ...Object.keys(comprasPorDia)])].sort();

    if (todasLasFechas.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="text-center text-muted py-5">No hay datos para mostrar</p>';
        return;
    }

    chartVentasCompras = new Chart(ctx, {
        type: 'line',
        data: {
            labels: todasLasFechas,
            datasets: [
                {
                    label: 'Ventas ($)',
                    data: todasLasFechas.map(f => ventasPorDia[f] || 0),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true, tension: 0.3, pointRadius: 4
                },
                {
                    label: 'Compras ($)',
                    data: todasLasFechas.map(f => comprasPorDia[f] || 0),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true, tension: 0.3, pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, ticks: { callback: value => '$' + value.toLocaleString() } } }
        }
    });
}

async function cargarTopProductos() {
    try {
        const resProductos = await fetch(API_PRODUCTOS_R);
        const dataProd = await resProductos.json();
        const productos = extraerArray(dataProd);
        const ordenados = productos.filter(p => p.pro_stock !== undefined).sort((a, b) => (a.pro_stock || 0) - (b.pro_stock || 0)).slice(0, 5);
        renderTopProductos(ordenados);
    } catch (error) {
        console.error("Error al cargar top productos:", error);
    }
}

function renderTopProductos(productos) {
    const ctx = document.getElementById('chartTopProductos')?.getContext('2d');
    if (!ctx) return;

    if (chartTopProductos) { chartTopProductos.destroy(); chartTopProductos = null; }

    if (productos.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="text-center text-muted py-5">Sin datos</p>';
        return;
    }

    const colores = ['#1cc88a', '#4e73df', '#f6c23e', '#e74a3b', '#36b9cc'];
    chartTopProductos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: productos.map(p => p.pro_nombre || 'Producto'),
            datasets: [{
                label: 'Stock Restante',
                data: productos.map(p => p.pro_stock || 0),
                backgroundColor: colores.slice(0, productos.length)
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: 'Productos con menos stock' } }
        }
    });
}

// ========== INVENTARIO ==========
async function cargarInventario() {
    try {
        const response = await fetch(API_PRODUCTOS_R);
        const data = await response.json();
        const productos = extraerArray(data);

        const txtTotalProductos = document.getElementById("txtTotalProductos");
        const txtStockBajo = document.getElementById("txtStockBajo");
        
        if (txtTotalProductos) txtTotalProductos.textContent = productos.length;
        
        const stockBajo = productos.filter(p => p.pro_stock <= 5 && p.pro_stock > 0).length;
        const agotados = productos.filter(p => p.pro_stock <= 0).length;
        
        if (txtStockBajo) txtStockBajo.textContent = stockBajo + ' bajos, ' + agotados + ' agotados';

        renderInventario(productos);
        renderStockBajo(productos);
    } catch (error) {
        console.error("Error al cargar inventario:", error);
    }
}

function renderInventario(productos) {
    const ctx = document.getElementById('chartInventario')?.getContext('2d');
    if (!ctx) return;

    if (chartInventario) { chartInventario.destroy(); chartInventario = null; }

    const stockNormal = productos.filter(p => p.pro_stock > 5).length;
    const stockBajo = productos.filter(p => p.pro_stock > 0 && p.pro_stock <= 5).length;
    const sinStock = productos.filter(p => p.pro_stock <= 0).length;

    if (productos.length === 0) {
        ctx.canvas.parentElement.innerHTML = '<p class="text-center text-muted py-5">Sin productos</p>';
        return;
    }

    chartInventario = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Normal (>5)', 'Bajo (1-5)', 'Agotado (0)'],
            datasets: [{
                data: [stockNormal, stockBajo, sinStock],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderStockBajo(productos) {
    const tbody = document.querySelector("#tablaStockBajo tbody");
    if (!tbody) return;

    const bajos = productos.filter(p => p.pro_stock <= 5).sort((a, b) => a.pro_stock - b.pro_stock);

    if (bajos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-success">Todo en orden</td></tr>';
        return;
    }

    tbody.innerHTML = bajos.map(p => `
        <tr>
            <td>${p.pro_nombre || 'Producto'}</td>
            <td><strong>${p.pro_stock}</strong></td>
            <td><span class="badge bg-${p.pro_stock <= 0 ? 'danger' : 'warning text-dark'}">${p.pro_stock <= 0 ? 'AGOTADO' : 'BAJO'}</span></td>
        </tr>
    `).join('');
}

// ========== MOVIMIENTOS ==========
async function cargarMovimientosDia() {
    try {
        const [resVentas, resCompras] = await Promise.all([
            fetch(API_VENTAS_R).then(r => r.json()),
            fetch(API_COMPRAS_R).then(r => r.json())
        ]);
        const ventas = extraerArray(resVentas);
        const compras = extraerArray(resCompras);

        const tbodyVentas = document.querySelector("#tablaUltimasVentas tbody");
        if (tbodyVentas) {
            const ultimas = ventas.slice(-5).reverse();
            tbodyVentas.innerHTML = ultimas.length > 0
                ? ultimas.map(v => '<tr><td><strong>#' + v.id_venta + '</strong></td><td>' + (v.cli_nombre || 'Publico') + '</td><td class="text-success">$' + parseFloat(v.ven_total).toFixed(2) + '</td><td><small>' + (v.ven_fecha ? new Date(v.ven_fecha).toLocaleTimeString('es-MX') : '-') + '</small></td></tr>').join('')
                : '<tr><td colspan="4" class="text-center text-muted">Sin ventas registradas</td></tr>';
        }

        const tbodyCompras = document.querySelector("#tablaUltimasCompras tbody");
        if (tbodyCompras) {
            const ultimas = compras.slice(-5).reverse();
            tbodyCompras.innerHTML = ultimas.length > 0
                ? ultimas.map(c => '<tr><td><strong>#' + c.id_compra + '</strong></td><td>' + (c.proveedor?.prov_nombre || 'N/A') + '</td><td class="text-danger">$' + parseFloat(c.com_total).toFixed(2) + '</td><td><small>' + (c.com_fecha ? new Date(c.com_fecha).toLocaleTimeString('es-MX') : '-') + '</small></td></tr>').join('')
                : '<tr><td colspan="4" class="text-center text-muted">Sin compras registradas</td></tr>';
        }
    } catch (error) {
        console.error("Error al cargar movimientos:", error);
    }
}

window.cargarTodo = cargarTodo;
window.inicializarReportes = cargarTodo;
window.mostrarAlertaStockBajo = mostrarAlertaStockBajo;