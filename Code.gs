// ══════════════════════════════════════════════════════════════
//  Alquileres — Google Apps Script Backend
//  Hojas:
//    "Pagos"          — un pago por fila (columna Detalle = montos por servicio en JSON)
//    "Config"         — configuración general (JSON en A1)
//    "Personas"       — inquilinos
//    "Servicios"      — servicios dinámicos
//    "Tarifas"        — una fila por período: Clave | Datos (JSON)
//    "Liquidaciones"  — una fila por período: Clave | Datos (JSON)
//    "Usuarios"       — usuarios con contraseña hasheada
//
//  Seguridad:
//    - Lecturas públicas devuelven solo los campos necesarios para la vista pública.
//    - Toda escritura exige un token de sesión de administrador (acción "login").
//    - Las contraseñas se guardan como sha256 con sal; las antiguas en texto plano
//      se migran automáticamente en el primer login correcto.
// ══════════════════════════════════════════════════════════════

const HOJA_PAGOS         = "Pagos";
const HOJA_CONFIG        = "Config";
const HOJA_PERSONAS      = "Personas";
const HOJA_SERVICIOS     = "Servicios";
const HOJA_TARIFAS       = "Tarifas";
const HOJA_LIQUIDACIONES = "Liquidaciones";
const HOJA_USUARIOS      = "Usuarios";

const HEADERS_PAGOS     = ["ID","Fecha","CreadoEn","Inquilino","PersonaId","MontoRecibido","Cambio","PeriodoMes","PeriodoAnio","Alquiler","Agua","Luz","Gas","Internet","Otros","Total","Metodo","Estado","Notas","Detalle"];
const HEADERS_PERSONAS  = ["id","nombre","inmueble","telefono","email","notas","habitaciones","personas","activo"];
const HEADERS_SERVICIOS = ["id","label","icon","unit","tipo","reparto","requerido","orden"];
const HEADERS_USUARIOS  = ["id","nombre","email","password","rol","personaId"];
const HEADERS_MAPA      = ["Clave","Datos"];

const CAMPOS_PERSONA_PUBLICOS = ["id","nombre","inmueble","habitaciones","personas","activo"];
const CAMPOS_PAGO_PUBLICOS    = ["id","personaId","inquilino","periodoMes","periodoAnio","estado","total"];

const SESION_SEGUNDOS   = 6 * 60 * 60;   // máximo permitido por CacheService
const MAX_INTENTOS      = 5;
const BLOQUEO_SEGUNDOS  = 15 * 60;
const PASSWORD_DEFECTO  = "admin123";
const HASH_ITERACIONES  = 500;

// ── Entradas ────────────────────────────────────────────────

function doGet() {
  return jsonResponse({ ok: true, servicio: "alquileres", mensaje: "Use POST con { action }" });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;
    const sesion = leerSesion(body.token);

    switch (action) {
      case "bootstrap":      return jsonResponse(bootstrap(sesion));
      case "login":          return jsonResponse(login(body.usuario, body.password));
      case "logout":         if (body.token) CacheService.getScriptCache().remove("ses_" + body.token);
                             return jsonResponse({ ok: true });
      case "changePassword": return jsonResponse(conLock(() => cambiarPassword(requerirSesion(sesion), body.actual, body.nueva)));
    }

    const admin = requerirAdmin(sesion);
    const resultado = conLock(() => {
      switch (action) {
        case "saveConfig":      guardarJsonCelda(HOJA_CONFIG, body.config); return { ok: true };
        case "createPago":      return crearPago(body.pago);
        case "deletePago":      borrarFila(HOJA_PAGOS, body.id); return { ok: true };
        case "upsertPersona":   upsertFila(HOJA_PERSONAS, HEADERS_PERSONAS, validarConId(body.persona)); return { ok: true };
        case "deletePersona":   borrarFila(HOJA_PERSONAS, body.id); return { ok: true };
        case "upsertServicio":  upsertFila(HOJA_SERVICIOS, HEADERS_SERVICIOS, validarConId(body.servicio)); return { ok: true };
        case "deleteServicio":  borrarFila(HOJA_SERVICIOS, body.id); return { ok: true };
        case "setTarifa":       setEntradaMapa(HOJA_TARIFAS, validarClave(body.clave), body.datos); return { ok: true };
        case "setLiquidacion":  setEntradaMapa(HOJA_LIQUIDACIONES, validarClave(body.clave), body.datos); return { ok: true };
        case "upsertUsuario":   return upsertUsuario(body.usuario);
        case "deleteUsuario":   return borrarUsuario(admin, body.id);
        default:                return { ok: false, error: "Acción desconocida: " + action };
      }
    });
    return jsonResponse(resultado);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err), code: err.code || "ERROR" });
  }
}

