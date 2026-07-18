/**
 * =========================================================================
 * PROCESADOR MASTER DE IDENTIDAD, SEGURIDAD Y PRIVILEGIOS: Auth.gs
 * =========================================================================
 * Desarrollado por: Programador GAS
 * 
 * Sanea el acceso confrontando las credenciales e interceptando el estado 
 * operativo de la columna K para mitigar accesos de personal cesado.
 */

/**
 * Valida las credenciales ingresadas e intercepta la vigencia del colaborador.
 * 
 * @param {string} nickname - Apodo seleccionado por el Agente.
 * @param {string} pin - Código secreto numérico de 4 dígitos.
 * @param {string} sede - Identificador de la base de datos ("RD" o "Luxury").
 * @return {Object} Perfil con privilegios de Especialidad o rechazo controlado.
 */
function loginAgente(nickname, pin, sede) {
  const sedeActiva = (sede && (sede === "RD" || sede === "Luxury" || sede === "Gloss")) ? sede : "RD";
  Logger.log("[SISTEMA ACCESO] Intento de login para Nickname: " + nickname + " | Sede: " + sedeActiva);
  
  try {
    const hoja = getHoja(sedeActiva, "Agentes");
    const datos = hoja.getDataRange().getValues();
    
    // Mapeo Estricto de la Matriz de Memoria (Base 0):
    // Col C (2)  -> Nombre Completo
    // Col J (9)  -> DNI
    // Col K (10) -> Estado Operativo (Activo / Inactivo) <-- NUEVO CONTROL
    // Col L (11) -> Especialidad / Rol
    // Col N (13) -> Nickname
    // Col O (14) -> Celular
    // Col Q (16) -> PIN
    for (let i = 1; i < datos.length; i++) {
      const dbNickname = datos[i][13] ? String(datos[i][13]).trim() : "";
      const dbPin = datos[i][16] ? String(datos[i][16]).trim() : "";
      const dbEstado = datos[i][10] ? String(datos[i][10]).trim() : "";
      const dbEspecialidad = datos[i][11] ? String(datos[i][11]).trim() : "";
      
      if (dbNickname.toLowerCase() === nickname.trim().toLowerCase() && dbPin === pin.trim()) {
        
        // INTERCEPCIÓN DE SEGURIDAD: Denegar acceso si el estado no es "Activo"
        if (dbEstado.toLowerCase() !== "activo") {
          Logger.log("[SISTEMA ACCESO ADVERTENCIA] Intento de acceso bloqueado: Colaborador " + dbNickname + " está INACTIVO.");
          return { 
            exito: false, 
            mensaje: "Acceso denegado: Tu usuario se encuentra 'Inactivo'. Comunícate con el Administrador." 
          };
        }
        
        Logger.log("[SISTEMA ACCESO] Credenciales válidas y Activas. Especialidad: " + dbEspecialidad);
        const formatearHora = (valor) => {
          if (valor instanceof Date) {
            let h = valor.getHours();
            let m = valor.getMinutes().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'pm' : 'am';
            h = h % 12;
            h = h ? h : 12;
            return h + ':' + m + ' ' + ampm;
          }
          return valor ? String(valor).trim() : "";
        };

        const formatearFecha = (valor) => {
          if (valor instanceof Date) {
            const d = valor.getDate().toString().padStart(2, '0');
            const m = (valor.getMonth() + 1).toString().padStart(2, '0');
            const y = valor.getFullYear();
            return `${d}/${m}/${y}`;
          }
          return valor ? String(valor).trim() : "";
        };

        return { 
          exito: true, 
          filaOriginal: i + 1, // Base 1 para operaciones atómicas de persistencia
          sede: sedeActiva,
          nombre: datos[i][2] ? String(datos[i][2]).trim() : "",
          sedeBase: datos[i][4] ? String(datos[i][4]).trim() : "", // Col E
          horarioEntrada: formatearHora(datos[i][5]), // Col F
          horarioSalida: formatearHora(datos[i][6]), // Col G
          diaDescanso: datos[i][7] ? String(datos[i][7]).trim() : "", // Col H
          cumpleanos: formatearFecha(datos[i][8]), // Col I
          dni: datos[i][9] ? String(datos[i][9]).trim() : "", // Col J
          especialidad: dbEspecialidad,
          nickname: dbNickname,
          celular: datos[i][14] ? String(datos[i][14]).trim() : "", // Col O
          genero: datos[i][15] ? String(datos[i][15]).trim() : "", // Col P
          pin: dbPin
        };
      }
    }
    
    Logger.log("[SISTEMA ACCESO] Intento fallido: Credenciales incorrectas.");
    return { exito: false, mensaje: "El Nickname o el PIN ingresados son incorrectos para la sede seleccionada." };
    
  } catch (error) {
    Logger.log("[SISTEMA ACCESO ERROR] Excepción en loginAgente: " + error.toString());
    return { exito: false, mensaje: "Error crítico del servidor en la validación: " + error.message };
  }
}

/**
 * Provee la lista única de nicknames filtrando únicamente a los agentes activos.
 */
function obtenerNicknamesPorSede(sede) {
  const sedeActiva = (sede && (sede === "RD" || sede === "Luxury" || sede === "Gloss")) ? sede : "RD";
  
  try {
    const hoja = getHoja(sedeActiva, "Agentes");
    const lastRow = hoja.getLastRow();
    if (lastRow < 2) return [];
    
    // OPTIMIZACIÓN BATCH: Leemos de la columna K (11) a la N (14) -> 4 columnas de ancho en 1 paso I/O
    const datos = hoja.getRange(2, 11, lastRow - 1, 4).getValues();
    const nicknames = [];
    
    datos.forEach(row => {
      const estado = row[0] ? String(row[0]).trim().toLowerCase() : "";
      const nick = row[3] ? String(row[3]).trim() : "";
      
      // Añadimos al selector únicamente si el colaborador está Activo
      if (estado === "activo" && nick !== "" && nick !== "undefined" && !nicknames.includes(nick)) {
        nicknames.push(nick);
      }
    });
    
    return nicknames.sort((a, b) => a.localeCompare(b));
  } catch (error) {
    Logger.log("[SISTEMA ACCESO ERROR] Fallo en obtenerNicknamesPorSede: " + error.toString());
    return [];
  }
}