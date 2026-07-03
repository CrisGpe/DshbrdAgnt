/**
 * Obtiene las atenciones asignadas al agente de hoy (Borrador) e históricas (OATC).
 */
function obtenerMisAtenciones(nickname, sede) {
  const listaAtenciones = [];
  const target = nickname.toLowerCase().trim();
  
  try {
    // 1. Procesar pestaña BORRADOR (Servicios en tiempo real de hoy)
    const sheetBorrador = getHoja(sede, "Borrador");
    const lastRowB = sheetBorrador.getLastRow();
    
    if (lastRowB >= 2) {
      const dataB = sheetBorrador.getRange(2, 1, lastRowB - 1, 22).getValues();
      dataB.forEach(row => {
        const agenteOatc = row[19] ? row[19].toString().toLowerCase().trim() : ""; // Col T
        if (agenteOatc === target) {
          listaAtenciones.push({
            origen: "Hoy (Borrador)",
            id: row[14] || "---",          // Col O
            tipo: row[15] || "General",    // Col P
            cliente: row[17] || "Anónimo", // Col R
            hora: row[13] || "---",        // Col N
            resolucion: row[20] || "Pendiente", // Col U
            cancelacion: row[21] || ""     // Col V
          });
        }
      });
    }
    
    // 2. Procesar pestaña OATC (Histórico consolidado)
    const sheetOatc = getHoja(sede, "OATC");
    const lastRowO = sheetOatc.getLastRow();
    
    if (lastRowO >= 2) {
      const dataO = sheetOatc.getRange(2, 1, lastRowO - 1, 9).getValues();
      dataO.forEach(row => {
        const agenteOatc = row[6] ? row[6].toString().toLowerCase().trim() : ""; // Col G
        if (agenteOatc === target) {
          listaAtenciones.push({
            origen: "Histórico (OATC)",
            id: row[1] || "---",           // Col B
            tipo: row[2] || "General",     // Col C
            cliente: row[4] || "Anónimo",  // Col E
            hora: row[0] || "---",         // Col A
            resolucion: row[7] || "Finalizado", // Col H
            cancelacion: row[8] || ""      // Col I
          });
        }
      });
    }
    
    return { exito: true, datos: listaAtenciones.reverse() }; // Más recientes primero
  } catch (e) {
    return { exito: false, mensaje: e.toString() };
  }
}