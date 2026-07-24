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
function registrarAlertaBotonera(nickname, mensaje, sede, autoConfirmadoNfc, especialidad) {
  Logger.log("[ALERTAS] Registrando alerta de " + nickname + " en " + sede + ": " + mensaje + " | AutoNFC: " + autoConfirmadoNfc + " | Esp: " + especialidad);
  
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
    
    // Estructura de Columnas en Alertas:
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
      actualizarAsistenciaBorrador(nickname, mensaje, sede, especialidad);
    }
    
    return { exito: true };
    
  } catch (error) {
    Logger.log("[ALERTAS CRÍTICO] Fallo al registrar alerta: " + error.toString());
    return { exito: false, mensaje: error.toString() };
  }
}

/**
 * Escribe las marcas de tiempo y estados en la pestaña "Borrador" para el control diario de asistencia.
 * Col A: Fecha (DD/MM/YYYY)
 * Col B: Nombre / Trabajador
 * Col C: Hora de Ingreso (HH:MM AM/PM)  -> "Ya llegué"
 * Col D: Inicio Refrigerio (HH:MM AM/PM) -> "Voy a comer"
 * Col E: Fin Refrigerio (HH:MM AM/PM)    -> "Regresé de comer" / "Regresé"
 * Col F: Hora de Salida (HH:MM AM/PM)    -> "Acabó mi día"
 * Col I: Estado ("Disponible", "En refrigerio", "Ausente")
 * Col J: Num Estado (Disponible=0, En refrigerio=3, Ausente=5)
 * Col K: Especialidad ("Estilismo", "Cosmiatría", "Administracion")
 * Col L: Num Especialidad (Estilismo=0, Cosmiatría=1, Administracion=2)
 * Col M: Hora con Segundos ("HH:MM:SS AM/PM") -> Solo en Ingreso ("Ya llegué") o Salida ("Acabó mi día")
 */
function actualizarAsistenciaBorrador(nickname, mensaje, sede, especialidad) {
  try {
    const sheetBorrador = getHoja(sede, "Borrador");
    const lastRow = sheetBorrador.getLastRow();
    
    const tz = Session.getScriptTimeZone();
    const hoyStr = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");
    const horaActual12 = Utilities.formatDate(new Date(), tz, "hh:mm a").toUpperCase();
    const horaActualSegundos12 = Utilities.formatDate(new Date(), tz, "hh:mm:ss a").toUpperCase();
    
    // Mapear la columna objetivo (C=3, D=4, E=5, F=6) y los estados (Col I y J)
    let colIndex = 0; 
    let estadoTexto = "";
    let estadoNum = 0;
    let esIngresoOSalida = false;

    // Diccionario de mapeo estricto e inmutable para evitar solapamiento de palabras (ej. "regresé de comer" vs "voy a comer")
    const MAPA_ASISTENCIA = {
      "ya llegué":        { col: 3, estado: "Disponible",   num: 0, esExtremo: true },
      "voy a comer":      { col: 4, estado: "En refrigerio", num: 3, esExtremo: false },
      "regresé de comer": { col: 5, estado: "Disponible",   num: 0, esExtremo: false },
      "regresé":          { col: 5, estado: "Disponible",   num: 0, esExtremo: false },
      "acabó mi día":     { col: 6, estado: "Ausente",      num: 5, esExtremo: true }
    };

    const regla = MAPA_ASISTENCIA[msgNorm];
    if (!regla) return; // No es una alerta de asistencia

    const colIndex = regla.col;
    const estadoTexto = regla.estado;
    const estadoNum = regla.num;
    const esIngresoOSalida = regla.esExtremo;
    
    // Mapeo de Especialidad (Col K y L)
    const espNorm = String(especialidad || 'Estilismo').trim();
    let espTexto = espNorm;
    let espNum = 0;
    
    if (espNorm.toLowerCase().includes('estilism')) {
      espTexto = "Estilismo";
      espNum = 0;
    } else if (espNorm.toLowerCase().includes('cosmiatr')) {
      espTexto = "Cosmiatría";
      espNum = 1;
    } else if (espNorm.toLowerCase().includes('admin') || espNorm.toLowerCase().includes('jefe') || espNorm.toLowerCase().includes('operativ')) {
      espTexto = "Administracion";
      espNum = 2;
    }
    
    let filaEncontrada = -1;
    
    if (lastRow >= 2) {
      const data = sheetBorrador.getRange(2, 1, lastRow - 1, 13).getValues();
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
      // Fila existe: Actualizar Col C, D, E, o F según la alerta si la casilla está vacía
      const celdaTarget = sheetBorrador.getRange(filaEncontrada, colIndex);
      const valorActual = celdaTarget.getValue();
      if (!valorActual || String(valorActual).trim() === '') {
        celdaTarget.setValue(horaActual12);
      }
      
      // Actualizar Col I (Estado), Col J (Num Estado), Col K (Especialidad), Col L (Num Especialidad)
      sheetBorrador.getRange(filaEncontrada, 9).setValue(estadoTexto); // Col I
      sheetBorrador.getRange(filaEncontrada, 10).setValue(estadoNum);  // Col J
      sheetBorrador.getRange(filaEncontrada, 11).setValue(espTexto);   // Col K
      sheetBorrador.getRange(filaEncontrada, 12).setValue(espNum);     // Col L
      
      // Actualizar Col M (HH:MM:SS AM/PM) solo en Ingreso ("Ya llegué") o Salida ("Acabó mi día")
      if (esIngresoOSalida) {
        sheetBorrador.getRange(filaEncontrada, 13).setValue(horaActualSegundos12); // Col M
      }

    } else {
      // No existe fila previa para el trabajador el día de hoy: Crear nueva fila de 13 columnas (A -> M)
      const nuevaFila = new Array(13).fill('');
      nuevaFila[0] = hoyStr;
      nuevaFila[1] = nickname;
      nuevaFila[colIndex - 1] = horaActual12; // Col C, D, E, o F (índice 2, 3, 4, 5)
      nuevaFila[8] = estadoTexto; // Col I (Índice 8)
      nuevaFila[9] = estadoNum;   // Col J (Índice 9)
      nuevaFila[10] = espTexto;   // Col K (Índice 10)
      nuevaFila[11] = espNum;     // Col L (Índice 11)
      if (esIngresoOSalida) {
        nuevaFila[12] = horaActualSegundos12; // Col M (Índice 12)
      }
      
      sheetBorrador.appendRow(nuevaFila);
    }
  } catch (err) {
    Logger.log("[ASISTENCIA BORRADOR ERROR] " + err.toString());
  }
}
