// Lógica de reparto de servicios y estado de cuenta.
// Única fuente de verdad: todas las vistas, impresiones y PDF usan estas funciones.
import { periodoKey, periodoDeKey, round1 } from "./format.js";

export const SEReparto = { UNIDAD: "unidad", HABITACIONES: "habitaciones", PERSONAS: "personas" };

export const getLiq = (liquidaciones, mes, anio) => liquidaciones[periodoKey(mes, anio)] || null;

// Formato antiguo: la liquidación era directamente el mapa de servicios.
export const serviciosDeLiq = liqPeriodo => (liqPeriodo ? liqPeriodo.servicios || liqPeriodo : {});

export const repartoDe = (servicio, liqPeriodo) => serviciosDeLiq(liqPeriodo)[servicio.id]?.reparto || servicio.reparto;

// Habitaciones/personas de una persona: primero el valor congelado en la liquidación, luego el actual.
export const factorPersona = (liqPeriodo, persona, reparto) => {
  if (reparto === SEReparto.UNIDAD) return 1;
  const f = liqPeriodo?.factores?.[String(persona.id)];
  return reparto === SEReparto.HABITACIONES
    ? (Number(f?.habitaciones) || Number(persona.habitaciones) || 1)
    : (Number(f?.personas) || Number(persona.personas) || 1);
};

export const calcTotalFactor = (personas, reparto, factores) => {
  if (reparto === SEReparto.UNIDAD) return personas.length;
  return personas.reduce((s, p) => s + factorPersona({ factores }, p, reparto), 0);
};

// Personas que participaban en la liquidación: las congeladas en `factores` al guardarla.
export const getPersonasSnapshot = (liqPeriodo, personas) => {
  const factores = liqPeriodo?.factores || {};
  const ids = Object.keys(factores);
  if (ids.length === 0) return personas;
  const base = personas.filter(p => ids.includes(String(p.id)));
  ids.forEach(id => {
    if (!base.find(p => String(p.id) === id)) base.push({ id, habitaciones: factores[id].habitaciones, personas: factores[id].personas });
  });
  return base;
};

export const asignadosDe = (liqPeriodo, personaId) => liqPeriodo?.inquilinos?.[String(personaId)]?.servicios || [];

// Una persona sin servicios marcados participa de todos (compatibilidad con liquidaciones sin asignación).
export const personaTieneServicio = (liqPeriodo, personaId, servicioId) => {
  const asignados = asignadosDe(liqPeriodo, personaId);
  return asignados.length === 0 || asignados.includes(servicioId);
};

// Personas entre las que se reparte un servicio. Usa la misma regla que `personaTieneServicio`,
// así la suma de las partes coincide con el total de la factura.
export const personasDelServicio = (liqPeriodo, servicioId, personasBase) =>
  getPersonasSnapshot(liqPeriodo, personasBase).filter(p => personaTieneServicio(liqPeriodo, p.id, servicioId));

export const serviciosDePersona = (servicios, liqPeriodo, persona) =>
  persona && liqPeriodo ? servicios.filter(s => personaTieneServicio(liqPeriodo, persona.id, s.id)) : servicios;

// Detalle del cálculo de un servicio para una persona: { monto, factor, totalFactor, precio }.
export const detalleServicio = (servicio, liqPeriodo, persona, personasBase) => {
  const vacio = { monto: 0, factor: 0, totalFactor: 0, precio: 0 };
  const liq = serviciosDeLiq(liqPeriodo)[servicio.id];
  if (!liq || !persona) return vacio;
  const totalFactura = Number(liq.totalFactura) || 0;
  if (totalFactura <= 0) return vacio;
  if (!personaTieneServicio(liqPeriodo, persona.id, servicio.id)) return vacio;
  const reparto = liq.reparto || servicio.reparto;
  if (reparto === SEReparto.UNIDAD) return { monto: totalFactura, factor: 1, totalFactor: 1, precio: totalFactura };
  const factor = factorPersona(liqPeriodo, persona, reparto);
  const totalFactor = calcTotalFactor(personasDelServicio(liqPeriodo, servicio.id, personasBase), reparto, liqPeriodo.factores);
  if (factor <= 0 || totalFactor <= 0) return vacio;
  return {
    monto: round1(totalFactura * factor / totalFactor),
    factor,
    totalFactor,
    precio: round1(totalFactura / totalFactor),
  };
};

