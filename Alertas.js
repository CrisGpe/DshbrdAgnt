/**
 * =========================================================================
 * MÓDULO DE GESTIÓN DE ALERTAS Y EVENTOS EN PISO
 * =========================================================================
 * Desarrollado por: Programador GAS
 * 
 * Gestiona la inserción atómica de alertas desde la botonera táctil 
 * hacia la pestaña "Alertas" de la sede correspondiente.
 */

/**
 * Registra una nueva alerta en el libro de operaciones de la sede.
 * 
 * @param {string} nickname - Apodo del agente que dispara la alerta.
 * @param {string} mensaje - Tipo de alerta o mensaje (ej. 'Ya llegué', 'Bar: 2 Cafés').
 * @param {string} sede - Identificador de la base de datos ("RD" o "Luxury").
 * @return {Object} Objeto de estado { exito: boolean, mensaje?: string }
 */
function registrarAlertaBotonera(nickname, mensaje, sede, autoConfirmadoNfc) {
  Logger.log("[ALERTAS] Registrando alerta de " + nickname + " en " + sede + ": " + mensaje + " | AutoNFC: " + autoConfirmadoNfc);
  
  try {
    // 1. Obtiene la hoja correcta de Alertas usando el enrutador maestro.
    const hojaAlertas = getHoja(sede, "Alertas");
    
    // 2. Genera el payload de la fila
    const timestamp = new Date().getTime();
    const idUnico = "ALT-" + timestamp;
    
    // Formatear la fecha para Recepción (DD/MM/YYYY HH:MM:SS)
    const fechaHoraStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    const esAutoNfc = autoConfirmadoNfc === true || autoConfirmadoNfc === "true";
    const estado = esAutoNfc ? "Resuelto (Auto NFC)" : "Pendiente";
    const horaResuelta = esAutoNfc ? fechaHoraStr : ""; 
    
    // Estructura de Columnas:
    // A: ID (1)
    // B: Fecha/Hora (2)
    // C: Trabajador (3)
    // D: Mensaje (4)
    // E: Estado (5)
    // F: Hora_resuelta (6)
    const filaNueva = [
      idUnico,
      fechaHoraStr,
      nickname,
      mensaje,
      estado,
      horaResuelta
    ];
    
    // 3. Inserta atómicamente la fila al final del libro
    hojaAlertas.appendRow(filaNueva);

    // 4. Si la alerta es auto-confirmada por NFC, escribir atómicamente en la hoja "Borrador"
    if (esAutoNfc) {
      actualizarAsistenciaBorrador(nickname, mensaje, sede);
    }
    
    return { exito: true };
    
  } catch (error) {
    Logger.log("[ALERTAS CRÍTICO] Fallo al registrar alerta: " + error.toString());
    return { exito: false, mensaje: error.toString() };
  }
}

/**
 * Escribe las marcas de tiempo en la pestaña "Borrador" para el control diario de asistencia.
 * Col A: Fecha (DD/MM/YYYY)
 * Col B: Nombre / Trabajador
 * Col C: Hora de Ingreso (HH:MM AM/PM)  -> "Ya llegué"
 * Col D: Inicio Refrigerio (HH:MM AM/PM) -> "Voy a comer"
 * Col E: Fin Refrigerio (HH:MM AM/PM)    -> "Regresé de comer" / "Regresé"
 * Col F: Hora de Salida (HH:MM AM/PM)    -> "Acabó mi día"
 */
function actualizarAsistenciaBorrador(nickname, mensaje, sede) {
  try {
    const sheetBorrador = getHoja(sede, "Borrador");
    const lastRow = sheetBorrador.getLastRow();
    
    const tz = Session.getScriptTimeZone();
    const hoyStr = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");
    const horaActual12 = Utilities.formatDate(new Date(), tz, "hh:mm a").toUpperCase();
    
    // Mapear la columna objetivo según el mensaje de la alerta
    let colIndex = 0; // 1-based (C=3, D=4, E=5, F=6)
    if (mensaje === "Ya llegué") colIndex = 3;
    else if (mensaje === "Voy a comer") colIndex = 4;
    else if (mensaje === "Regresé de comer" || mensaje === "Regresé") colIndex = 5;
    else if (mensaje === "Acabó mi día") colIndex = 6;
    
    if (colIndex === 0) return; // No es una alerta de asistencia
    
    let filaEncontrada = -1;
    
    if (lastRow >= 2) {
      const data = sheetBorrador.getRange(2, 1, lastRow - 1, 6).getValues();
      const nickNorm = String(nickname || '').toLowerCase().trim();
      
      for (let i = 0; i < data.length; i++) {
        const fechaCelda = data[i][0];
        let fechaStr = "";
        if (fechaCelda instanceof Date) {
          fechaStr = Utilities.formatDate(fechaCelda, tz, "dd/MM/yyyy");
        } else {
          fechaStr = String(fechaCelda || '').trim();
        }
        
        const trabajadorCelda = String(data[i][1] || '').toLowerCase().trim();
        
        if ((fechaStr === hoyStr || fechaStr.startsWith(hoyStr)) && trabajadorCelda === nickNorm) {
          filaEncontrada = i + 2; // Índice real de fila en la hoja
          break;
        }
      }
    }
    
    if (filaEncontrada > 0) {
      // La fila para el día de hoy ya existe: verificar si la columna objetivo está libre
      const celdaTarget = sheetBorrador.getRange(filaEncontrada, colIndex);
      const valorActual = celdaTarget.getValue();
      if (!valorActual || String(valorActual).trim() === '') {
        celdaTarget.setValue(horaActual12);
      }
    } else {
      // No existe fila previa para el trabajador el día de hoy: crear nueva fila en Borrador
      const nuevaFila = [hoyStr, nickname, '', '', '', ''];
      nuevaFila[colIndex - 1] = horaActual12;
      sheetBorrador.appendRow(nuevaFila);
    }
  } catch (err) {
    Logger.log("[ASISTENCIA BORRADOR ERROR] " + err.toString());
  }
}
