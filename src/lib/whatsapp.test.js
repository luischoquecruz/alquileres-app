import { describe, it, expect } from "vitest";
import { numeroWhatsApp, enlaceWhatsApp, textoCobroLiquidacion, textoEstadoCuenta, textoInformeFinanciero } from "./whatsapp.js";

const cfg = { orgNombre: "EGI", orgSubtitulo: "Alquileres" };
const agua = { id: "agua", label: "Agua", icon: "💧" };
const luz = { id: "luz", label: "Luz", icon: "⚡" };

describe("numeroWhatsApp", () => {
  it("agrega el código de país a números locales", () => {
    expect(numeroWhatsApp("700 111 22", "591")).toBe("59170011122");
    expect(numeroWhatsApp("070011122", "591")).toBe("59170011122"); // con prefijo nacional 0
  });
  it("respeta números internacionales", () => {
    expect(numeroWhatsApp("+591 70011122", "591")).toBe("59170011122");
    expect(numeroWhatsApp("0054 9 11 2345 6789", "591")).toBe("5491123456789");
  });
  it("sin teléfono devuelve vacío y el enlace abre WhatsApp para elegir contacto", () => {
    expect(numeroWhatsApp("", "591")).toBe("");
    expect(enlaceWhatsApp("hola mundo", "")).toBe("https://wa.me/?text=hola%20mundo");
  });
});

describe("mensajes", () => {
  it("cobro de liquidación lista solo servicios con monto", () => {
    const t = textoCobroLiquidacion({ cfg, periodo: "Octubre 2026", nombre: "Ana", detalles: { agua: 23.6, luz: 0 }, total: 23.6, servicios: [agua, luz] });
    expect(t).toContain("*Octubre 2026*");
    expect(t).toContain("💧 Agua: Bs.- 23,6");
    expect(t).not.toContain("Luz");
    expect(t).toContain("*Total a pagar: Bs.- 23,6*");
  });

  it("estado de cuenta suma solo saldos pendientes", () => {
    const periodos = [
      { label: "Sep 2026", detalles: { agua: 10 }, pagado: 10, saldo: 0 },
      { label: "Oct 2026", detalles: { agua: 12 }, pagado: 0, saldo: 12 },
    ];
    expect(textoEstadoCuenta({ cfg, nombre: "Ana", periodos, servicios: [agua] })).toContain("*Saldo pendiente total: Bs.- 12,0*");
    expect(textoEstadoCuenta({ cfg, nombre: "Ana", periodos, servicios: [agua], soloDeuda: true })).not.toContain("Sep 2026");
  });

  it("no deja arreglos anidados sin aplanar", () => {
    const t = textoInformeFinanciero({ cfg, total: 30, cantidad: 2, porServicio: [{ s: agua, monto: 30 }], porInquilino: [{ inquilino: "Ana", total: 20 }, { inquilino: "Beto", total: 10 }] });
    expect(t).toContain("• Ana: Bs.- 20,0\n• Beto: Bs.- 10,0");
  });
});
