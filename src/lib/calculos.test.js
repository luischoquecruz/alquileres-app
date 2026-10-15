import { describe, it, expect } from "vitest";
import {
  SEReparto, montoServicio, detalleServicio, totalesPorPersona, estadoCuenta,
  serviciosDePersona, vincularPagos, totalFactorServicio,
} from "./calculos.js";
import { esc, periodoKey } from "./format.js";

const luz = { id: "luz", label: "Luz", reparto: SEReparto.HABITACIONES };
const agua = { id: "agua", label: "Agua", reparto: SEReparto.PERSONAS };
const alquiler = { id: "alquiler", label: "Alquiler", reparto: SEReparto.UNIDAD };
const servicios = [alquiler, agua, luz];

const ana = { id: 1, nombre: "Ana", habitaciones: 2, personas: 1 };
const beto = { id: 2, nombre: "Beto", habitaciones: 1, personas: 3 };
const caro = { id: 3, nombre: "Caro", habitaciones: 1, personas: 1 };
const personas = [ana, beto, caro];

const liqBase = (extra = {}) => ({
  servicios: {
    alquiler: { totalFactura: 500, reparto: SEReparto.UNIDAD },
    agua: { totalFactura: 100, reparto: SEReparto.PERSONAS },
    luz: { totalFactura: 200, reparto: SEReparto.HABITACIONES },
  },
  inquilinos: {},
  factores: {
    1: { habitaciones: 2, personas: 1 },
    2: { habitaciones: 1, personas: 3 },
    3: { habitaciones: 1, personas: 1 },
  },
  ...extra,
});

describe("reparto", () => {
  it("sin asignaciones reparte entre todos (no devuelve 0)", () => {
    const liq = liqBase();
    expect(montoServicio(luz, liq, ana, personas)).toBe(100); // 200 * 2/4
    expect(montoServicio(luz, liq, beto, personas)).toBe(50);
    expect(montoServicio(agua, liq, beto, personas)).toBe(60); // 100 * 3/5
  });

  it("la suma de las partes es igual a la factura", () => {
    const liq = liqBase();
    const tot = totalesPorPersona(liq, [luz], personas);
    expect(Object.values(tot).reduce((s, t) => s + t.detalles.luz, 0)).toBe(200);
  });

  it("con asignación explícita solo pagan los marcados", () => {
    const liq = liqBase({ inquilinos: { 1: { servicios: ["luz"] }, 2: { servicios: ["luz"] }, 3: { servicios: ["agua"] } } });
    expect(montoServicio(luz, liq, caro, personas)).toBe(0);
    expect(montoServicio(luz, liq, ana, personas)).toBe(133.3); // 200 * 2/3
    expect(montoServicio(agua, liq, caro, personas)).toBe(100);
  });

  it("asignación mixta: quien no tiene marcas participa del divisor", () => {
    const liq = liqBase({ inquilinos: { 1: { servicios: ["luz"] } } });
    const tot = totalesPorPersona(liq, [luz], personas);
    expect(Object.values(tot).reduce((s, t) => s + t.detalles.luz, 0)).toBe(200);
  });

  it("servicio por unidad cobra el total a cada uno", () => {
    expect(montoServicio(alquiler, liqBase(), beto, personas)).toBe(500);
  });

  it("usa los factores congelados en la liquidación", () => {
    const anaHoy = { ...ana, habitaciones: 10 };
    expect(montoServicio(luz, liqBase(), anaHoy, [anaHoy, beto, caro])).toBe(100);
  });

  it("formato antiguo (servicios en la raíz, sin factores)", () => {
    const liq = { luz: { totalFactura: 300 } };
    expect(montoServicio(luz, liq, ana, personas)).toBe(150);
  });

  it("detalle expone precio por factor", () => {
    const d = detalleServicio(luz, liqBase(), ana, personas);
    expect(d).toEqual({ monto: 100, factor: 2, totalFactor: 4, precio: 50 });
    expect(totalFactorServicio(luz, liqBase(), personas)).toBe(4);
    expect(totalFactorServicio(alquiler, liqBase(), personas)).toBeNull();
  });

  it("servicios visibles de una persona siguen la misma regla", () => {
    const liq = liqBase({ inquilinos: { 1: { servicios: ["luz"] }, 2: { servicios: [] } } });
    expect(serviciosDePersona(servicios, liq, ana).map(s => s.id)).toEqual(["luz"]);
    expect(serviciosDePersona(servicios, liq, beto)).toHaveLength(3);
  });
});

describe("estado de cuenta", () => {
  const liquidaciones = { [periodoKey("Enero", 2026)]: liqBase(), [periodoKey("Febrero", 2026)]: liqBase() };
  const pagos = [
    { id: 1, personaId: "1", periodoMes: "Enero", periodoAnio: 2026, estado: "Pagado", total: 620 },
    { id: 2, inquilino: " beto ", periodoMes: "Enero", periodoAnio: "2026", estado: "Pagado", total: 100 },
  ];

  it("calcula debe, pagado y saldo por período", () => {
    const ec = estadoCuenta(ana, liquidaciones, servicios, personas, pagos);
    expect(ec.periodos.map(p => p.saldo)).toEqual([0, 620]); // ana debe 500 + 20 + 100 = 620
    expect(ec.saldoTotal).toBe(620);
  });

  it("vincula pagos antiguos por nombre", () => {
    const vinculados = vincularPagos(pagos, personas);
    expect(vinculados[1].personaId).toBe("2");
    const ec = estadoCuenta(beto, liquidaciones, servicios, personas, vinculados);
    expect(ec.periodos[0].pagado).toBe(100);
  });
});

describe("esc", () => {
  it("escapa HTML", () => {
    expect(esc('<img src=x onerror="a">')).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;");
    expect(esc(null)).toBe("");
  });
});
