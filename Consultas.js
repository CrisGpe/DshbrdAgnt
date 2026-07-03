/**
 * =========================================================================
 * MÓDULO DE CONSULTAS POLIMÓRFICAS CENTRALIZADAS
 * =========================================================================
 * Desarrollado por: Programador GAS
 * 
 * Provee un único canal de extracción atómica de datos para cualquier pestaña
 * del ecosistema (Borrador, OATC, Agentes), encargándose de sanitizar tipos
 * complejos de datos antes de su transporte al Frontend.
 */

/**
 * Obtiene la matriz completa de datos de una pestaña y sede específicas.
 * 
 * @param {string} sede - Identificador de la sede ("RD" o "Luxury").
 * @param {string} nombreHoja - Nombre exacto de la pestaña en Google Sheets.
 * @return {Object} Respuesta estructurada con el estado de la operación y la matriz.
 */
function obtenerMatrizPestanaPolimorfica(sede, nombreHoja) {
  Logger.log("[SERVIDOR] Petición polimorfa recibida. Sede: " + sede + " | Hoja: " + nombreHoja);
  
  try {
    // 1. Enrutamiento inteligente utilizando el motor de Configuracion.gs
    const hojaTarget = getHoja(sede, nombreHoja);
    
    // 2. Extracción atómica en un solo paso de I/O (Optimización de Cuotas GAS)
    const matrizCruda = hojaTarget.getDataRange().getValues();
    
    // Si la hoja está completamente vacía, evitamos procesar arreglos indefinidos
    if (!matrizCruda || matrizCruda.length === 0) {
      return { exito: true, matriz: [] };
    }
    
    // 3. Bucle de Saneamiento en Memoria (Base 0) para Serialización JSON segura
    for (let r = 0; r < matrizCruda.length; r++) {
      for (let c = 0; c < matrizCruda[r].length; c++) {
        const celda = matrizCruda[r][c];
        
        // Si el elemento es un objeto Date nativo de Sheets, lo convertimos a String legible
        if (celda instanceof Date) {
          // Opción estándar internacional ISO. Puedes alternar a celda.toLocaleString() si prefieres formato local.
          matrizCruda[r][c] = celda.toISOString(); 
        }
      }
    }
    
    Logger.log("[SERVIDOR] Extracción exitosa. Filas enviadas al cliente: " + matrizCruda.length);
    return {
      exito: true,
      matriz: matrizCruda
    };
    
  } catch (error) {
    Logger.log("[SERVIDOR CRÍTICO] Error en obtenerMatrizPestanaPolimorfica: " + error.toString());
    return {
      exito: false,
      mensaje: "Error interno del servidor: " + error.message,
      matriz: []
    };
  }
}