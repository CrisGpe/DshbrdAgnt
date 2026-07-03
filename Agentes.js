/**
 * =========================================================================
 * MÓDULO OPERATIVO DE GESTIÓN DE COLABORADORES
 * =========================================================================
 * Desarrollado por: Programador GAS
 * 
 * Centraliza las mutaciones de datos del personal e interacciones directas 
 * con el libro maestro de administración.
 */

/**
 * Actualiza los datos editables del agente en la pestaña Agentes.
 * 
 * RENDIMIENTO PREMIUM: Implementa optimización Atómica Batch I/O. Reduce de 4 llamadas 
 * de red independientes con la API de Sheets a una sola transacción segura (Lectura/Escritura).
 */
function actualizarPerfil(sede, filaOriginal, nuevosDatos) {
  try {
    const sheet = getHoja(sede, "Agentes");
    
    // SOLUCIÓN: Leemos la fila completa en memoria (Rango desde Columna A hasta Q = 17 columnas)
    const rangoFila = sheet.getRange(filaOriginal, 1, 1, 17);
    const matrizFila = rangoFila.getValues(); // Devuelve arreglo bidimensional en Base 0 [0][columna]
    
    // Realizamos las modificaciones directamente sobre el arreglo en memoria JS.
    // Mapeamos los índices de matriz exactamente con los índices correspondientes del login de Auth.gs:
    matrizFila[0][9]  = nuevosDatos.dni.toString().trim();       // Col J (Índice 9 en Base 0)
    matrizFila[0][13] = nuevosDatos.nickname.toString().trim();  // Col N (Índice 13 en Base 0)
    matrizFila[0][14] = nuevosDatos.celular.toString().trim();   // Col O (Índice 14 en Base 0)
    matrizFila[0][16] = nuevosDatos.pin.toString().trim();       // Col Q (Índice 16 en Base 0)
    
    // Escribimos los cambios de golpe en una sola petición síncrona
    rangoFila.setValues(matrizFila);
    
    return { exito: true };
  } catch (e) {
    return { exito: false, mensaje: e.toString() };
  }
}