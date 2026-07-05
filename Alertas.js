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
function registrarAlertaBotonera(nickname, mensaje, sede) {
  Logger.log("[ALERTAS] Registrando alerta de " + nickname + " en " + sede + ": " + mensaje);
  
  try {
    // 1. Obtiene la hoja correcta de Alertas usando el enrutador maestro.
    // getHoja ya envía cualquier hoja que no sea "Agentes" al ID de Operaciones.
    const hojaAlertas = getHoja(sede, "Alertas");
    
    // 2. Genera el payload de la fila
    const timestamp = new Date().getTime();
    const idUnico = "ALT-" + timestamp;
    
    // Formatear la fecha para Recepción (DD/MM/YYYY HH:MM:SS)
    const fechaHoraStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    const estado = "Pendiente";
    const horaResuelta = ""; // Vacío al inicio
    
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
    
    return { exito: true };
    
  } catch (error) {
    Logger.log("[ALERTAS CRÍTICO] Fallo al registrar alerta: " + error.toString());
    return { exito: false, mensaje: error.toString() };
  }
}