// ── Lectura inicial ─────────────────────────────────────────

function bootstrap(sesion) {
  const rol = sesion ? sesion.rol : null;
  const personas = leerTabla(HOJA_PERSONAS);
  let pagos = leerPagos();

  const data = {
    config: leerJsonCelda(HOJA_CONFIG),
    servicios: leerTabla(HOJA_SERVICIOS).sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)),
    tarifas: leerMapa(HOJA_TARIFAS),
    liquidaciones: leerMapa(HOJA_LIQUIDACIONES),
  };

  if (rol === "admin") {
    data.personas = personas;
    data.pagos = pagos;
    data.usuarios = leerTabla(HOJA_USUARIOS).map(sinPassword);
  } else {
    data.personas = personas.map(p => soloCampos(p, CAMPOS_PERSONA_PUBLICOS));
    data.pagos = pagos.map(p => soloCampos(p, CAMPOS_PAGO_PUBLICOS));
    if (rol === "inquilino") {
      // El inquilino ve el detalle completo solo de sus propios pagos
      const propios = pagos.filter(p => String(p.personaId) === String(sesion.personaId));
      const ids = propios.map(p => String(p.id));
      data.pagos = data.pagos.filter(p => ids.indexOf(String(p.id)) < 0).concat(propios);
    }
  }
  return { ok: true, data: data, sesion: sesion ? sesionPublica(sesion) : null };
}

// ── Autenticación ───────────────────────────────────────────

function login(usuario, password) {
  usuario = String(usuario || "").trim().toLowerCase();
  password = String(password || "");
  if (!usuario || !password) throw errorCodigo("Ingrese usuario y contraseña", "AUTH");

  const cache = CacheService.getScriptCache();
  const claveIntentos = "fail_" + usuario;
  const intentos = Number(cache.get(claveIntentos)) || 0;
  if (intentos >= MAX_INTENTOS) throw errorCodigo("Demasiados intentos. Espere 15 minutos.", "BLOQUEADO");

  return conLock(() => {
    asegurarAdminInicial();
    const sheet = asegurarHoja(HOJA_USUARIOS);
    const usuarios = leerTabla(HOJA_USUARIOS);
    const idx = usuarios.findIndex(u =>
      String(u.email || "").trim().toLowerCase() === usuario ||
      String(u.nombre || "").trim().toLowerCase() === usuario);
    const u = idx >= 0 ? usuarios[idx] : null;

    if (!u || !verificarPassword(password, String(u.password))) {
      cache.put(claveIntentos, String(intentos + 1), BLOQUEO_SEGUNDOS);
      throw errorCodigo("Credenciales incorrectas", "AUTH");
    }
    cache.remove(claveIntentos);

    // Migrar contraseña en texto plano a hash
    if (!esHash(String(u.password))) setCampoUsuario(sheet, u.id, "password", hashPassword(password));

    const sesion = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol === "admin" ? "admin" : "inquilino", personaId: u.personaId || null };
    const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    cache.put("ses_" + token, JSON.stringify(sesion), SESION_SEGUNDOS);
    return { ok: true, token: token, sesion: sesionPublica(sesion), debeCambiarPassword: password === PASSWORD_DEFECTO };
  });
}

function cambiarPassword(sesion, actual, nueva) {
  nueva = String(nueva || "");
  if (nueva.length < 6) throw errorCodigo("La nueva contraseña debe tener al menos 6 caracteres", "VALIDACION");
  const sheet = asegurarHoja(HOJA_USUARIOS);
  const usuarios = leerTabla(HOJA_USUARIOS);
  const idx = usuarios.findIndex(u => String(u.id) === String(sesion.id));
  if (idx < 0) throw errorCodigo("Usuario no encontrado", "AUTH");
  if (!verificarPassword(String(actual || ""), String(usuarios[idx].password))) throw errorCodigo("La contraseña actual no es correcta", "AUTH");
  setCampoUsuario(sheet, sesion.id, "password", hashPassword(nueva));
  return { ok: true };
}

