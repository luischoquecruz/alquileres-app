import { SEReparto } from "./lib/calculos.js";

export const GAS_URL_DEFAULT = import.meta.env.VITE_GAS_URL ??
  "https://script.google.com/macros/s/AKfycbwA3z85PNMjT-x8v3-SaTJ6soSkJxAFTqwIWZAEYi48Q8XmABlpdJf5XlVF9LH8EeFrFg/exec";

export const SERVICIOS_POR_DEFECTO = [
  { id: "alquiler", label: "Alquiler", icon: "🏠", unit: "", tipo: "fijo", requerido: true, reparto: SEReparto.UNIDAD },
  { id: "agua", label: "Agua Potable", icon: "💧", unit: "m³", tipo: "consumo", reparto: SEReparto.PERSONAS },
  { id: "luz", label: "Electricidad", icon: "⚡", unit: "kWh", tipo: "consumo", reparto: SEReparto.HABITACIONES },
  { id: "gas", label: "Gas", icon: "🔥", unit: "kg", tipo: "consumo", reparto: SEReparto.HABITACIONES },
  { id: "internet", label: "Internet", icon: "🌐", unit: "", tipo: "fijo", reparto: SEReparto.UNIDAD },
  { id: "otros", label: "Otros", icon: "📋", unit: "", tipo: "fijo", reparto: SEReparto.UNIDAD },
];

// Configuración compartida (se guarda en el backend). Preferencias del navegador
// como el modo oscuro o la URL del backend se guardan aparte, en localStorage.
export const CONFIG_DEFAULT = {
  orgNombre: "EGI",
  orgSubtitulo: "Sistema de Cobro de Alquileres-Servicios",
  appTitulo: "Cobro de Alquileres y Servicios Básicos",
  appSubtitulo: "Complete el formulario para registrar su pago",

  colorPrimario: "#065f46",
  colorAcento: "#059669",
  colorFondo: "#f0fdf4",
  colorFondoAlt: "#d1fae5",

  metodosPago: ["Efectivo", "Transferencia", "Depósito", "Cheque", "Otro"],
  metodosIconos: { "Efectivo": "💵", "Transferencia": "🏦", "Depósito": "🏧", "Cheque": "📝", "Otro": "🔄" },

  textos: {
    botonEnviar: "💾 Registrar pago",
    mensajeExito: "✅ ¡Pago registrado correctamente!",
  },

  mostrarCampoNotas: true,
  requiereNotas: false,
  exitoDelay: 5000,

  darkColorPrimario: "#064e3b",
  darkColorAcento: "#10b981",
  darkColorFondo: "#022c22",
  darkColorFondoAlt: "#064e3b",
};

// Campos que versiones anteriores guardaban en la config compartida y ya no corresponden ahí.
const CAMPOS_OBSOLETOS = ["appsScriptUrl", "darkMode", "storageKey", "storageKeyPersonas", "storageKeyTarifas",
  "storageKeyLiquidacion", "storageKeyServicios", "storageKeyUsuarios", "periodos"];

export const limpiarConfig = cfg => {
  const r = { ...CONFIG_DEFAULT, ...(cfg || {}), textos: { ...CONFIG_DEFAULT.textos, ...(cfg?.textos || {}) } };
  CAMPOS_OBSOLETOS.forEach(k => delete r[k]);
  return r;
};
