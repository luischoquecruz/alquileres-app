import { session, KEYS } from "../lib/storage.js";
import { crearBackendLocal } from "./local.js";

export class ApiError extends Error {
  constructor(mensaje, code) {
    super(mensaje);
    this.code = code || "ERROR";
  }
}

export const leerSesionGuardada = () => session.get(KEYS.sesion);
export const guardarSesion = s => session.set(KEYS.sesion, s);
export const borrarSesion = () => session.remove(KEYS.sesion);

const enviarRemoto = async (url, body) => {
  let res;
  try {
    // text/plain evita el preflight CORS que Apps Script no responde
    res = await fetch(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain" } });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor", "RED");
  }
  try {
    return await res.json();
  } catch {
    throw new ApiError("Respuesta inválida del servidor. ¿La URL de Apps Script es correcta y está desplegada?", "RED");
  }
};

// Cliente único para el backend. Con `url` vacía usa el backend local (localStorage),
// que implementa las mismas acciones.
export function crearApi(url, { onSesionExpirada } = {}) {
  const local = url ? null : crearBackendLocal();

  const enviar = async (action, payload = {}) => {
    const token = leerSesionGuardada()?.token;
    const body = { ...payload, action, token };
    const j = local ? await local.handle(body) : await enviarRemoto(url, body);
    if (!j.ok) {
      if (j.code === "SESION") { borrarSesion(); onSesionExpirada?.(); }
      throw new ApiError(j.error || "Error desconocido", j.code);
    }
    return j;
  };

  return {
    esLocal: !url,
    bootstrap: () => enviar("bootstrap"),
    login: async (usuario, password) => {
      const j = await enviar("login", { usuario, password });
      guardarSesion({ token: j.token, sesion: j.sesion });
      return j;
    },
    logout: async () => {
      try { await enviar("logout"); } catch { /* la sesión se descarta igual */ }
      borrarSesion();
    },
    call: enviar,
  };
}