function setCampoUsuario(sheet, id, campo, valor) {
  const headers = asegurarHeaders(sheet, HEADERS_USUARIOS);
  const row = indiceFilaPorId(sheet, headers, id);
  if (row > 0) sheet.getRange(row, headers.indexOf(campo) + 1).setValue(valor);
}

function leerSesion(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get("ses_" + token);
  return raw ? JSON.parse(raw) : null;
}

function requerirSesion(sesion) {
  if (!sesion) throw errorCodigo("Sesión expirada. Inicie sesión nuevamente.", "SESION");
  return sesion;
}

function requerirAdmin(sesion) {
  requerirSesion(sesion);
  if (sesion.rol !== "admin") throw errorCodigo("Permiso denegado", "PERMISO");
  return sesion;
}

function sesionPublica(s) {
  return { id: s.id, nombre: s.nombre, email: s.email, rol: s.rol, personaId: s.personaId };
}

function asegurarAdminInicial() {
  if (leerTabla(HOJA_USUARIOS).length > 0) return;
  upsertFila(HOJA_USUARIOS, HEADERS_USUARIOS, {
    id: 1, nombre: "Administrador", email: "admin", password: hashPassword(PASSWORD_DEFECTO), rol: "admin", personaId: "",
  });
}

// ── Contraseñas ─────────────────────────────────────────────

function esHash(s) { return s.indexOf("sha256$") === 0; }

function hashPassword(password, salt, iteraciones) {
  salt = salt || Utilities.getUuid().replace(/-/g, "");
  iteraciones = iteraciones || HASH_ITERACIONES;
  let h = salt + ":" + password;
  for (let i = 0; i < iteraciones; i++) {
    h = bytesAHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + password, Utilities.Charset.UTF_8));
  }
  return ["sha256", iteraciones, salt, h].join("$");
}

function verificarPassword(password, guardada) {
  if (!guardada) return false;
  if (!esHash(guardada)) return password === guardada; // formato antiguo
  const partes = guardada.split("$");
  return hashPassword(password, partes[2], Number(partes[1])) === guardada;
}

function bytesAHex(bytes) {
  return bytes.map(b => ((b < 0 ? b + 256 : b).toString(16)).padStart(2, "0")).join("");
}

// ── Pagos ───────────────────────────────────────────────────

function leerPagos() {
  return leerTabla(HOJA_PAGOS).map(p => {
    let montos = {};
    if (p.detalle) {
      try { montos = JSON.parse(p.detalle); } catch (e) { montos = {}; }
    } else {
      ["alquiler","agua","luz","gas","internet","otros"].forEach(k => { if (Number(p[k])) montos[k] = Number(p[k]); });
    }
    delete p.detalle;
    return Object.assign({}, montos, p, { montos: montos });
  });
}

function crearPago(pago) {
  if (!pago || !pago.personaId || !pago.periodoMes || !pago.periodoAnio) throw errorCodigo("Pago incompleto", "VALIDACION");
  if (!(Number(pago.total) > 0)) throw errorCodigo("El total debe ser mayor a cero", "VALIDACION");
  const duplicado = leerPagos().some(p =>
    String(p.personaId) === String(pago.personaId) &&
    p.periodoMes === pago.periodoMes &&
    String(p.periodoAnio) === String(pago.periodoAnio) &&
    p.estado === "Pagado");
  if (duplicado) throw errorCodigo("Ya existe un pago registrado para ese inquilino y período", "DUPLICADO");

  const montos = pago.montos || {};
  const fila = Object.assign({}, montos, pago, {
    id: pago.id || Date.now(),
    creadoEn: new Date().toISOString(),
    estado: pago.estado || "Pagado",
    detalle: JSON.stringify(montos),
  });
  delete fila.montos;
  upsertFila(HOJA_PAGOS, HEADERS_PAGOS, fila);
  return { ok: true, id: fila.id, creadoEn: fila.creadoEn };
}

