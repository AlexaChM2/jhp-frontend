
const API_REPORTES = "http://localhost:8000/api/reportes-detallados";
const API_VENTAS = "http://localhost:8000/api/ventas";
const API_COMPRAS = "http://localhost:8000/api/compras";
const API_PRODUCTOS = "http://localhost:8000/api/producto";

let chartVentasCompras = null;
let chartTopProductos = null;
let chartInventario = null;


(function() {
    if (document.getElementById('chartVentasCompras')) {
        console.log("📊 Inicializando reportes");
        cargarTodo();
    }
})();

async function cargarTodo() {
    await Promise.all([
        cargarResumen(),
        cargarInventario(),
        cargarMovimientosDia()
    ]);
}


function extraerArray(response) {
    if (!response) return [];
   
    if (Array.isArray(response)) return response;
   
    if (response.data) {
        if (Array.isArray(response.data)) return response.data;
        if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
    }
    return [];
}


async function cargarResumen() {
    try {
        // Cargar ventas y compras
        const [resVentas, resCompras] = await Promise.all([
            fetch(API_VENTAS).then(r => r.json()),
            fetch(API_COMPRAS).then(r => r.json())
        ]);

        const ventas = extraerArray(resVentas);
        const compras = extraerArray(resCompras);

        console.log(` Ventas: ${ventas.length}, Compras: ${compras.length}`);

        // Calcular totales
        const totalVentas = ventas.reduce((s, v) => s + parseFloat(v.ven_total || 0), 0);
        const totalCompras = compras.reduce((s, c) => s + parseFloat(c.com_total || 0), 0);

        // Actualizar tarjetas
        document.getElementById("txtIngresos").textContent = `$${totalVentas.toFixed(2)}`;
        document.getElementById("txtEgresos").textContent = `$${totalCompras.toFixed(2)}`;
        document.getElementById("txtBalance").textContent = `$${(totalVentas - totalCompras).toFixed(2)}`;
        document.getElementById("txtNumVentas").textContent = `${ventas.length} ventas`;
        document.getElementById("txtNumCompras").textContent = `${compras.length} compras`;

       
        renderVentasCompras(ventas, compras);

        // Top productos vendidos (desde los detalles de ventas)
        await cargarTopProductos();

    } catch (error) {
        console.error(" Error al cargar resumen:", error);
    }
}


// GRAFICA VENTAS / COMPRAS

function renderVentasCompras(ventas, compras) {
    const ctx = document.getElementById('chartVentasCompras')?.getContext('2d');
    if (!ctx) return;

    if (chartVentasCompras) chartVentasCompras.destroy();

    //  por día
    const agruparPorDia = (lista, campoFecha, campoTotal) => {
        const mapa = {};
        lista.forEach(item => {
            const fecha = item[campoFecha] 
                ? new Date(item[campoFecha]).toLocaleDateString('es-MX') 
                : 'Sin fecha';
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
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
                },
                {
                    label: 'Compras ($)',
                    data: todasLasFechas.map(f => comprasPorDia[f] || 0),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '$' + value.toLocaleString()
                    }
                }
            }
        }
    });
}


// TOP PRODUCTOS (desde detalles de ventas)

async function cargarTopProductos() {
    try {
        // Cargar ventas con detalles
        const resVentas = await fetch(API_VENTAS);
        const data = await resVentas.json();
        const ventas = extraerArray(data);

       
        const resProductos = await fetch(API_PRODUCTOS);
        const dataProd = await resProductos.json();
        const productos = extraerArray(dataProd);

        // Ordenar por stock 
        const ordenados = productos
            .filter(p => p.pro_stock !== undefined)
            .sort((a, b) => (a.pro_stock || 0) - (b.pro_stock || 0))
            .slice(0, 5);

        renderTopProductos(ordenados);

    } catch (error) {
        console.error("Error al cargar top productos:", error);
    }
}

function renderTopProductos(productos) {
    const ctx = document.getElementById('chartTopProductos')?.getContext('2d');
    if (!ctx) return;

    if (chartTopProductos) chartTopProductos.destroy();

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
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Productos con menos stock (más vendidos)'
                }
            }
        }
    });
}


