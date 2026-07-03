/**
 * Calcula la posición exacta del agente dentro de la cola de atención basada en Borrador.
 */
function calcularPosicionCola(nickname, especialidad, sede) {
  try {
    const sheet = getHoja(sede, "Borrador");
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      return { exito: true, posicion: 0, total: 0, lista: [] };
    }
    
    const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues(); // Hasta Col N
    const colaAgentes = [];
    
    data.forEach(row => {
      const estado = row[8] ? row[8].toString().trim() : "";       // Col I
      const tipoAgente = row[10] ? row[10].toString().trim() : ""; // Col K
      const ultActStr = row[12] ? row[12].toString().trim() : "";  // Col M
      const apodo = row[1] ? row[1].toString().trim() : "";        // Col B
      
      // Regla de negocio: Estado "Disponible" y misma especialidad (Tipo Agente)
      if (estado.toLowerCase() === "disponible" && tipoAgente.toLowerCase() === especialidad.toLowerCase() && apodo !== "") {
        // Evitamos duplicados en la lista si el agente figura en más de una fila activa
        if (!colaAgentes.some(a => a.apodo.toLowerCase() === apodo.toLowerCase())) {
          colaAgentes.push({
            apodo: apodo,
            ultAct: ultActStr,
            minutos: helperParseHoraAMPM(ultActStr) // Convertimos para ordenar exactamente
          });
        }
      }
    });
    
    // Ordenar de menor a mayor basado en los minutos absolutos de Última Actualización
    colaAgentes.sort((a, b) => a.minutos - b.minutos);
    
    // Buscar posición del agente actual
    const miApodoLower = nickname.toLowerCase().trim();
    const miPosicion = colaAgentes.findIndex(a => a.apodo.toLowerCase() === miApodoLower) + 1;
    
    return {
      exito: true,
      posicion: miPosicion, // Retorna 0 si el agente no está en estado "Disponible"
      total: colaAgentes.length,
      lista: colaAgentes
    };
  } catch (e) {
    return { exito: false, mensaje: e.toString() };
  }
}

/**
 * Función Auxiliar: Convierte cadenas de texto "X:XX AM/PM" a minutos desde la medianoche.
 */
function helperParseHoraAMPM(horaStr) {
  if (!horaStr) return 9999; 
  const match = horaStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 9999;
  
  let horas = parseInt(match[1], 10);
  const minutos = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === "PM" && horas < 12) horas += 12;
  if (ampm === "AM" && horas === 12) horas = 0;
  
  return (horas * 60) + minutos;
}