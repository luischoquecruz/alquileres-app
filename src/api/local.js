// Backend en el navegador para el modo "solo local" (sin URL de Apps Script).
// Implementa las mismas acciones y reglas que Code.gs sobre un objeto en localStorage.
import { local, KEYS } from "../lib/storage.js";
import { SERVICIOS_POR_DEFECTO } from "../config.js";

const PASSWORD_DEFECTO = "admin123";

const sha256 = async txt => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
};
const hashPassword = async (pw, salt = crypto.randomUUID().replace(/-/g, "")) => `sha256$1$${salt}$${await sha256(salt + ":" + pw)}`;
const verificarPassword = async (pw, guardada) => {
  if (!guardada) return false;
  if (!String(guardada).startsWith("sha256$")) return pw === guardada;
  return (await hashPassword(pw, guardada.split("$")[2])) === guardada;
};

// Importa los datos que guardaban versiones anteriores de la app en claves sueltas.
const migrarClavesAntiguas = () => ({
  config: local.get("alquileres_config"),
  personas: local.get("alquileres_personas_local", []),
  servicios: local.get("alquileres_servicios_local", null) || SERVICIOS_POR_DEFECTO,
  tarifas: local.get("alquileres_tarifas_local", {}),
  liquidaciones: local.get("alquileres_liquidacion_local", {}),
  pagos: local.get("alquileres_pagos_local", []),
  usuarios: local.get("alquileres_usuarios_local", []),
});

const error = (msg, code) => ({ ok: false, error: msg, code });

export function crearBackendLocal() {
  const leer = () => local.get(KEYS.dbLocal) || migrarClavesAntiguas();
  const guardar = db => local.set(KEYS.dbLocal, db);
  const sesiones = new Map(JSON.parse(sessionStorage.getItem("alquileres_local_tokens") || "[]"));
  const persistirSesiones = () => sessionStorage.setItem("alquileres_local_tokens", JSON.stringify([...sesiones]));

  const upsert = (lista, obj) => {
    const i = lista.findIndex(x => String(x.id) === String(obj.id));
    if (i >= 0) lista[i] = obj; else lista.push(obj);
  };
  const quitar = (lista, id) => lista.filter(x => String(x.id) !== String(id));

  const handle = async body => {
    const db = leer();
    const ses = body.token ? sesiones.get(body.token) : null;
    const { action } = body;

    if (action === "bootstrap") {
      const admin = ses?.rol === "admin";
      return {
        ok: true,
        sesion: ses || null,
        data: {
          config: db.config, servicios: db.servicios, tarifas: db.tarifas, liquidaciones: db.liquidaciones,
          personas: db.personas, pagos: db.pagos,
          ...(admin ? { usuarios: db.usuarios.map(({ password: _p, ...u }) => u) } : {}),
        },
      };
    }

    if (action === "login") {
      if (db.usuarios.length === 0) {
        db.usuarios.push({ id: 1, nombre: "Administrador", email: "admin", password: await hashPassword(PASSWORD_DEFECTO), rol: "admin", personaId: null });
      }
      const usuario = String(body.usuario || "").trim().toLowerCase();
      const u = db.usuarios.find(x => String(x.email || "").toLowerCase() === usuario || String(x.nombre || "").toLowerCase() === usuario);
      if (!u || !(await verificarPassword(body.password, u.password))) return error("Credenciales incorrectas", "AUTH");
      if (!String(u.password).startsWith("sha256$")) u.password = await hashPassword(body.password);
      guardar(db);
      const sesion = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol === "admin" ? "admin" : "inquilino", personaId: u.personaId || null };
      const token = crypto.randomUUID();
      sesiones.set(token, sesion);
      persistirSesiones();
      return { ok: true, token, sesion, debeCambiarPassword: body.password === PASSWORD_DEFECTO };
    }

    if (action === "logout") { sesiones.delete(body.token); persistirSesiones(); return { ok: true }; }

    if (!ses) return error("Sesión expirada. Inicie sesión nuevamente.", "SESION");

    if (action === "changePassword") {
      const u = db.usuarios.find(x => String(x.id) === String(ses.id));
      if (!u || !(await verificarPassword(body.actual, u.password))) return error("La contraseña actual no es correcta", "AUTH");
      if (String(body.nueva || "").length < 6) return error("La nueva contraseña debe tener al menos 6 caracteres", "VALIDACION");
      u.password = await hashPassword(body.nueva);
      guardar(db);
      return { ok: true };
    }

    if (ses.rol !== "admin") return error("Permiso denegado", "PERMISO");

    switch (action) {
      case "saveConfig": db.config = body.config; break;
      case "createPago": {
        const p = body.pago;
        const dup = db.pagos.some(x => String(x.personaId) === String(p.personaId) && x.periodoMes === p.periodoMes &&
          String(x.periodoAnio) === String(p.periodoAnio) && x.estado === "Pagado");
        if (dup) return error("Ya existe un pago registrado para ese inquilino y período", "DUPLICADO");
        const nuevo = { ...p.montos, ...p, creadoEn: new Date().toISOString(), estado: p.estado || "Pagado" };
        db.pagos.push(nuevo);
        guardar(db);
        return { ok: true, id: nuevo.id, creadoEn: nuevo.creadoEn };
      }
      case "deletePago": db.pagos = quitar(db.pagos, body.id); break;
      case "upsertPersona": upsert(db.personas, body.persona); break;
      case "deletePersona": db.personas = quitar(db.personas, body.id); break;
      case "upsertServicio": upsert(db.servicios, body.servicio); break;
      case "deleteServicio": db.servicios = quitar(db.servicios, body.id); break;
      case "setTarifa": if (body.datos == null) delete db.tarifas[body.clave]; else db.tarifas[body.clave] = body.datos; break;
      case "setLiquidacion": if (body.datos == null) delete db.liquidaciones[body.clave]; else db.liquidaciones[body.clave] = body.datos; break;
      case "upsertUsuario": {
        const u = body.usuario;
        const existente = db.usuarios.find(x => String(x.id) === String(u.id));
        if (db.usuarios.some(x => String(x.id) !== String(u.id) && String(x.email).toLowerCase() === String(u.email).trim().toLowerCase())) {
          return error("Ya existe un usuario con ese email/usuario", "VALIDACION");
        }
        if (!u.password && !existente) return error("La contraseña es obligatoria", "VALIDACION");
        if (u.password && String(u.password).length < 6) return error("La contraseña debe tener al menos 6 caracteres", "VALIDACION");
        const password = u.password ? await hashPassword(u.password) : existente.password;
        upsert(db.usuarios, { ...u, password });
        break;
      }
      case "deleteUsuario": {
        if (String(body.id) === String(ses.id)) return error("No puede eliminar su propio usuario", "VALIDACION");
        const u = db.usuarios.find(x => String(x.id) === String(body.id));
        if (u?.rol === "admin" && db.usuarios.filter(x => x.rol === "admin").length <= 1) return error("Debe quedar al menos un administrador", "VALIDACION");
        db.usuarios = quitar(db.usuarios, body.id);
        break;
      }
      default: return error("Acción desconocida: " + action, "ERROR");
    }
    guardar(db);
    return { ok: true };
  };

  return { handle };
}
