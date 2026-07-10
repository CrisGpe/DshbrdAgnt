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
    idVentas: "1J2efkmlDygvOE9wIK0hsp-WzUevNzP8_kWi_Nz7RYGk",      // ID donde está "Registro ventas caja"
    idErp: "1RQpMXqorsIzmMyoYAv0Jp0QS2PL-w5pzDEKBMKugfXc",         // ID ERP "Ventas_Tickets", "Ventas_Detalle", "BBDD_Productos"
    nombre: "Sede RD" 
  },
  "Luxury": { 
    idAdmin: "1w2ZiQPfDfUWM6ODpHQoKn14FGBwwNhzIKxe5-RmEfBw",       // ID Unificado
    idOperaciones: "1w2ZiQPfDfUWM6ODpHQoKn14FGBwwNhzIKxe5-RmEfBw", // ID Unificado
    idVentas: "1w2ZiQPfDfUWM6ODpHQoKn14FGBwwNhzIKxe5-RmEfBw",      // Fallback
    idErp: "1w2ZiQPfDfUWM6ODpHQoKn14FGBwwNhzIKxe5-RmEfBw",         // Fallback
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
  } else if (nombreHoja === "Registro ventas caja") {
    idLibroTarget = sedeConfig.idVentas;
  } else if (["Ventas_Tickets", "Ventas_Detalle", "BBDD_Productos"].includes(nombreHoja)) {
    idLibroTarget = sedeConfig.idErp;
  } else {
    // Para "Borrador", "OATC", "Alertas", "Clientes", etc.
    idLibroTarget = sedeConfig.idOperaciones;
  }
  
  const libro = SpreadsheetApp.openById(idLibroTarget);
  const hoja = libro.getSheetByName(nombreHoja);
  
  if (!hoja) throw new Error("No existe la pestaña " + nombreHoja + " en el libro asignado a " + sede);
  return hoja;
}