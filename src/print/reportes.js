// Documentos imprimibles (se abren en una ventana nueva). Todo texto de usuario pasa por esc().
import { esc, fmtMoney, fmtDate, fmtNum, periodoDeKey } from "../lib/format.js";
import { SEReparto, serviciosDeLiq, totalesPorPersona, totalFactorServicio, montoPagado } from "../lib/calculos.js";

const CSS_BASE = `* { margin:0;padding:0;box-sizing:border-box; }
  body { font:13px/1.5 system-ui,sans-serif; color:#1e293b; padding:30px; max-width:800px; margin:0 auto; color-scheme:light; }
  .header { text-align:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #065f46; }
  .header h1 { font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#065f46;margin-bottom:2px; }
  .header h2 { font-size:17px;font-weight:800; }
  .header .sub { font-size:12px;color:#64748b;margin-top:4px; }
  table { width:100%;border-collapse:collapse;font-size:11px; }
  th { background:#065f46;color:#fff;padding:6px 8px;text-align:center;font-size:10px; }
  th:first-child { text-align:left; }
  td { padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0; }
  td:first-child { text-align:left;font-weight:700; }
  tfoot td { font-weight:700;background:#f1f5f9; }
  .debe { color:#059669 } .pagado { color:#065f46 } .saldo { color:#dc2626;font-weight:700 }
  .footer { text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px; }
  .toolbar { text-align:center;padding:10px 0;margin-bottom:12px;border-bottom:1px solid #e2e8f0; }
  .toolbar button { background:#065f46;color:#fff;border:none;padding:7px 16px;border-radius:4px;cursor:pointer;font:13px system-ui,sans-serif;margin:0 4px; }
  @media print { body { padding:10px; } .toolbar { display:none; } }`;

const bs = n => `Bs.- ${fmtMoney(n)}`;
const encabezado = (cfg, titulo, sub = "") =>
  `<div class="header"><h1>${esc(cfg.orgNombre)} — ${esc(cfg.orgSubtitulo)}</h1><h2>${esc(titulo)}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div>`;
const pie = cfg => `<div class="footer">Documento generado el ${new Date().toLocaleDateString("es-ES")} — ${esc(cfg.orgNombre)} Alquileres</div>`;