// INVENTARIO

async function cargarInventario() {
    try {
        const response = await fetch(API_PRODUCTOS);
        const data = await response.json();
        const productos = extraerArray(data);

        console.log(` Productos: ${productos.length}`);

        // Actualizar 
        document.getElementById("txtTotalProductos").textContent = productos.length;
        const stockBajo = productos.filter(p => p.pro_stock <= 5 && p.pro_stock > 0).length;
        const agotados = productos.filter(p => p.pro_stock <= 0).length;
        document.getElementById("txtStockBajo").textContent = `${stockBajo} bajos, ${agotados} agotados`;

        // Grafica de dona
        renderInventario(productos);

        // Tabla de stock bajo
        renderStockBajo(productos);

    } catch (error) {
        console.error("Error al cargar inventario:", error);
    }
}

function renderInventario(productos) {
    const ctx = document.getElementById('chartInventario')?.getContext('2d');
    if (!ctx) return;

    if (chartInventario) chartInventario.destroy();

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
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderStockBajo(productos) {
    const tbody = document.querySelector("#tablaStockBajo tbody");
    if (!tbody) return;

    const bajos = productos.filter(p => p.pro_stock <= 5).sort((a, b) => a.pro_stock - b.pro_stock);

    if (bajos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-success">✅ Todo en orden</td></tr>';
        return;
    }

    tbody.innerHTML = bajos.map(p => `
        <tr>
            <td>${p.pro_nombre || 'Producto'}</td>
            <td><strong>${p.pro_stock}</strong></td>
            <td>
                <span class="badge bg-${p.pro_stock <= 0 ? 'danger' : 'warning text-dark'}">
                    ${p.pro_stock <= 0 ? 'AGOTADO' : 'BAJO'}
                </span>
            </td>
        </tr>
    `).join('');
}


// MOVIMIENTOS DEL DÍA

async function cargarMovimientosDia() {
    try {
        const [resVentas, resCompras] = await Promise.all([
            fetch(API_VENTAS).then(r => r.json()),
            fetch(API_COMPRAS).then(r => r.json())
        ]);

        const ventas = extraerArray(resVentas);
        const compras = extraerArray(resCompras);

        // ultimas 5 ventas
        const tbodyVentas = document.querySelector("#tablaUltimasVentas tbody");
        if (tbodyVentas) {
            const ultimas = ventas.slice(-5).reverse();
            tbodyVentas.innerHTML = ultimas.length > 0
                ? ultimas.map(v => `
                    <tr>
                        <td><strong>#${v.id_venta}</strong></td>
                        <td>${v.cli_nombre || 'Público'}</td>
                        <td class="text-success">$${parseFloat(v.ven_total).toFixed(2)}</td>
                        <td><small>${v.ven_fecha ? new Date(v.ven_fecha).toLocaleTimeString('es-MX') : '-'}</small></td>
                    </tr>`).join('')
                : '<tr><td colspan="4" class="text-center text-muted">Sin ventas registradas</td></tr>';
        }

        // ultimas 5 compras
        const tbodyCompras = document.querySelector("#tablaUltimasCompras tbody");
        if (tbodyCompras) {
            const ultimas = compras.slice(-5).reverse();
            tbodyCompras.innerHTML = ultimas.length > 0
                ? ultimas.map(c => `
                    <tr>
                        <td><strong>#${c.id_compra}</strong></td>
                        <td>${c.proveedor?.prov_nombre || 'N/A'}</td>
                        <td class="text-danger">$${parseFloat(c.com_total).toFixed(2)}</td>
                        <td><small>${c.com_fecha ? new Date(c.com_fecha).toLocaleTimeString('es-MX') : '-'}</small></td>
                    </tr>`).join('')
                : '<tr><td colspan="4" class="text-center text-muted">Sin compras registradas</td></tr>';
        }

    } catch (error) {
        console.error("Error al cargar movimientos:", error);
    }
}


window.inicializarReportes = cargarTodo;