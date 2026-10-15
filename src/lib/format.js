export const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const mesActual = () => meses[new Date().getMonth()];
export const anioActual = () => new Date().getFullYear();

export const fmtDate = s => {
  if (!s) return "";
  const d = String(s).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return String(s);
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
export const fmtMoney = n => {
  if (n === "" || n === undefined || n === null) return "";
  return Number(n).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};
// Precio unitario (por habitación/persona) con 2 decimales para que precio × cantidad cuadre con el monto
export const fmtPrecio = n => {
  if (n === "" || n === undefined || n === null) return "";
  return Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const fmtNum = n => {
  if (n === "" || n === undefined || n === null) return "";
  return Number(n).toLocaleString("es-ES");
};

export const round1 = n => Math.round(n * 10) / 10;

// "2026-03" <-> ("Marzo", 2026)
export const periodoKey = (mes, anio) => `${anio}-${String(meses.indexOf(mes) + 1).padStart(2, "0")}`;
export const periodoDeKey = k => {
  const [y, m] = k.split("-");
  return { anio: y, mes: meses[Number(m) - 1], label: `${meses[Number(m) - 1]} ${y}` };
};

export const emptyForm = () => ({
  fecha: today(), personaId: "", inquilino: "",
  periodoMes: mesActual(), periodoAnio: anioActual(),
  metodo: "", notas: "", montoRecibido: "",
});

// Escapa texto para interpolarlo en los HTML de impresión
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = s => (s === undefined || s === null ? "" : String(s).replace(/[&<>"']/g, c => ESC[c]));
