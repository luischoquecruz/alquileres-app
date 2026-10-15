// Acceso a localStorage/sessionStorage que nunca lanza (modo privado, cuota llena, JSON corrupto).
const leer = (store, key, fallback) => {
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const escribir = (store, key, value) => {
  try {
    if (value === undefined) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
  } catch { /* sin almacenamiento disponible */ }
};

export const local = {
  get: (key, fallback = null) => leer(window.localStorage, key, fallback),
  set: (key, value) => escribir(window.localStorage, key, value),
  remove: key => escribir(window.localStorage, key, undefined),
};

export const session = {
  get: (key, fallback = null) => leer(window.sessionStorage, key, fallback),
  set: (key, value) => escribir(window.sessionStorage, key, value),
  remove: key => escribir(window.sessionStorage, key, undefined),
};

export const KEYS = {
  sesion: "alquileres_sesion",
  gasUrl: "alquileres_gas_url",
  darkMode: "alquileres_dark",
  cache: "alquileres_cache_publico",
  dbLocal: "alquileres_db_local",
};
