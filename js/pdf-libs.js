// ==========================================
// LIBRERÍAS PDF COMPARTIDAS
// ==========================================

let libreriasCargadas = false;

async function asegurarLibreriasPDF() {
    // Si ya están cargadas, devolver inmediatamente
    if (libreriasCargadas) {
        console.log('📚 Librerías ya cargadas');
        return window.jspdf?.jsPDF || jspdf || window.jsPDF;
    }
    
    console.log('🔄 Cargando librerías PDF...');
    
    // Verificar si jsPDF ya está disponible (cargado por otro medio)
    let jsPDFLib = window.jspdf?.jsPDF || window.jspdf || window.jsPDF || (typeof jspdf !== 'undefined' ? jspdf : null);
    
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
        
        // Pequeña pausa para que se inicialice
        await new Promise(r => setTimeout(r, 50));
    }
    
    // Verificar si autoTable ya está disponible
    let tieneAutoTable = false;
    try {
        const testDoc = new (window.jspdf?.jsPDF || jspdf || window.jsPDF)({ unit: 'mm', format: 'a4' });
        tieneAutoTable = typeof testDoc.autoTable === 'function';
    } catch(e) {}
    
    if (!tieneAutoTable) {
        console.log('⏳ Cargando autoTable...');
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        console.log('✅ autoTable cargado');
        
        // Pausa para que se integre
        await new Promise(r => setTimeout(r, 100));
    }
    
    libreriasCargadas = true;
    console.log('✅ Todas las librerías PDF listas');
    
    return window.jspdf?.jsPDF || jspdf || window.jsPDF;
}

function formatearFecha(fecha) {
    if (!fecha) return '-';
    const f = new Date(fecha);
    return `${f.getDate()}/${f.getMonth()+1}/${f.getFullYear()}, ${f.getHours().toString().padStart(2,'0')}:${f.getMinutes().toString().padStart(2,'0')}:${f.getSeconds().toString().padStart(2,'0')}`;
}

function addPDFLine(doc, label, value, y) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || '-'), 55, y);
    return y + 7;
}