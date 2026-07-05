/**
 * =========================================================================
 * ARCHIVO DE INSERCIÓN DE NUEVOS REGISTROS
 * =========================================================================
 * Gestiona la inserción de nuevos clientes y nuevas citas desde los formularios.
 */

/**
 * Calcula el porcentaje de similitud entre dos cadenas usando la distancia de Levenshtein.
 * Retorna un valor numérico entre 0 y 100.
 */
function calcularSimilitud(s1, s2) {
  if (!s1 || !s2) return 0;
  s1 = s1.toLowerCase().replace(/\s+/g, '');
  s2 = s2.toLowerCase().replace(/\s+/g, '');
  if (s1 === s2) return 100;
  
  const m = s1.length, n = s2.length;
  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      if (s1[i - 1] === s2[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + 1
        );
      }
    }
  }
  
  const maxLen = Math.max(m, n);
  const distance = d[m][n];
  return ((maxLen - distance) / maxLen) * 100;
}

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
    
    const nombreCompletoNuevo = `${nuevoNombre} ${nuevoApellido}`.trim();
    
    // Validación de duplicados (empezando desde la fila 2)
    for (let i = 1; i < data.length; i++) {
      const nombreExistente = String(data[i][1] || '').toLowerCase().trim();
      const apellidoExistente = String(data[i][2] || '').toLowerCase().trim();
      const celularExistente = String(data[i][5] || '').toLowerCase().trim();
      const nombreCompletoExistente = `${nombreExistente} ${apellidoExistente}`.trim();
      
      // Chequear si coincide Celular (Exacto)
      if (nuevoCelular && celularExistente === nuevoCelular) {
        return { exito: false, mensaje: `El número de celular ${nuevoCelular} ya está registrado a nombre de: ${nombreCompletoExistente.toUpperCase()}. Por favor, búscalo en tu base de datos.` };
      }
      
      // Chequear similitud de Nombre + Apellido (> 80%)
      if (nombreCompletoNuevo.length > 3 && nombreCompletoExistente.length > 3) {
        const similitud = calcularSimilitud(nombreCompletoNuevo, nombreCompletoExistente);
        if (similitud > 80) {
           return { 
             exito: false, 
             mensaje: `Posible duplicado detectado.\n¿Podría ser: ${nombreCompletoExistente.toUpperCase()}?\n(Celular registrado: ${celularExistente || 'Ninguno'}).\n\nPor favor, búscalo en la base de datos.`
           };
        }
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

/**
 * Edita los datos de un cliente existente y sincroniza retroactivamente su historial en OATC.
 * 
 * @param {string} sede La sede operativa
 * @param {string} nombreAntiguo Nombre completo original usado como llave
 * @param {object} payloadNuevo { nombre, apellido, dni, cumpleanos, celular, correo }
 */
function editarClienteYSincronizar(sede, nombreAntiguo, payloadNuevo) {
  try {
    const sheetClientes = getHoja(sede, "Clientes");
    const data = sheetClientes.getDataRange().getValues();
    
    const target = nombreAntiguo.toLowerCase().trim();
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      const nombreCompleto = `${String(data[i][1] || '')} ${String(data[i][2] || '')}`.toLowerCase().trim();
      if (nombreCompleto === target) {
        rowIndex = i + 1; // +1 por 1-index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { exito: false, mensaje: "No se encontró el cliente para editar." };
    }
    
    // Actualizar columnas en Clientes: B(2), C(3), D(4), E(5), F(6), G(7)
    if(payloadNuevo.nombre) sheetClientes.getRange(rowIndex, 2).setValue(String(payloadNuevo.nombre).trim());
    if(payloadNuevo.apellido) sheetClientes.getRange(rowIndex, 3).setValue(String(payloadNuevo.apellido).trim());
    if(payloadNuevo.dni) sheetClientes.getRange(rowIndex, 4).setValue(String(payloadNuevo.dni).trim());
    if(payloadNuevo.cumpleanos) sheetClientes.getRange(rowIndex, 5).setValue(String(payloadNuevo.cumpleanos).trim());
    if(payloadNuevo.celular) sheetClientes.getRange(rowIndex, 6).setValue(String(payloadNuevo.celular).trim());
    if(payloadNuevo.correo) sheetClientes.getRange(rowIndex, 7).setValue(String(payloadNuevo.correo).trim());
    
    // Preparar nueva cadena OATC
    const nuevoNombreCompleto = `${String(payloadNuevo.nombre || '').trim()} ${String(payloadNuevo.apellido || '').trim()}`.trim();
    const nuevoDni = String(payloadNuevo.dni || '').trim();
    const nuevoCelular = String(payloadNuevo.celular || '').trim();
    const nuevaCadenaOatc = `${nuevoNombreCompleto} | ${nuevoDni} | ${nuevoCelular}`;
    
    // Lanzar sincronización OATC
    sincronizarClienteRetroactivo(sede, target, nuevaCadenaOatc);
    
    return { exito: true, mensaje: "Cliente actualizado y sincronizado correctamente." };
  } catch (e) {
    return { exito: false, mensaje: e.toString() };
  }
}

/**
 * Recorre el historial OATC y sobrescribe los registros que pertenecían al nombre antiguo.
 */
function sincronizarClienteRetroactivo(sede, nombreAntiguo, nuevaCadenaOatc) {
  try {
    const sheetOatc = getHoja(sede, "OATC");
    const lastRow = sheetOatc.getLastRow();
    if (lastRow < 2) return;
    
    const data = sheetOatc.getRange(2, 4, lastRow - 1, 2).getValues(); // Columnas D(index 0) y E(index 1)
    const target = nombreAntiguo.toLowerCase().replace(/\s+/g, '');
    
    for (let i = 0; i < data.length; i++) {
      // Buscar en D (index 0) y E (index 1)
      [data[i][0], data[i][1]].forEach((celda, colIndex) => {
        if (celda && String(celda).includes('|')) {
          const partes = String(celda).split('|').map(p => p.trim());
          const nombreEnCelda = String(partes[0] || '').toLowerCase().replace(/\s+/g, '');
          if (nombreEnCelda === target) {
             // Sobrescribir en la columna correspondiente (D=4, E=5)
             sheetOatc.getRange(i + 2, colIndex + 4).setValue(nuevaCadenaOatc);
          }
        }
      });
    }
  } catch(e) {
    console.error("Error en sincronizarClienteRetroactivo:", e);
  }
}