// ── Usuarios ────────────────────────────────────────────────

function upsertUsuario(u) {
  validarConId(u);
  if (!String(u.nombre || "").trim() || !String(u.email || "").trim()) throw errorCodigo("Nombre y usuario son obligatorios", "VALIDACION");
  const usuarios = leerTabla(HOJA_USUARIOS);
  const email = String(u.email).trim().toLowerCase();
  if (usuarios.some(x => String(x.id) !== String(u.id) && String(x.email || "").trim().toLowerCase() === email)) {
    throw errorCodigo("Ya existe un usuario con ese email/usuario", "VALIDACION");
  }
  const existente = usuarios.find(x => String(x.id) === String(u.id));
  let password;
  if (u.password) {
    if (String(u.password).length < 6) throw errorCodigo("La contraseña debe tener al menos 6 caracteres", "VALIDACION");
    password = hashPassword(String(u.password));
  } else if (existente) {
    password = existente.password;
  } else {
    throw errorCodigo("La contraseña es obligatoria", "VALIDACION");
  }
  if (existente && existente.rol === "admin" && u.rol !== "admin" && contarAdmins(usuarios) <= 1) {
    throw errorCodigo("Debe quedar al menos un administrador", "VALIDACION");
  }
  upsertFila(HOJA_USUARIOS, HEADERS_USUARIOS, {
    id: u.id, nombre: String(u.nombre).trim(), email: String(u.email).trim(), password: password,
    rol: u.rol === "admin" ? "admin" : "inquilino", personaId: u.personaId || "",
  });
  return { ok: true };
}

function borrarUsuario(admin, id) {
  const usuarios = leerTabla(HOJA_USUARIOS);
  const u = usuarios.find(x => String(x.id) === String(id));
  if (!u) return { ok: true };
  if (String(u.id) === String(admin.id)) throw errorCodigo("No puede eliminar su propio usuario", "VALIDACION");
  if (u.rol === "admin" && contarAdmins(usuarios) <= 1) throw errorCodigo("Debe quedar al menos un administrador", "VALIDACION");
  borrarFila(HOJA_USUARIOS, id);
  return { ok: true };
}

function contarAdmins(usuarios) { return usuarios.filter(u => u.rol === "admin").length; }
function sinPassword(u) { const r = Object.assign({}, u); delete r.password; return r; }

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorCodigo(mensaje, code) {
  const e = new Error(mensaje);
  e.code = code;
  return e;
}

function conLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw errorCodigo("Servidor ocupado, intente de nuevo", "OCUPADO");
  try { return fn(); } finally { lock.releaseLock(); }
}

function validarConId(obj) {
  if (!obj || obj.id === undefined || obj.id === null || obj.id === "") throw errorCodigo("Registro sin id", "VALIDACION");
  return obj;
}

function validarClave(clave) {
  if (!/^\d{4}-\d{2}$/.test(String(clave))) throw errorCodigo("Clave de período inválida", "VALIDACION");
  return String(clave);
}

function soloCampos(obj, campos) {
  const r = {};
  campos.forEach(c => { if (obj[c] !== undefined) r[c] = obj[c]; });
  return r;
}

function asegurarHoja(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

// "ID" -> "id", "PeriodoMes" -> "periodoMes", "personaId" -> "personaId"
function claveDeHeader(h) {
  h = String(h);
  if (h === h.toUpperCase()) return h.toLowerCase();
  return h.charAt(0).toLowerCase() + h.slice(1);
}

function valorDeCelda(header, v) {
  if (v instanceof Date) {
    const tz = Session.getScriptTimeZone();
    return header === "Fecha" ? Utilities.formatDate(v, tz, "yyyy-MM-dd") : v.toISOString();
  }
  return v;
}

function valorParaCelda(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

// ── Tablas (una fila por registro) ──────────────────────────

function leerTabla(nombre) {
  const sheet = asegurarHoja(nombre);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data.shift();
  return data
    .filter(row => row.some(c => c !== ""))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h !== "") obj[claveDeHeader(h)] = valorDeCelda(h, row[i]); });
      return obj;
    });
}