// Devuelve false si el navegador bloqueó la ventana emergente.
export function abrirImpresion(titulo, cuerpo, { css = CSS_BASE, imprimir = true } = {}) {
  const w = window.open("", "_blank", "width=800,height=700");
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>
<div class="toolbar"><button onclick="window.print()">🖨️ Imprimir</button><button onclick="window.close()">✖️ Cerrar</button></div>
${cuerpo}</body></html>`);
  w.document.close();
  if (imprimir) setTimeout(() => w.print(), 400);
  return true;
}

const tablaEstadoCuenta = (periodos, servicios, conTotales = true) => `
  <table><thead><tr><th>Período</th>${servicios.map(s => `<th>${esc(s.icon)} ${esc(s.label)}</th>`).join("")}<th>Debe</th><th>Pagó</th><th>Saldo</th></tr></thead>
  <tbody>${periodos.map(p => `<tr><td>${esc(p.label)}</td>
    ${servicios.map(s => `<td>${p.detalles[s.id] > 0 ? bs(p.detalles[s.id]) : "—"}</td>`).join("")}
    <td class="debe">${bs(p.debe)}</td><td class="pagado">${p.pagado > 0 ? bs(p.pagado) : "—"}</td>
    <td class="${p.saldo > 0 ? "saldo" : "pagado"}">${p.saldo > 0 ? bs(p.saldo) : "✅ Pagado"}</td></tr>`).join("")}</tbody>
  ${conTotales ? `<tfoot><tr><td>Total</td>
    ${servicios.map(s => { const t = periodos.reduce((sum, p) => sum + (p.detalles[s.id] || 0), 0); return `<td>${t > 0 ? bs(t) : "—"}</td>`; }).join("")}
    <td class="debe">${bs(periodos.reduce((s, p) => s + p.debe, 0))}</td>
    <td class="pagado">${bs(periodos.reduce((s, p) => s + p.pagado, 0))}</td>
    <td class="saldo">${bs(periodos.reduce((s, p) => s + p.saldo, 0))}</td></tr></tfoot>` : ""}
  </table>`;

const tablaTarifas = (claves, tarifas, servicios) => `
  <h3 style="font-size:13px;margin:12px 0 6px">📋 Tarifas por período</h3>
  <table style="margin-bottom:14px"><thead><tr><th>Período</th>${servicios.map(s => `<th>${esc(s.icon)}</th>`).join("")}</tr></thead>
  <tbody>${claves.map(k => `<tr><td>${esc(periodoDeKey(k).label)}</td>
    ${servicios.map(s => { const t = tarifas[k]?.[s.id]; return `<td>${t ? bs(t) : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;

export function imprimirDeuda({ cfg, persona, periodos, servicios, tarifas }) {
  const cuerpo = encabezado(cfg, "Deuda acumulada", `${esc(persona.nombre)}${persona.inmueble ? " — " + esc(persona.inmueble) : ""}`)
    + tablaTarifas(periodos.map(p => p.key), tarifas, servicios)
    + `<h3 style="font-size:13px;margin:12px 0 6px">💰 Detalle por período</h3>`
    + tablaEstadoCuenta(periodos, servicios) + pie(cfg);
  return abrirImpresion("Deuda acumulada", cuerpo);
}

export function imprimirResumenPersonas({ cfg, filas, servicios, tarifas, liquidaciones }) {
  const personasHtml = filas.map(f => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:14px;overflow:hidden;page-break-inside:avoid">
      <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px">
        <div><strong style="font-size:14px">${esc(f.nombre)}</strong>${f.inmueble ? `<span style="color:#64748b;margin-left:6px;font-size:12px">${esc(f.inmueble)}</span>` : ""}</div>
        <div style="font-size:11px">Debe: <strong class="debe">${bs(f.totalDebe)}</strong> | Pagado: <strong class="pagado">${bs(f.totalPagado)}</strong> | Saldo: <strong class="${f.saldoTotal > 0 ? "saldo" : "pagado"}">${bs(f.saldoTotal)}</strong></div>
      </div>
      ${tablaEstadoCuenta(f.periodos, servicios)}
    </div>`).join("");
  const cuerpo = encabezado(cfg, "Resumen de Pagos por Persona", `${filas.length} persona(s) — ${Object.keys(liquidaciones).length} período(s)`)
    + tablaTarifas(Object.keys(liquidaciones).sort(), tarifas, servicios) + personasHtml + pie(cfg);
  return abrirImpresion("Resumen por Persona", cuerpo);
}

const lineasMontos = (pago, servicios) => servicios
  .map(s => ({ s, monto: Number(pago.montos?.[s.id] ?? pago[s.id]) || 0 }))
  .filter(x => x.monto > 0);

export function imprimirRecibo({ cfg, pago, servicios }) {
  const fila = (lbl, val) => `<div class="field"><div class="lbl">${lbl}</div><div class="val">${val}</div></div>`;
  const css = CSS_BASE + `
    body { max-width:480px; font-size:14px; }
    .field { display:flex;padding:6px 0;border-bottom:1px solid #e2e8f0; }
    .field .lbl { width:140px;font-weight:700;color:#64748b;font-size:12px;flex-shrink:0; }
    .total-row { display:flex;justify-content:space-between;background:#065f46;color:#fff;padding:10px 12px;border-radius:6px;margin-top:10px;font-weight:800;font-size:16px; }`;
  const cuerpo = encabezado(cfg, "Recibo de Pago")
    + fila("Fecha", fmtDate(pago.fecha))
    + fila("Período", `${esc(pago.periodoMes)} ${esc(pago.periodoAnio)}`)
    + fila("Inquilino", esc(pago.inquilino) || "—")
    + fila("Recibido", bs(Number(pago.montoRecibido) || 0))
    + fila("Cambio", bs(Number(pago.cambio) || 0))
    + fila("Método", esc(pago.metodo) || "—")
    + lineasMontos(pago, servicios).map(({ s, monto }) => fila(`${esc(s.icon)} ${esc(s.label)}`, bs(monto))).join("")
    + `<div class="total-row"><span>TOTAL PAGADO</span><span>${bs(pago.total)}</span></div>`
    + (pago.notas ? `<div style="margin-top:10px;font-size:11px;color:#64748b;font-style:italic">"${esc(pago.notas)}"</div>` : "")
    + pie(cfg);
  return abrirImpresion(`Recibo — ${cfg.orgNombre}`, cuerpo, { css });
}

export function imprimirBoleta({ cfg, pago, servicios }) {
  const css = `* { margin:0;padding:0;box-sizing:border-box; }
    body { font:12px/1.4 "Courier New",monospace; color:#1e293b; padding:16px; max-width:320px; margin:0 auto; }
    .header { text-align:center; margin-bottom:14px; padding-bottom:10px; border-bottom:2px dashed #065f46; }
    .header h1 { font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#065f46; }
    .header h2 { font-size:15px;font-weight:800;margin:2px 0; }
    .info div { padding:2px 0; font-size:11px; }
    .items { border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; padding:8px 0; margin:10px 0; }
    .item { display:flex;justify-content:space-between;padding:3px 0; }
    .total-row { display:flex;justify-content:space-between;font-weight:800;font-size:15px;padding:6px 0;border-top:2px solid #065f46; }
    .footer { text-align:center;margin-top:14px;font-size:9px;color:#94a3b8;border-top:1px dashed #cbd5e1;padding-top:8px; }
    .toolbar { text-align:center;margin-bottom:10px } .toolbar button { margin:0 4px;padding:4px 10px }
    @media print { .toolbar { display:none } }`;
  const cuerpo = `<div class="header"><h1>${esc(cfg.orgNombre)}</h1><h2>${esc(cfg.appTitulo)}</h2><div style="font-size:10px;color:#64748b">${esc(cfg.orgSubtitulo)}</div></div>
    <div class="info">
      <div><b>Inquilino:</b> ${esc(pago.inquilino)}</div>
      <div><b>Recibido:</b> ${bs(Number(pago.montoRecibido) || 0)}</div>
      <div><b>Cambio:</b> ${bs(Number(pago.cambio) || 0)}</div>
      <div><b>Período:</b> ${esc(pago.periodoMes)} ${esc(pago.periodoAnio)}</div>
      <div><b>Fecha:</b> ${fmtDate(pago.fecha)}</div>
      <div><b>Método:</b> ${esc(pago.metodo)}</div>
    </div>
    <div class="items">${lineasMontos(pago, servicios).map(({ s, monto }) => `<div class="item"><span>${esc(s.icon)} ${esc(s.label)}</span><b>${bs(monto)}</b></div>`).join("")}</div>
    <div class="total-row"><span>TOTAL</span><span>${bs(pago.total)}</span></div>
    ${pago.notas ? `<div style="font-size:10px;color:#92400e;font-style:italic;margin-top:6px">"${esc(pago.notas)}"</div>` : ""}
    <div class="footer"><div style="font-size:11px;color:#065f46;font-weight:700;margin-bottom:4px">¡Gracias por su pago!</div>Recibo generado el ${new Date().toLocaleString("es-ES")}</div>`;
  return abrirImpresion(`Boleta — ${cfg.orgNombre}`, cuerpo, { css });
}

export function imprimirPagos({ cfg, pagos, total }) {
  const tarjetas = pagos.map(s => `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;page-break-inside:avoid">
      <div style="font-size:10px;color:#475569;margin-bottom:4px">${fmtDate(s.fecha)} · ${esc(s.metodo) || "—"} · ${esc(s.periodoMes)} ${esc(s.periodoAnio)} · ${esc(s.estado || "Pagado")}</div>
      <div style="font-weight:700;font-size:13px">${esc(s.inquilino) || "—"}</div>
      <div style="font-size:12px;color:#64748b">Recibido: ${bs(Number(s.montoRecibido) || 0)}${s.cambio ? ` | Cambio: ${bs(Number(s.cambio))}` : ""}</div>
      <div style="font-size:13px;color:#059669;font-weight:700;margin-top:3px">${bs(s.total)}</div>
      ${s.notas ? `<div style="font-size:10px;color:#92400e;font-style:italic">"${esc(s.notas)}"</div>` : ""}
    </div>`).join("");
  const cuerpo = encabezado(cfg, "Reporte de Pagos", `Total: ${pagos.length} registro(s) — ${bs(total)}`) + tarjetas + pie(cfg);
  return abrirImpresion(`Pagos — ${cfg.orgNombre}`, cuerpo);
}

// Datos comunes del informe de liquidación (HTML y PDF).
export function datosInformeLiquidacion({ clave, liq, servicios, activas, pagos }) {
  const { label, mes, anio } = periodoDeKey(clave);
  const totInq = totalesPorPersona(liq, servicios, activas);
  const srv = serviciosDeLiq(liq);
  const pagado = p => montoPagado(pagos, p, mes, anio) > 0;
  const filas = activas.map(p => {
    const datos = totInq[String(p.id)];
    if (!datos || datos.total <= 0) return null;
    const fc = liq.factores?.[String(p.id)];
    const conCargo = servicios.filter(s => datos.detalles[s.id] > 0);
    const usa = r => conCargo.some(s => (srv[s.id]?.reparto || s.reparto) === r);
    return {
      ...datos,
      hab: usa(SEReparto.HABITACIONES) && fc ? String(fc.habitaciones) : "",
      pers: usa(SEReparto.PERSONAS) && fc ? String(fc.personas) : "",
      pagado: pagado(p),
    };
  }).filter(Boolean);
  const totalesServicio = Object.fromEntries(servicios.map(s => [s.id, Object.values(totInq).reduce((sum, i) => sum + (i.detalles[s.id] || 0), 0)]));
  const tarifasLineas = servicios.filter(s => Number(srv[s.id]?.totalFactura) > 0).map(s => {
    const reparto = srv[s.id].reparto || s.reparto;
    const tf = totalFactorServicio(s, liq, activas);
    return { s, reparto, total: Number(srv[s.id].totalFactura), totalFactor: tf, precio: tf ? Math.round(Number(srv[s.id].totalFactura) / tf * 10) / 10 : null };
  });
  return {
    label, filas, totalesServicio, tarifasLineas,
    total: Object.values(totInq).reduce((s, i) => s + i.total, 0),
    pagados: activas.filter(pagado).length,
    pendientes: activas.filter(p => !pagado(p)).length,
  };
}

const etiquetaReparto = r => (r === SEReparto.HABITACIONES ? "🏠 x hab." : r === SEReparto.PERSONAS ? "👥 x pers." : "🏷️ 1 pago");

export function imprimirLiquidacion({ cfg, servicios, ...args }) {
  const d = datosInformeLiquidacion({ servicios, ...args });
  const tarifasHtml = d.tarifasLineas.map(t => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
      <span>${esc(t.s.icon)} ${esc(t.s.label)} <span style="color:#64748b;font-size:10px">${etiquetaReparto(t.reparto)}</span></span>
      <span>${t.precio && t.reparto !== SEReparto.UNIDAD ? `<span style="color:#065f46;margin-right:12px">${bs(t.precio)}/${t.reparto === SEReparto.HABITACIONES ? "hab" : "pers"}</span>` : ""}<b>${bs(t.total)}</b></span></div>`).join("");
  const cuerpo = encabezado(cfg, "Informe de Liquidación", `${esc(d.label)} · 💰 Total ${bs(d.total)} · ✅ ${d.pagados} pagado(s) · ⏳ ${d.pendientes} pendiente(s)`)
    + (tarifasHtml ? `<div style="margin:12px 0;padding:10px 14px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#065f46;margin-bottom:6px">💰 Tarifas del Período</div>${tarifasHtml}</div>` : "")
    + `<table><thead><tr><th>Inquilino</th><th>Hab.</th><th>Pers.</th>${servicios.map(s => `<th>${esc(s.icon)} ${esc(s.label)}</th>`).join("")}<th>Total</th><th>Estado</th></tr></thead>
      <tbody>${d.filas.map(f => `<tr><td>${esc(f.nombre)}${f.inmueble ? `<br><span style="font-size:10px;color:#64748b;font-weight:400">${esc(f.inmueble)}</span>` : ""}</td>
        <td>${f.hab}</td><td>${f.pers}</td>
        ${servicios.map(s => `<td>${f.detalles[s.id] > 0 ? bs(f.detalles[s.id]) : "—"}</td>`).join("")}
        <td><b>${bs(f.total)}</b></td><td>${f.pagado ? "✅ Pagado" : "⏳ Pendiente"}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Totales</td><td></td><td></td>
        ${servicios.map(s => { const t = d.tarifasLineas.find(x => x.s.id === s.id); return `<td>${d.totalesServicio[s.id] > 0 ? bs(d.totalesServicio[s.id]) : "—"}${t?.totalFactor ? `<br><span style="font-size:9px;color:#475569">${fmtNum(t.totalFactor)} ${t.reparto === SEReparto.HABITACIONES ? "hab." : "pers."}</span>` : ""}</td>`; }).join("")}
        <td>${bs(d.total)}</td><td></td></tr></tfoot></table>` + pie(cfg);
  return abrirImpresion(`Informe — ${d.label} — ${cfg.orgNombre}`, cuerpo, { imprimir: false });
}