export const montoServicio = (servicio, liqPeriodo, persona, personasBase) =>
  detalleServicio(servicio, liqPeriodo, persona, personasBase).monto;

// Suma de factores de un servicio en una liquidación (null si no aplica reparto).
export const totalFactorServicio = (servicio, liqPeriodo, personasBase) => {
  const liq = serviciosDeLiq(liqPeriodo)[servicio.id];
  if (!liq || Number(liq.totalFactura) <= 0) return null;
  const reparto = liq.reparto || servicio.reparto;
  if (reparto === SEReparto.UNIDAD) return null;
  const personas = personasDelServicio(liqPeriodo, servicio.id, personasBase);
  return personas.length ? calcTotalFactor(personas, reparto, liqPeriodo.factores) : null;
};

export const totalesPersona = (liqPeriodo, persona, servicios, personasBase) => {
  const detalles = {};
  let total = 0;
  servicios.forEach(s => {
    detalles[s.id] = montoServicio(s, liqPeriodo, persona, personasBase);
    total += detalles[s.id];
  });
  return { detalles, total: round1(total) };
};

export const totalesPorPersona = (liqPeriodo, servicios, personas) => {
  const result = {};
  personas.forEach(p => {
    result[String(p.id)] = { nombre: p.nombre, inmueble: p.inmueble, ...totalesPersona(liqPeriodo, p, servicios, personas) };
  });
  return result;
};

const mismoNombre = (a, b) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export const pagoEsDePersona = (pago, persona) =>
  String(pago.personaId) === String(persona.id) || (!pago.personaId && mismoNombre(pago.inquilino, persona.nombre));

export const pagosDePersonaPeriodo = (pagos, persona, mes, anio) =>
  pagos.filter(pg => pg.estado === "Pagado" && pg.periodoMes === mes && String(pg.periodoAnio) === String(anio) && pagoEsDePersona(pg, persona));

export const montoPagado = (pagos, persona, mes, anio) =>
  round1(pagosDePersonaPeriodo(pagos, persona, mes, anio).reduce((s, pg) => s + (Number(pg.total) || 0), 0));

// Estado de cuenta de una persona en todos los períodos liquidados, ordenado cronológicamente.
export const estadoCuenta = (persona, liquidaciones, servicios, personasBase, pagos) => {
  const periodos = [];
  Object.keys(liquidaciones).sort().forEach(key => {
    const { mes, anio, label } = periodoDeKey(key);
    const { detalles, total } = totalesPersona(liquidaciones[key], persona, servicios, personasBase);
    if (total <= 0) return;
    const pagado = montoPagado(pagos, persona, mes, anio);
    periodos.push({ key, label, mes, anio, debe: total, detalles, pagado, saldo: round1(total - pagado) });
  });
  const totalDebe = round1(periodos.reduce((s, p) => s + p.debe, 0));
  const totalPagado = round1(periodos.reduce((s, p) => s + p.pagado, 0));
  return { periodos, totalDebe, totalPagado, saldoTotal: round1(totalDebe - totalPagado) };
};

// Vincula pagos antiguos (sin personaId) a la persona con el mismo nombre.
export const vincularPagos = (pagos, personas) => pagos.map(pg => {
  if (pg.personaId || !pg.inquilino) return pg;
  const match = personas.find(p => mismoNombre(p.nombre, pg.inquilino));
  return match ? { ...pg, personaId: String(match.id) } : pg;
});
