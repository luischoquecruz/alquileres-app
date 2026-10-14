import { useMemo } from "react";
import { SEReparto, serviciosDePersona, detalleServicio } from "../lib/calculos.js";
import { round1 } from "../lib/format.js";

export const labelReparto = r =>
  r === SEReparto.HABITACIONES ? "🏠 por habitaciones" : r === SEReparto.PERSONAS ? "👥 por personas" : "🏷️ 1 pago";

// Montos de una persona en una liquidación: { servicios, detalles: {id: detalle}, montos: {id: n}, total }
export function useMontos(servicios, liqPeriodo, persona, activas) {
  return useMemo(() => {
    const lista = serviciosDePersona(servicios, liqPeriodo, persona);
    const detalles = {};
    const montos = {};
    lista.forEach(s => {
      detalles[s.id] = detalleServicio(s, liqPeriodo, persona, activas);
      montos[s.id] = detalles[s.id].monto;
    });
    return { servicios: lista, detalles, montos, total: round1(Object.values(montos).reduce((a, b) => a + b, 0)) };
  }, [servicios, liqPeriodo, persona, activas]);
}
