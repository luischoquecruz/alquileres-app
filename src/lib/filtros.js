import { today } from "./format.js";

export const filtrosIniciales = () => ({ desde: today().slice(0, 7) + "-01", hasta: today(), inquilino: "", metodo: "", estado: "" });

export const aplicarFiltros = (pagos, f) => pagos.filter(s =>
  (!f.desde || String(s.fecha) >= f.desde) && (!f.hasta || String(s.fecha) <= f.hasta)
  && (!f.inquilino || String(s.inquilino || "").toLowerCase().includes(f.inquilino.toLowerCase()))
  && (!f.metodo || s.metodo === f.metodo)
  && (!f.estado || s.estado === f.estado));
