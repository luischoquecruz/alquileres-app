// Compartir reportes por WhatsApp: mensajes de texto con formato de WhatsApp y, en el celular,
// el PDF adjunto mediante el menú de compartir del sistema (Web Share API).
import { fmtMoney, fmtDate } from "./format.js";

const bs = n => `Bs.- ${fmtMoney(n)}`;
const lineas = (...ls) => ls.flat(Infinity).filter(l => l !== null && l !== undefined && l !== false).join("\n");
const firma = cfg => `_${cfg.orgNombre} — ${cfg.orgSubtitulo}_`;
const montosServicios = (servicios, detalles) => servicios
  .filter(s => Number(detalles?.[s.id]) > 0)
  .map(s => `${s.icon} ${s.label}: ${bs(detalles[s.id])}`);

// Número en formato internacional sin "+" (lo que espera wa.me). Un número local de hasta
// 8 dígitos recibe el código de país configurado.
export const numeroWhatsApp = (telefono, codigoPais = "591") => {
  let d = String(telefono || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) d = d.slice(1); // prefijo nacional
  if (d.length <= 8) d = String(codigoPais || "").replace(/\D/g, "") + d;
  return d;
};

export const enlaceWhatsApp = (texto, telefono, codigoPais) =>
  `https://wa.me/${numeroWhatsApp(telefono, codigoPais)}?text=${encodeURIComponent(texto)}`;

export const puedeCompartirArchivos = () => {
  try {
    return typeof navigator !== "undefined" && !!navigator.canShare
      && navigator.canShare({ files: [new File([""], "x.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
};

// Con `telefono` abre el chat de esa persona. Sin teléfono y con `archivo` (si el dispositivo lo
// permite) abre el menú de compartir del sistema con el PDF adjunto, donde se elige WhatsApp.
// Devuelve "compartido" | "cancelado" | "abierto" | "bloqueado".
export async function compartirWhatsApp({ texto, telefono, codigoPais, archivo }) {
  if (archivo && !telefono && puedeCompartirArchivos()) {
    try {
      await navigator.share({ files: [archivo], text: texto });
      return "compartido";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelado";
      // otro error: se sigue con el enlace de texto
    }
  }
  const w = window.open(enlaceWhatsApp(texto, telefono, codigoPais), "_blank");
  if (!w) return "bloqueado";
  try { w.opener = null; } catch { /* ignorado */ }
  return "abierto";
}

// ── Mensajes ───────────────────────────────────────────────

export const textoCobroLiquidacion = ({ cfg, periodo, nombre, detalles, total, servicios, pagado }) => lineas(
  `Hola ${nombre} 👋`,
  `Le enviamos el detalle de *${periodo}*:`,
  "",
  montosServicios(servicios, detalles),
  "",
  `*Total a pagar: ${bs(total)}*`,
  pagado ? "✅ Este período ya figura como pagado. ¡Gracias!" : null,
  "",
  firma(cfg),
);

export const textoResumenLiquidacion = ({ cfg, d }) => lineas(
  `📄 *Liquidación ${d.label}*`,
  "",
  d.tarifasLineas.map(t => `${t.s.icon} ${t.s.label}: factura ${bs(t.total)}`),
  "",
  d.filas.map(f => `• ${f.nombre}: *${bs(f.total)}* ${f.pagado ? "✅" : "⏳"}`),
  "",
  `*Total: ${bs(d.total)}* · ✅ ${d.pagados} pagado(s) · ⏳ ${d.pendientes} pendiente(s)`,
  "",
  firma(cfg),
);

export const textoRecibo = ({ cfg, pago, servicios }) => lineas(
  `🧾 *Recibo de pago — ${cfg.orgNombre}*`,
  "",
  `👤 ${pago.inquilino}`,
  `📅 Período: ${pago.periodoMes} ${pago.periodoAnio}`,
  `🗓️ Fecha: ${fmtDate(pago.fecha)}`,
  pago.metodo ? `💳 Método: ${pago.metodo}` : null,
  "",
  montosServicios(servicios, pago.montos || pago),
  "",
  `*Total pagado: ${bs(pago.total)}*`,
  Number(pago.montoRecibido) > 0 ? `Recibido: ${bs(pago.montoRecibido)} · Cambio: ${bs(Number(pago.cambio) || 0)}` : null,
  pago.notas ? `Nota: ${pago.notas}` : null,
  "",
  "¡Gracias por su pago! 🙌",
  firma(cfg),
);

// Estado de cuenta: `periodos` como los devuelve estadoCuenta (con debe, pagado, saldo y detalles).
export const textoEstadoCuenta = ({ cfg, nombre, periodos, servicios, soloDeuda = false }) => {
  const lista = soloDeuda ? periodos.filter(p => p.saldo > 0) : periodos;
  const saldo = lista.reduce((s, p) => s + Math.max(0, p.saldo), 0);
  return lineas(
    `Hola ${nombre} 👋`,
    saldo > 0 ? "Este es su estado de cuenta pendiente:" : "Este es su estado de cuenta:",
    "",
    lista.map(p => lineas(
      `*${p.label}*`,
      montosServicios(servicios, p.detalles).map(l => `   ${l}`),
      p.pagado > 0 ? `   Pagado: ${bs(p.pagado)}` : null,
      `   ${p.saldo > 0 ? `Saldo: *${bs(p.saldo)}*` : "✅ Pagado"}`,
    )),
    "",
    saldo > 0 ? `*Saldo pendiente total: ${bs(saldo)}*` : "✅ No tiene saldo pendiente. ¡Gracias!",
    "",
    firma(cfg),
  );
};

export const textoPagos = ({ cfg, pagos, total, desde, hasta }) => lineas(
  `📋 *Pagos registrados${desde || hasta ? ` (${fmtDate(desde) || "…"} al ${fmtDate(hasta) || "…"})` : ""}*`,
  "",
  pagos.slice(0, 40).map(p => `• ${fmtDate(p.fecha)} · ${p.inquilino} · ${p.periodoMes} ${p.periodoAnio}: *${bs(p.total)}*`),
  pagos.length > 40 ? `… y ${pagos.length - 40} más` : null,
  "",
  `*Total: ${bs(total)}* (${pagos.length} pago(s))`,
  "",
  firma(cfg),
);

export const textoInformeFinanciero = ({ cfg, filtros, total, cantidad, porServicio, porInquilino }) => lineas(
  `📊 *Resumen financiero${filtros?.desde || filtros?.hasta ? ` (${fmtDate(filtros.desde) || "…"} al ${fmtDate(filtros.hasta) || "…"})` : ""}*`,
  "",
  `*Total cobrado: ${bs(total)}* en ${cantidad} pago(s)`,
  "",
  porServicio.map(({ s, monto }) => `${s.icon} ${s.label}: ${bs(monto)}`),
  porInquilino.length ? ["", "*Por inquilino:*", porInquilino.map(g => `• ${g.inquilino}: ${bs(g.total)}`)] : null,
  "",
  firma(cfg),
);
