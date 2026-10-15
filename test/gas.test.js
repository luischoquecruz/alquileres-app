// Ejecuta Code.gs contra un simulador en memoria de los servicios de Apps Script.
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";

const codigo = readFileSync(new URL("../Code.gs", import.meta.url), "utf8");

function crearEntorno() {
  const hojas = {};
  const cache = new Map();

  const crearHoja = () => {
    let celdas = []; // filas de valores
    const ancho = () => Math.max(0, ...celdas.map(r => r.length));
    const sheet = {
      getLastRow: () => celdas.length,
      getLastColumn: () => ancho(),
      getDataRange: () => sheet.getRange(1, 1, Math.max(celdas.length, 1), Math.max(ancho(), 1)),
      clearContents: () => { celdas = []; },
      appendRow: fila => { celdas.push(fila.slice()); },
      deleteRow: r => { celdas.splice(r - 1, 1); },
      getRange: (row, col, nRows = 1, nCols = 1) => ({
        getValues: () => Array.from({ length: nRows }, (_, i) =>
          Array.from({ length: nCols }, (_, j) => celdas[row - 1 + i]?.[col - 1 + j] ?? "")),
        getValue: () => celdas[row - 1]?.[col - 1] ?? "",
        setValue: v => sheet.getRange(row, col).setValues([[v]]),
        setValues: vals => vals.forEach((fila, i) => fila.forEach((v, j) => {
          while (celdas.length < row + i) celdas.push([]);
          // Sheets guarda "'texto" como texto sin el apóstrofo
          celdas[row - 1 + i][col - 1 + j] = typeof v === "string" && v.startsWith("'") ? v.slice(1) : v;
        })),
      }),
      _celdas: () => celdas,
    };
    return sheet;
  };

  const globals = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: n => hojas[n] || null,
        insertSheet: n => (hojas[n] = crearHoja()),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: k => (cache.has(k) ? cache.get(k) : null),
        put: (k, v) => cache.set(k, v),
        remove: k => cache.delete(k),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: txt => ({ setMimeType: () => JSON.parse(txt) }),
    },
    Session: { getScriptTimeZone: () => "America/La_Paz" },
    Utilities: {
      getUuid: () => randomUUID(),
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (_alg, txt) => [...createHash("sha256").update(txt, "utf8").digest()].map(b => (b > 127 ? b - 256 : b)),
      formatDate: d => d.toISOString().slice(0, 10),
    },
  };

  const fn = new Function(...Object.keys(globals), `${codigo}; return { doPost, hojas: null };`);
  const { doPost } = fn(...Object.values(globals));
  const llamar = body => doPost({ postData: { contents: JSON.stringify(body) } });
  return { llamar, hojas, crearHoja };
}