// Garantiza que existan todas las columnas esperadas sin reordenar ni borrar datos existentes.
function asegurarHeaders(sheet, esperados) {
  const lastCol = sheet.getLastColumn();
  let headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (headers.every(h => h === "")) headers = [];
  const faltantes = esperados.filter(h => headers.indexOf(h) < 0);
  if (faltantes.length) {
    sheet.getRange(1, headers.length + 1, 1, faltantes.length).setValues([faltantes]);
    headers = headers.concat(faltantes);
  }
  return headers;
}

function indiceFilaPorId(sheet, headers, id) {
  const col = headers.findIndex(h => claveDeHeader(h) === "id");
  const lastRow = sheet.getLastRow();
  if (col < 0 || lastRow < 2) return -1;
  const ids = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function upsertFila(nombre, esperados, obj) {
  const sheet = asegurarHoja(nombre);
  const headers = asegurarHeaders(sheet, esperados);
  const fila = headers.map(h => valorParaCelda(obj[claveDeHeader(h)]));
  const row = indiceFilaPorId(sheet, headers, obj.id);
  if (row > 0) sheet.getRange(row, 1, 1, headers.length).setValues([fila]);
  else sheet.appendRow(fila);
}

function borrarFila(nombre, id) {
  if (id === undefined || id === null || id === "") throw errorCodigo("Registro sin id", "VALIDACION");
  const sheet = asegurarHoja(nombre);
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const row = indiceFilaPorId(sheet, headers, id);
  if (row > 0) sheet.deleteRow(row);
}

// ── JSON en una celda (Config) ──────────────────────────────

function guardarJsonCelda(nombre, data) {
  if (!data || typeof data !== "object") throw errorCodigo("Datos inválidos", "VALIDACION");
  const sheet = asegurarHoja(nombre);
  sheet.clearContents();
  sheet.getRange(1, 1).setValue(JSON.stringify(data));
}

function leerJsonCelda(nombre) {
  const val = asegurarHoja(nombre).getRange(1, 1).getValue();
  if (!val) return null;
  try { return JSON.parse(val); } catch (e) { return null; }
}

// ── Mapas por período (Tarifas, Liquidaciones) ──────────────
// Formato nuevo: fila 1 = "Clave | Datos", luego una fila por período.
// Formato antiguo: todo el objeto como JSON en A1 (se migra en la primera escritura).

function esMapaAntiguo(sheet) {
  if (sheet.getLastRow() === 0) return false;
  const a1 = String(sheet.getRange(1, 1).getValue());
  return a1 !== HEADERS_MAPA[0] && a1.charAt(0) === "{";
}

function leerMapa(nombre) {
  const sheet = asegurarHoja(nombre);
  if (esMapaAntiguo(sheet)) return leerJsonCelda(nombre) || {};
  const r = {};
  leerTabla(nombre).forEach(fila => {
    try { r[String(fila.clave)] = JSON.parse(fila.datos); } catch (e) { /* fila corrupta: se ignora */ }
  });
  return r;
}

function setEntradaMapa(nombre, clave, datos) {
  const sheet = asegurarHoja(nombre);
  if (esMapaAntiguo(sheet)) {
    const antiguo = leerJsonCelda(nombre) || {};
    sheet.clearContents();
    const filas = [HEADERS_MAPA].concat(Object.keys(antiguo).map(k => ["'" + k, JSON.stringify(antiguo[k])]));
    sheet.getRange(1, 1, filas.length, 2).setValues(filas);
  }
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, 2).setValues([HEADERS_MAPA]);

  const lastRow = sheet.getLastRow();
  const claves = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  let row = -1;
  for (let i = 0; i < claves.length; i++) if (String(claves[i][0]) === clave) { row = i + 2; break; }

  if (datos === null || datos === undefined) {
    if (row > 0) sheet.deleteRow(row);
    return;
  }
  // Fuerza texto para que Sheets no convierta "2026-03" en fecha
  const valores = [["'" + clave, JSON.stringify(datos)]];
  if (row > 0) sheet.getRange(row, 1, 1, 2).setValues(valores);
  else sheet.getRange(lastRow + 1, 1, 1, 2).setValues(valores);
}
