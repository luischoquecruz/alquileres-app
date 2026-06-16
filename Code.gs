// ══════════════════════════════════════════════════════════════
//  Alquileres — Google Apps Script Backend
//  Sheet principal: "Pagos"       — datos de pagos
//  Sheet "Config"                 — configuración general (una fila)
//  Sheet "Personas"               — inquilinos
//  Sheet "Servicios"              — servicios dinámicos
//  Sheet "Tarifas"                — tarifas por período (JSON)
//  Sheet "Liquidaciones"          — liquidaciones por período (JSON)
// ══════════════════════════════════════════════════════════════

const HOJA_PAGOS        = "Pagos";
const HOJA_CONFIG       = "Config";
const HOJA_PERSONAS     = "Personas";
const HOJA_SERVICIOS    = "Servicios";
const HOJA_TARIFAS      = "Tarifas";
const HOJA_LIQUIDACIONES = "Liquidaciones";
const HOJA_USUARIOS = "Usuarios";

function doGet(e) {
  try {
    const sheet = asegurarHoja(HOJA_PAGOS);
    const range = sheet.getDataRange();
    if (range.getNumRows() === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = range.getValues();
    const headers = data.shift();
    if (!headers || headers.every(h => !h)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const result = data.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || "create";

    switch (action) {

      // ── Crear pago ───────────────────────────────────────
      case "create": {
        const sheet = asegurarHoja(HOJA_PAGOS);
        const HEADERS = ["ID","Fecha","CreadoEn","Inquilino","PersonaId","MontoRecibido","Cambio","PeriodoMes","PeriodoAnio","Alquiler","Agua","Luz","Gas","Internet","Otros","Total","Metodo","Estado","Notas"];
        const existing = sheet.getDataRange().getValues();
        if (existing.length > 0 && existing[0].join(",") !== HEADERS.join(",")) {
          sheet.clearContents();
          const oldHeaders = existing.shift();
          const filas = [HEADERS.slice()];
          existing.forEach(row => {
            const r = [];
            HEADERS.forEach(h => {
              const oldIdx = oldHeaders.indexOf(h);
              r.push(oldIdx >= 0 ? (row[oldIdx] !== undefined ? row[oldIdx] : "") : "");
            });
            filas.push(r);
          });
          sheet.getRange(1, 1, filas.length, HEADERS.length).setValues(filas);
        } else if (existing.length === 0) {
          sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        }
        sheet.appendRow([
          body.id, body.fecha, body.creadoEn,
          body.inquilino, body.personaId, body.montoRecibido, body.cambio,
          body.periodoMes, body.periodoAnio,
          body.alquiler, body.agua, body.luz, body.gas, body.internet, body.otros,
          body.total, body.metodo, body.estado || "Pagado", body.notas
        ]);
        return jsonResponse({ ok: true });
      }

      // ── Eliminar pago ────────────────────────────────────
      case "delete": {
        const sheet = asegurarHoja(HOJA_PAGOS);
        const data = sheet.getDataRange().getValues();
        for (let i = data.length - 1; i >= 0; i--) {
          if (String(data[i][0]) === String(body.id)) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
        return jsonResponse({ ok: true });
      }

      // ── Guardar configuración ────────────────────────────
      case "saveConfig": {
        guardarConfig(body.config);
        return jsonResponse({ ok: true });
      }

      // ── Cargar configuración ─────────────────────────────
      case "loadConfig": {
        const cfg = cargarConfig();
        return jsonResponse({ ok: true, config: cfg });
      }

      // ── Obtener personas ────────────────────────────────
      case "getPersonas": {
        const personas = leerTabla(HOJA_PERSONAS);
        return jsonResponse({ ok: true, data: personas });
      }

      // ── Guardar personas ────────────────────────────────
      case "savePersonas": {
        escribirPersonas(body.data);
        return jsonResponse({ ok: true });
      }

      // ── Guardar servicios ────────────────────────────────
      case "saveServicios": {
        escribirServicios(body.data);
        return jsonResponse({ ok: true });
      }

      // ── Cargar servicios ─────────────────────────────────
      case "loadServicios": {
        const data = leerTabla(HOJA_SERVICIOS);
        return jsonResponse({ ok: true, data: data });
      }

      // ── Guardar tarifas (JSON completo) ──────────────────
      case "saveTarifas": {
        guardarJson(HOJA_TARIFAS, body.data);
        return jsonResponse({ ok: true });
      }

      // ── Cargar tarifas ───────────────────────────────────
      case "loadTarifas": {
        const t = cargarJson(HOJA_TARIFAS);
        return jsonResponse({ ok: true, data: t });
      }

      // ── Guardar liquidaciones (JSON completo) ────────────
      case "saveLiquidaciones": {
        guardarJson(HOJA_LIQUIDACIONES, body.data);
        return jsonResponse({ ok: true });
      }

      // ── Cargar liquidaciones ─────────────────────────────
      case "loadLiquidaciones": {
        const l = cargarJson(HOJA_LIQUIDACIONES);
        return jsonResponse({ ok: true, data: l });
      }

      // ── Guardar usuarios ──────────────────────────────────
      case "saveUsuarios": {
        escribirUsuarios(body.data);
        return jsonResponse({ ok: true });
      }

      // ── Cargar usuarios ───────────────────────────────────
      case "loadUsuarios": {
        const u = leerTabla(HOJA_USUARIOS);
        return jsonResponse({ ok: true, data: u });
      }

      default:
        return jsonResponse({ ok: false, error: "Acción desconocida: " + action });
    }
  } catch (e) {
    return jsonResponse({ ok: false, error: e.toString() });
  }
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function asegurarHoja(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
  }
  return sheet;
}

// ── Config (una fila con JSON completo) ─────────────────────
function guardarConfig(config) {
  if (config === undefined || config === null) return;
  const sheet = asegurarHoja(HOJA_CONFIG);
  sheet.clearContents();
  sheet.getRange(1, 1).setValue(JSON.stringify(config));
}

function cargarConfig() {
  const sheet = asegurarHoja(HOJA_CONFIG);
  const val = sheet.getRange(1, 1).getValue();
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

// ── JSON genérico (una celda) ───────────────────────────────
function guardarJson(nombre, data) {
  if (data === undefined || data === null) return;
  if (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0) return;
  const sheet = asegurarHoja(nombre);
  sheet.clearContents();
  sheet.getRange(1, 1).setValue(JSON.stringify(data));
}

function cargarJson(nombre) {
  const sheet = asegurarHoja(nombre);
  const val = sheet.getRange(1, 1).getValue();
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

// ── Tabla genérica ──────────────────────────────────────────
function leerTabla(nombre) {
  const sheet = asegurarHoja(nombre);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function escribirPersonas(datos) {
  if (!datos || datos.length === 0) return;
  const sheet = asegurarHoja(HOJA_PERSONAS);
  sheet.clearContents();
  const headers = ["id", "nombre", "inmueble", "telefono", "email", "notas", "habitaciones", "personas", "activo"];
  const filas = [headers];
  datos.forEach(item => {
    filas.push(headers.map(h => item[h] !== undefined ? item[h] : ""));
  });
  sheet.getRange(1, 1, filas.length, headers.length).setValues(filas);
}

function escribirServicios(datos) {
  if (!datos || datos.length === 0) return;
  const sheet = asegurarHoja(HOJA_SERVICIOS);
  sheet.clearContents();
  const headers = ["id", "label", "icon", "unit", "tipo", "reparto", "requerido"];
  const filas = [headers];
  datos.forEach(item => {
    filas.push(headers.map(h => item[h] !== undefined ? item[h] : ""));
  });
  sheet.getRange(1, 1, filas.length, headers.length).setValues(filas);
}

function escribirUsuarios(datos) {
  if (!datos || datos.length === 0) return;
  const sheet = asegurarHoja(HOJA_USUARIOS);
  sheet.clearContents();
  const headers = ["id", "nombre", "email", "password", "rol", "personaId"];
  const filas = [headers];
  datos.forEach(item => {
    filas.push(headers.map(h => item[h] !== undefined ? item[h] : ""));
  });
  sheet.getRange(1, 1, filas.length, headers.length).setValues(filas);
}