describe("Code.gs", () => {
  let env;
  beforeEach(() => { env = crearEntorno(); });

  const loginAdmin = () => env.llamar({ action: "login", usuario: "admin", password: "admin123" });

  it("crea el admin inicial con hash y pide cambiar la contraseña", () => {
    const r = loginAdmin();
    expect(r.ok).toBe(true);
    expect(r.debeCambiarPassword).toBe(true);
    expect(r.sesion.rol).toBe("admin");
    const pass = env.hojas.Usuarios._celdas()[1][3];
    expect(pass).toMatch(/^sha256\$/);
  });

  it("rechaza escrituras sin token o con token de inquilino", () => {
    expect(env.llamar({ action: "deletePago", id: 1 }).code).toBe("SESION");
    const { token } = loginAdmin();
    env.llamar({ action: "upsertUsuario", token, usuario: { id: 2, nombre: "Ana", email: "ana", password: "secreta1", rol: "inquilino", personaId: 1 } });
    const inq = env.llamar({ action: "login", usuario: "ana", password: "secreta1" });
    expect(inq.ok).toBe(true);
    expect(env.llamar({ action: "deletePago", token: inq.token, id: 1 }).code).toBe("PERMISO");
  });

  it("nunca devuelve contraseñas y limita datos públicos", () => {
    const { token } = loginAdmin();
    env.llamar({ action: "upsertPersona", token, persona: { id: 1, nombre: "Ana", telefono: "777", email: "a@x", habitaciones: 2, personas: 1, activo: true } });
    const admin = env.llamar({ action: "bootstrap", token });
    expect(admin.data.usuarios[0].password).toBeUndefined();
    expect(admin.data.personas[0].telefono).toBe("777");
    const pub = env.llamar({ action: "bootstrap" });
    expect(pub.data.usuarios).toBeUndefined();
    expect(pub.data.personas[0]).toEqual({ id: 1, nombre: "Ana", inmueble: "", habitaciones: 2, personas: 1, activo: true });
  });

  it("migra contraseñas en texto plano al primer login", () => {
    const sheet = env.crearHoja();
    env.hojas.Usuarios = sheet;
    sheet.appendRow(["id", "nombre", "email", "password", "rol", "personaId"]);
    sheet.appendRow([1, "Administrador", "admin", "vieja123", "admin", ""]);
    expect(env.llamar({ action: "login", usuario: "admin", password: "mal" }).ok).toBe(false);
    const r = env.llamar({ action: "login", usuario: "ADMIN", password: "vieja123" });
    expect(r.ok).toBe(true);
    expect(sheet._celdas()[1][3]).toMatch(/^sha256\$/);
    expect(env.llamar({ action: "login", usuario: "admin", password: "vieja123" }).ok).toBe(true);
  });

  it("acepta hashes antiguos de 500 iteraciones y los migra al formato actual", () => {
    let h = "sal:clave123";
    for (let i = 0; i < 500; i++) h = createHash("sha256").update(h + "clave123", "utf8").digest("hex");
    const sheet = env.crearHoja();
    env.hojas.Usuarios = sheet;
    sheet.appendRow(["id", "nombre", "email", "password", "rol", "personaId"]);
    sheet.appendRow([1, "Administrador", "admin", `sha256$500$sal$${h}`, "admin", ""]);
    expect(env.llamar({ action: "login", usuario: "admin", password: "clave123" }).ok).toBe(true);
    expect(sheet._celdas()[1][3]).toMatch(/^sha256\$50\$/);
    expect(env.llamar({ action: "login", usuario: "admin", password: "clave123" }).ok).toBe(true);
    expect(env.llamar({ action: "login", usuario: "admin", password: "otra" }).ok).toBe(false);
  });

  it("bloquea tras 5 intentos fallidos", () => {
    loginAdmin();
    for (let i = 0; i < 5; i++) env.llamar({ action: "login", usuario: "admin", password: "x" });
    expect(loginAdmin().code).toBe("BLOQUEADO");
  });

  it("pagos: guarda montos dinámicos, rechaza duplicados y borra por id", () => {
    const { token } = loginAdmin();
    const pago = { id: 10, personaId: "1", inquilino: "Ana", periodoMes: "Enero", periodoAnio: 2026, total: 150, metodo: "Efectivo", fecha: "2026-01-05", montos: { agua: 50, cable_1: 100 } };
    expect(env.llamar({ action: "createPago", token, pago }).ok).toBe(true);
    expect(env.llamar({ action: "createPago", token, pago: { ...pago, id: 11 } }).code).toBe("DUPLICADO");
    const pagos = env.llamar({ action: "bootstrap", token }).data.pagos;
    expect(pagos[0].id).toBe(10);
    expect(pagos[0].cable_1).toBe(100);
    expect(pagos[0].agua).toBe(50);
    const pub = env.llamar({ action: "bootstrap" }).data.pagos[0];
    expect(pub.metodo).toBeUndefined();
    expect(pub.total).toBe(150);
    env.llamar({ action: "deletePago", token, id: 10 });
    expect(env.llamar({ action: "bootstrap", token }).data.pagos).toHaveLength(0);
  });

  it("migra liquidaciones del formato antiguo (JSON en A1) a una fila por período", () => {
    const sheet = env.crearHoja();
    env.hojas.Liquidaciones = sheet;
    sheet.appendRow([JSON.stringify({ "2025-12": { servicios: { luz: { totalFactura: 10 } } } })]);
    expect(env.llamar({ action: "bootstrap" }).data.liquidaciones["2025-12"].servicios.luz.totalFactura).toBe(10);
    const { token } = loginAdmin();
    env.llamar({ action: "setLiquidacion", token, clave: "2026-01", datos: { servicios: {} } });
    const liq = env.llamar({ action: "bootstrap" }).data.liquidaciones;
    expect(Object.keys(liq).sort()).toEqual(["2025-12", "2026-01"]);
    expect(sheet._celdas()[0]).toEqual(["Clave", "Datos"]);
    expect(env.llamar({ action: "setLiquidacion", token, clave: "mal", datos: {} }).code).toBe("VALIDACION");
  });

  it("no permite quedarse sin administradores", () => {
    const { token, sesion } = loginAdmin();
    expect(env.llamar({ action: "deleteUsuario", token, id: sesion.id }).code).toBe("VALIDACION");
    expect(env.llamar({ action: "upsertUsuario", token, usuario: { id: 1, nombre: "A", email: "admin", rol: "inquilino" } }).code).toBe("VALIDACION");
  });

  it("cambia la contraseña verificando la actual", () => {
    const { token } = loginAdmin();
    expect(env.llamar({ action: "changePassword", token, actual: "mal", nueva: "nueva123" }).ok).toBe(false);
    expect(env.llamar({ action: "changePassword", token, actual: "admin123", nueva: "nueva123" }).ok).toBe(true);
    expect(env.llamar({ action: "login", usuario: "admin", password: "nueva123" }).debeCambiarPassword).toBe(false);
  });

  it("migra la hoja Pagos antigua sin perder datos (agrega columna Detalle)", () => {
    const sheet = env.crearHoja();
    env.hojas.Pagos = sheet;
    const viejos = ["ID", "Fecha", "CreadoEn", "Inquilino", "PersonaId", "MontoRecibido", "Cambio", "PeriodoMes", "PeriodoAnio", "Alquiler", "Agua", "Luz", "Gas", "Internet", "Otros", "Total", "Metodo", "Estado", "Notas"];
    sheet.appendRow(viejos);
    sheet.appendRow([5, "2025-11-02", "", "Beto", "2", 100, 0, "Noviembre", 2025, 0, 40, 60, 0, 0, 0, 100, "Efectivo", "Pagado", ""]);
    const { token } = loginAdmin();
    env.llamar({ action: "createPago", token, pago: { id: 6, personaId: "1", periodoMes: "Enero", periodoAnio: 2026, total: 10, montos: { luz: 10 } } });
    const pagos = env.llamar({ action: "bootstrap", token }).data.pagos;
    expect(pagos.find(p => p.id === 5)).toMatchObject({ agua: 40, luz: 60, inquilino: "Beto" });
    expect(sheet._celdas()[0].at(-1)).toBe("Detalle");
  });
});
