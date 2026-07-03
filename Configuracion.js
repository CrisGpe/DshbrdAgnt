/**
 * =========================================================================
 * ARCHIVO DE CONFIGURACIÓN Y ENRUTAMIENTO CENTRALIZADO
 * =========================================================================
 * Desarrollado por: Programador GAS
 * 
 * Gestiona los IDs de los libros de Google Sheets para cada Sede y el acceso
 * dinámico a las pestañas correspondientes.
 */

const SEDES = {
  "RD": { 
    idAdmin: "1U0TkAI74Q0Opqs6UcuVxYtqN41UApPorusopaQDk-3E",       // ID donde está "Agentes"
    idOperaciones: "1kbj7BGZyIWcXMj2aqNelSkw25ISuFRUY6AArTt8WjzI", // ID donde está "Borrador" y "OATC"
    nombre: "Sede RD" 
  },
  "Luxury": { 
    idAdmin: "1w2ZiQPfDfUWM6ODpHQoKn14FGBwwNhzIKxe5-RmEfBw",       // ID Unificado
    idOperaciones: "1w2ZiQPfDfUWM6ODpHQoKn14FGBwwNhzIKxe5-RmEfBw", // ID Unificado
    nombre: "Sede Luxury" 
  }
};

/**
 * Función maestra inteligente: Determina automáticamente a qué libro 
 * conectarse dependiendo de la pestaña solicitada.
 * 
 * @param {string} sede - Clave de la sede ("RD" o "Luxury")
 * @param {string} nombreHoja - Nombre de la pestaña de destino
 * @return {Sheet} Objeto nativo de la hoja de Google Sheets
 */
function getHoja(sede, nombreHoja) {
  const sedeConfig = SEDES[sede];
  if (!sedeConfig) throw new Error("Sede no registrada: " + sede);
  
  let idLibroTarget;
  
  // SOLUCIÓN: Eliminamos la asignación a la variable fantasma "RichmondConfig"
  // Enrutamiento inteligente según el tipo de datos requerido
  if (nombreHoja === "Agentes") {
    idLibroTarget = sedeConfig.idAdmin;
  } else {
    // Para "Borrador", "OATC", "Alertas", etc.
    idLibroTarget = sedeConfig.idOperaciones;
  }
  
  const libro = SpreadsheetApp.openById(idLibroTarget);
  const hoja = libro.getSheetByName(nombreHoja);
  
  if (!hoja) throw new Error("No existe la pestaña " + nombreHoja + " en el libro asignado a " + sede);
  return hoja;
}