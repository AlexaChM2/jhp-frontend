// ==========================================
// LIBRERÍAS PDF COMPARTIDAS
// ==========================================

// Función para verificar/forzar carga de librerías
async function asegurarLibreriasPDF() {
    // Verificar jsPDF
    let jsPDFLib = null;
    
    if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
        jsPDFLib = window.jspdf.jsPDF;
        console.log('✅ jsPDF ya disponible');
    } else if (typeof jspdf !== 'undefined') {
        jsPDFLib = jspdf;
        console.log('✅ jsPDF ya disponible (global)');
    } else if (typeof window.jsPDF !== 'undefined') {
        jsPDFLib = window.jsPDF;
        console.log('✅ jsPDF ya disponible (window)');
    }
    
    if (!jsPDFLib) {
        console.log('⏳ Cargando jsPDF...');
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        console.log('✅ jsPDF cargado');
        
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        console.log('✅ autoTable cargado');
    }
    
    // Pequeña pausa para asegurar inicialización
    await new Promise(r => setTimeout(r, 100));
    
    return jsPDFLib || window.jspdf?.jsPDF || jspdf || window.jsPDF;
}

// Función para formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return '-';
    const f = new Date(fecha);
    return `${f.getDate()}/${f.getMonth()+1}/${f.getFullYear()}, ${f.getHours().toString().padStart(2,'0')}:${f.getMinutes().toString().padStart(2,'0')}:${f.getSeconds().toString().padStart(2,'0')}`;
}

// Función para agregar línea al PDF
function addPDFLine(doc, label, value, y) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || '-'), 55, y);
    return y + 7;
}