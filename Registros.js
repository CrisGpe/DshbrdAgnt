/**
 * =========================================================================
 * ARCHIVO DE INSERCIÓN DE NUEVOS REGISTROS
 * =========================================================================
 * Gestiona la inserción de nuevos clientes y nuevas citas desde los formularios.
 */

/**
 * Registra un nuevo cliente en la hoja "Clientes".
 * Valida que no exista un cliente con el mismo nombre y apellido, o mismo celular.
 * 
 * @param {string} sede La sede operativa
 * @param {object} payload { nombre, apellido, dni, cumpleanos, celular, correo }
 */
function registrarClienteBBDD(sede, payload) {
  try {
    const sheet = getHoja(sede, "Clientes");
    const data = sheet.getDataRange().getValues();
    
    const nuevoNombre = String(payload.nombre || '').toLowerCase().trim();
    const nuevoApellido = String(payload.apellido || '').toLowerCase().trim();
    const nuevoCelular = String(payload.celular || '').toLowerCase().trim();
    
    // Validación de duplicados (empezando desde la fila 2)
    for (let i = 1; i < data.length; i++) {
      const nombreExistente = String(data[i][1] || '').toLowerCase().trim();
      const apellidoExistente = String(data[i][2] || '').toLowerCase().trim();
      const celularExistente = String(data[i][5] || '').toLowerCase().trim();
      
      // Chequear si coincide Nombre + Apellido
      if (nuevoNombre && nuevoApellido && nombreExistente === nuevoNombre && apellidoExistente === nuevoApellido) {
        return { exito: false, mensaje: "Ya existe un cliente con ese mismo nombre y apellido." };
      }
      
      // Chequear si coincide Celular
      if (nuevoCelular && celularExistente === nuevoCelular) {
        return { exito: false, mensaje: "Ya existe un cliente registrado con ese mismo número de celular." };
      }
    }
    
    // Preparar Fila: Fecha(A), Nombre(B), Apellido(C), DNI(D), Cumpleaños(E), Celular(F), Correo(G), Última Visita(H)
    const row = [
      new Date(), // A
      payload.nombre ? String(payload.nombre).trim() : "", // B
      payload.apellido ? String(payload.apellido).trim() : "", // C
      payload.dni ? String(payload.dni).trim() : "", // D
      payload.cumpleanos ? String(payload.cumpleanos).trim() : "", // E
      payload.celular ? String(payload.celular).trim() : "", // F
      payload.correo ? String(payload.correo).trim() : "", // G
      "" // H (Última Visita vacío al crear)
    ];
    
    sheet.appendRow(row);
    return { exito: true, mensaje: "Cliente guardado exitosamente." };
  } catch (e) {
    return { exito: false, mensaje: e.toString() };
  }
}

/**
 * Registra una nueva cita en la hoja "Registro Citas".
 * 
 * @param {string} sede La sede operativa
 * @param {object} payload { fechaCita, horaCita, cliente, tipoCliente, servicio }
 * @param {string} nicknameAgente El nickname del agente logueado
 */
function registrarCitaBBDD(sede, payload, nicknameAgente) {
  try {
    const sheet = getHoja(sede, "Registro Citas");
    
    // Preparar Fila: Fecha Registro(A), Fecha Cita(B), Hora Cita(C), Cliente(D), Tipo Cliente(E), Agente(F), Servicio(G), Estado(H)
    const row = [
      new Date(), // A (Registro)
      payload.fechaCita ? String(payload.fechaCita).trim() : "", // B
      payload.horaCita ? String(payload.horaCita).trim() : "", // C
      payload.cliente ? String(payload.cliente).trim() : "", // D
      payload.tipoCliente ? String(payload.tipoCliente).trim() : "", // E
      nicknameAgente ? String(nicknameAgente).trim() : "", // F
      payload.servicio ? String(payload.servicio).trim() : "", // G
      "Pendiente" // H (Por defecto pendiente)
    ];
    
    sheet.appendRow(row);
    return { exito: true, mensaje: "Cita guardada exitosamente." };
  } catch (e) {
    return { exito: false, mensaje: e.toString() };
  }
}
