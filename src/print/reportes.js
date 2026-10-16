// Documentos imprimibles (se abren en una ventana nueva). Todo texto de usuario pasa por esc().
import { esc, fmtMoney, fmtDate, fmtNum, fmtPrecio, periodoDeKey } from "../lib/format.js";
import { SEReparto, serviciosDeLiq, totalesPorPersona, totalFactorServicio, montoPagado, personasDeLiquidacion, detalleServicio } from "../lib/calculos.js";

// Solo colores hex: el valor viene de la configuración y se interpola en CSS.
const color = (c, def) => (/^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : def);

const cssBase = cfg => {
  const p = color(cfg?.colorPrimario, "#065f46");
  const a = color(cfg?.colorAcento, "#059669");
  return `
  @page { size: A4; margin: 14mm 12mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  :root { --p:${p}; --a:${a}; --tx:#0f172a; --mu:#64748b; --bd:#e2e8f0; --bg:#f8fafc; --ok:#047857; --okbg:#d1fae5; --warn:#92400e; --warnbg:#fef3c7; --bad:#b91c1c; }
  body { font:12.5px/1.5 "Segoe UI",system-ui,-apple-system,Roboto,sans-serif; color:var(--tx); background:#eef2f5; color-scheme:light;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page { max-width:820px; margin:16px auto 32px; background:#fff; border-radius:10px; box-shadow:0 4px 24px rgba(15,23,42,.08); overflow:hidden; }
  .doc { padding:28px 32px 24px; }
  .num, td.n, th.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .c { text-align:center; }
  .muted { color:var(--mu); }
  .nowrap { white-space:nowrap; }

  .band { background:linear-gradient(135deg,var(--p),var(--a)); color:#fff; padding:22px 32px; display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
  .band .org { font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; opacity:.85; }
  .band h1 { font-size:22px; font-weight:800; margin-top:4px; letter-spacing:-.01em; }
  .band .sub { font-size:13px; opacity:.9; margin-top:2px; }
  .band .meta { text-align:right; font-size:11px; opacity:.9; line-height:1.6; white-space:nowrap; }

  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:20px; }
  .kpi { border:1px solid var(--bd); border-radius:8px; padding:10px 14px; background:var(--bg); }
  .kpi .l { font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--mu); }
  .kpi .v { font-size:18px; font-weight:800; margin-top:2px; font-variant-numeric:tabular-nums; }
  .kpi.hl { background:var(--p); border-color:var(--p); color:#fff; } .kpi.hl .l { color:rgba(255,255,255,.8); }
  .kpi.bad .v { color:var(--bad); } .kpi.ok .v { color:var(--ok); }

  h3 { font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--p); margin:20px 0 8px; }
  h3:first-child { margin-top:0; }

  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  thead th { text-align:left; font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--mu);
    padding:7px 8px; border-bottom:2px solid var(--p); background:#fff; }
  tbody td { padding:7px 8px; border-bottom:1px solid var(--bd); vertical-align:top; }
  tbody tr:nth-child(even) td { background:#fbfcfd; }
  tfoot td { padding:8px; font-weight:800; border-top:2px solid var(--tx); background:var(--bg); }
  td .sm { display:block; font-size:10px; color:var(--mu); font-weight:400; }
  thead { display:table-header-group; } tr { page-break-inside:avoid; }

  .pill { display:inline-block; padding:1px 8px; border-radius:999px; font-size:10px; font-weight:700; white-space:nowrap; }
  .pill.ok { background:var(--okbg); color:var(--ok); } .pill.warn { background:var(--warnbg); color:var(--warn); }
  .saldo { color:var(--bad); font-weight:800; } .pagado { color:var(--ok); }

  .box { border:1px solid var(--bd); border-radius:8px; overflow:hidden; margin-bottom:14px; page-break-inside:avoid; }
  .box-h { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 12px; background:var(--bg); border-bottom:1px solid var(--bd); }
  .box-h .t { font-size:14px; font-weight:800; } .box-h .s { font-size:11px; color:var(--mu); }
  .box-h .r { font-size:11px; display:flex; gap:14px; flex-wrap:wrap; }
  .box table thead th { border-bottom-width:1px; }

  .tarifas { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; margin-bottom:6px; }
  .tarifa { display:flex; justify-content:space-between; gap:8px; align-items:baseline; border:1px solid var(--bd); border-radius:8px; padding:8px 12px; }
  .tarifa .n { font-weight:700; } .tarifa .d { font-size:10px; color:var(--mu); display:block; font-weight:400; }

  .box-h .ico { font-size:16px; margin-right:6px; }
  .total-bar { display:flex; justify-content:space-between; align-items:center; gap:12px; background:#fef2f2; border:1px solid #fecaca; border-left:5px solid var(--bad);
    border-radius:8px; padding:12px 16px; margin:4px 0 22px; page-break-inside:avoid; }
  .total-bar .l { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--bad); }
  .total-bar .l span { display:block; font-size:10.5px; font-weight:400; letter-spacing:0; text-transform:none; color:var(--mu); margin-top:2px; }
  .total-bar .v { font-size:22px; font-weight:900; color:var(--bad); font-variant-numeric:tabular-nums; white-space:nowrap; }

  /* Facturas: tarjeta informativa con color propio para no confundirla con la deuda */
  .fact { --fx:#1d4ed8; --fxbg:#eff6ff; --fxbd:#bfdbfe; border:1px solid var(--fxbd); border-left:5px solid var(--fx); border-radius:10px; background:var(--fxbg); padding:14px 16px 16px; margin-top:22px; }
  .fact-h { display:flex; gap:10px; align-items:flex-start; margin-bottom:12px; }
  .fact-h .ico { font-size:20px; line-height:1; }
  .fact-h .t { font-size:13px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--fx); }
  .fact-h .s { font-size:10.5px; color:var(--mu); margin-top:2px; }
  .fact-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
  .fact-per { display:flex; flex-direction:column; background:#fff; border:1px solid var(--fxbd); border-radius:8px; overflow:hidden; page-break-inside:avoid; break-inside:avoid; }
  .fact-per .ph { background:var(--fx); color:#fff; font-weight:800; font-size:11.5px; padding:6px 10px; letter-spacing:.02em; }
  .fact-per ul { list-style:none; padding:4px 10px; flex:1; }
  .fact-per li { display:flex; justify-content:space-between; align-items:baseline; gap:8px; padding:4px 0; border-bottom:1px dashed var(--bd); font-size:11.5px; }
  .fact-per li:last-child { border-bottom:0; }
  .fact-per li .cs { display:block; font-size:9.5px; color:var(--mu); }
  .fact-per .pt { display:flex; justify-content:space-between; padding:6px 10px; background:var(--fxbg); border-top:1px solid var(--fxbd); font-weight:800; font-size:11.5px; color:var(--fx); }
  .nota { font-size:10px; color:var(--mu); margin-top:14px; font-style:italic; }

  .foot { display:flex; justify-content:space-between; gap:12px; margin-top:24px; padding-top:10px; border-top:1px solid var(--bd); font-size:10px; color:var(--mu); }

  .toolbar { position:sticky; top:0; z-index:5; display:flex; justify-content:center; gap:8px; padding:10px; background:rgba(238,242,245,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--bd); }
  .toolbar button { font:600 13px "Segoe UI",system-ui,sans-serif; border:1px solid var(--bd); background:#fff; color:var(--tx); padding:8px 16px; border-radius:8px; cursor:pointer; }
  .toolbar button.pri { background:var(--p); border-color:var(--p); color:#fff; }
  .toolbar .hint { font-size:11px; color:var(--mu); align-self:center; }

  @media (max-width:640px) { .doc { padding:20px 16px; } .band { padding:18px 16px; flex-direction:column; align-items:flex-start; } .band .meta { text-align:left; } .page { margin:0; border-radius:0; } table { font-size:10.5px; } }
  @media print { body { background:#fff; } .page { margin:0; max-width:none; box-shadow:none; border-radius:0; } .toolbar { display:none; } .band { border-radius:0; } }`;
};

const bs = n => `Bs.- ${fmtMoney(n)}`;
const hoy = () => new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

const banda = (cfg, titulo, sub = "", meta = "") => `<div class="band"><div>
    <div class="org">${esc(cfg.orgNombre)} · ${esc(cfg.orgSubtitulo)}</div>
    <h1>${esc(titulo)}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}
  </div><div class="meta">${meta || `Emitido el<br><b>${hoy()}</b>`}</div></div>`;
const pie = cfg => `<div class="foot"><span>${esc(cfg.orgNombre)} — ${esc(cfg.appTitulo || "Alquileres")}</span><span>Generado el ${new Date().toLocaleString("es-ES")}</span></div>`;
const kpi = (l, v, cls = "") => `<div class="kpi ${cls}"><div class="l">${l}</div><div class="v">${v}</div></div>`;

// Devuelve false si el navegador bloqueó la ventana emergente.
export function abrirImpresion(titulo, cuerpo, { css, cfg, imprimir = true } = {}) {
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><style>${css || cssBase(cfg)}</style></head><body>
<div class="toolbar"><button class="pri" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button><button onclick="window.close()">✖️ Cerrar</button></div>
${cuerpo}</body></html>`);
  w.document.close();
  if (imprimir) setTimeout(() => w.print(), 500);
  return true;
}

const documento = (cfg, { titulo, sub, meta, contenido }) =>
  `<div class="page">${banda(cfg, titulo, sub, meta)}<div class="doc">${contenido}${pie(cfg)}</div></div>`;

// `m` formatea los montos: con prefijo "Bs.-" por defecto, o solo el número en reportes compactos.
const tablaEstadoCuenta = (periodos, servicios, m = bs) => {
  const usados = servicios.filter(s => periodos.some(p => p.detalles[s.id] > 0));
  return `<table><thead><tr><th>Período</th>${usados.map(s => `<th class="n">${esc(s.icon)} ${esc(s.label)}</th>`).join("")}<th class="n">Debe</th><th class="n">Pagó</th><th class="n">Saldo</th></tr></thead>
  <tbody>${periodos.map(p => `<tr><td><b>${esc(p.label)}</b></td>
    ${usados.map(s => `<td class="n">${p.detalles[s.id] > 0 ? m(p.detalles[s.id]) : "—"}</td>`).join("")}
    <td class="n">${m(p.debe)}</td><td class="n pagado">${p.pagado > 0 ? m(p.pagado) : "—"}</td>
    <td class="n">${p.saldo > 0 ? `<span class="saldo">${m(p.saldo)}</span>` : `<span class="pill ok">Pagado</span>`}</td></tr>`).join("")}</tbody>
  <tfoot><tr><td>Total</td>
    ${usados.map(s => `<td class="n">${m(periodos.reduce((sum, p) => sum + (p.detalles[s.id] || 0), 0))}</td>`).join("")}
    <td class="n">${m(periodos.reduce((s, p) => s + p.debe, 0))}</td>
    <td class="n pagado">${m(periodos.reduce((s, p) => s + p.pagado, 0))}</td>
    <td class="n saldo">${m(periodos.reduce((s, p) => s + Math.max(0, p.saldo), 0))}</td></tr></tfoot>
  </table>`;
};

// Tarjeta con el total de cada factura del inmueble por período (base del reparto, no es deuda).
const tarjetaFacturas = (claves, tarifas, servicios) => {
  const periodos = claves.map(k => ({
    label: periodoDeKey(k).label,
    lineas: servicios.filter(s => Number(tarifas[k]?.[s.id]) > 0)
      .map(s => ({ s, monto: Number(tarifas[k][s.id]), consumo: Number(tarifas[k][s.id + "_consumo"]) || 0 })),
  })).filter(p => p.lineas.length);
  if (!periodos.length) return "";
  return `<div class="fact">
    <div class="fact-h"><span class="ico">🧾</span><div><div class="t">Facturas por período</div>
      <div class="s">Monto total de cada factura del inmueble. Es la base del reparto entre inquilinos; su parte figura en el detalle de deuda.</div></div></div>
    <div class="fact-grid">${periodos.map(p => `<div class="fact-per"><div class="ph">${esc(p.label)}</div>
      <ul>${p.lineas.map(({ s, monto, consumo }) => `<li><span>${esc(s.icon)} ${esc(s.label)}${consumo ? `<span class="cs">${fmtNum(consumo)} ${esc(s.unit)}</span>` : ""}</span><b class="num">${bs(monto)}</b></li>`).join("")}</ul>
      <div class="pt"><span>Total facturado</span><span class="num">${bs(p.lineas.reduce((t, l) => t + l.monto, 0))}</span></div></div>`).join("")}
    </div></div>`;
};

export function imprimirDeuda({ cfg, persona, periodos, servicios, tarifas }) {
  const total = periodos.reduce((s, p) => s + Math.max(0, p.saldo), 0);
  const debe = periodos.reduce((s, p) => s + p.debe, 0);
  const pagado = periodos.reduce((s, p) => s + p.pagado, 0);
  const rango = periodos.length > 1 ? `${periodos[0].label} a ${periodos[periodos.length - 1].label}` : periodos[0]?.label || "";
  const contenido = `<div class="kpis">${kpi("Saldo pendiente", bs(total), "hl")}${kpi("Períodos adeudados", periodos.length, "bad")}${kpi("Total liquidado", bs(debe))}${kpi("Pagado a cuenta", bs(pagado), pagado > 0 ? "ok" : "")}</div>
    <div class="box">
      <div class="box-h"><div><div class="t"><span class="ico">📋</span>Detalle de deuda por período</div>${rango ? `<div class="s">${esc(rango)}</div>` : ""}</div></div>
      ${tablaEstadoCuenta(periodos, servicios)}
    </div>
    <div class="total-bar"><div class="l">Total a pagar<span>Suma de los saldos pendientes de ${periodos.length} período(s)</span></div><div class="v">${bs(total)}</div></div>
    ${tarjetaFacturas(periodos.map(p => p.key), tarifas, servicios)}
    <p class="nota">Estado de cuenta informativo emitido el ${hoy()}. Los pagos registrados después de esta fecha no están reflejados.</p>`;
  const sub = `${esc(persona.nombre)}${persona.inmueble ? ` · ${esc(persona.inmueble)}` : ""}`;
  return abrirImpresion(`Deuda acumulada — ${persona.nombre}`, documento(cfg, { titulo: "Estado de deuda", sub, contenido }), { cfg });
}

// Cálculo de la liquidación de un mes: cómo se repartió cada factura entre los inquilinos que participaron.
const calculoLiquidacion = (clave, liq, servicios, personas, tarifas) => {
  const srv = serviciosDeLiq(liq);
  const lineas = servicios.filter(s => Number(srv[s.id]?.totalFactura) > 0);
  if (!lineas.length) return "";
  const gente = personasDeLiquidacion(liq, personas);
  const formulas = lineas.map(s => {
    const reparto = srv[s.id].reparto || s.reparto;
    const total = Number(srv[s.id].totalFactura);
    const tf = totalFactorServicio(s, liq, gente);
    const consumo = Number(tarifas?.[clave]?.[s.id + "_consumo"]) || 0;
    const [uno, varios] = reparto === SEReparto.HABITACIONES ? ["habitación", "habitaciones"] : ["persona", "personas"];
    const calc = reparto === SEReparto.UNIDAD || !tf
      ? `monto fijo: cada inquilino paga <b>${fmtMoney(total)}</b>`
      : `factura de ${fmtMoney(total)} ÷ ${fmtNum(tf)} ${varios} en total = <b>${fmtPrecio(total / tf)} por ${uno}</b>`;
    return `<li><span class="sv">${esc(s.icon)} ${esc(s.label)}${consumo ? ` <i>(${fmtNum(consumo)} ${esc(s.unit)})</i>` : ""}</span><span>${calc}</span></li>`;
  }).join("");
  const sumas = lineas.map(() => 0);
  const filas = gente.map(p => {
    const celdas = lineas.map(s => detalleServicio(s, liq, p, gente));
    const total = celdas.reduce((t, d) => t + d.monto, 0);
    if (total <= 0) return "";
    celdas.forEach((d, i) => { sumas[i] += d.monto; });
    return `<tr><td>${esc(p.nombre) || "—"}</td>${celdas.map((d, i) => {
      if (d.monto <= 0) return `<td class="n">—</td>`;
      const reparto = srv[lineas[i].id].reparto || lineas[i].reparto;
      return `<td class="n">${reparto === SEReparto.UNIDAD ? "" : `<i>${fmtNum(d.factor)} ${unidad(reparto)} × ${fmtPrecio(d.precio)} =</i> `}${fmtMoney(d.monto)}</td>`;
    }).join("")}<td class="n"><b>${fmtMoney(total)}</b></td></tr>`;
  }).join("");
  return `<div class="liq"><div class="liq-h">${esc(periodoDeKey(clave).label)}</div>
    <ul class="liq-f"><li class="paso">1. Precio de cada servicio</li>${formulas}<li class="paso">2. Lo que paga cada inquilino = su cantidad × el precio</li></ul>
    <table><thead><tr><th>Inquilino</th>${lineas.map(s => `<th class="n">${esc(s.icon)} ${esc(s.label)}</th>`).join("")}<th class="n">Total</th></tr></thead><tbody>${filas}</tbody>
    <tfoot><tr><td>Total</td>${sumas.map(t => `<td class="n">${fmtMoney(t)}</td>`).join("")}<td class="n">${fmtMoney(sumas.reduce((a, b) => a + b, 0))}</td></tr></tfoot></table></div>`;
};

// Ajustes para que el resumen por persona entre en una sola hoja.
const cssCompacto = `
  @page { margin: 8mm; }
  body { font-size:10.5px; line-height:1.35; }
  .band { padding:12px 20px; } .band h1 { font-size:17px; margin-top:1px; } .band .sub { font-size:11px; }
  .doc { padding:12px 18px 10px; }
  .kpis { gap:6px; margin-bottom:10px; } .kpi { padding:5px 10px; } .kpi .v { font-size:14px; }
  h3 { font-size:10.5px; margin:10px 0 5px; }
  table { font-size:9.5px; } thead th { font-size:8.5px; padding:3px 5px; } tbody td, tfoot td { padding:2px 5px; }
  .cols { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:6px; }
  .liqs { display:grid; gap:6px; }
  .box { margin-bottom:0; } .box-h { padding:4px 8px; } .box-h .t { font-size:11.5px; } .box-h .s { font-size:9.5px; }
  .cols td:first-child { white-space:nowrap; }
  .liq { border:1px solid var(--bd); border-radius:6px; overflow:hidden; break-inside:avoid; page-break-inside:avoid; }
  .liq-h { background:var(--p); color:#fff; font-weight:800; font-size:10.5px; padding:3px 8px; }
  .liq-f { list-style:none; padding:4px 8px; background:var(--bg); border-bottom:1px solid var(--bd); font-size:9.5px; }
  .liq-f li { display:flex; gap:8px; padding:1px 0 1px 12px; }
  .liq-f li.paso { padding-left:0; color:var(--p); font-weight:600; } .liq-f li.paso:not(:first-child) { margin-top:3px; }
  .liq-f .sv { min-width:150px; }
  .liq-calc-nota { font-size:9px; color:var(--mu); margin:-2px 0 5px; }
  /* Tarjetas de inquilinos: cada una con su color */
  .cols .box { border-left:4px solid var(--c); }
  .cols .box-h { background:color-mix(in srgb, var(--c) 10%, #fff); } .cols .box-h .t { color:var(--c); }
  .cols thead th { border-bottom-color:var(--c); }
  .cols tfoot td { border-top:0; background:color-mix(in srgb, var(--c) 14%, #fff); color:var(--c); font-size:11px; padding:4px 5px; }
  .liq i, .liq-f i { color:var(--mu); font-style:normal; font-size:8.5px; }
  .foot { margin-top:10px; padding-top:5px; font-size:8.5px; }
  /* Menos negrita: solo se resaltan los totales y saldos */
  h3, .kpi .v { font-weight:700; }
  td b, .liq-f b { font-weight:400; }
  .box-h .t, .liq-h, tfoot td, .saldo { font-weight:600; }
  .liq td:last-child b { font-weight:600; }`;

export function imprimirResumenPersonas({ cfg, filas, servicios, tarifas, liquidaciones, personas, soloDeuda = false }) {
  const deuda = filas.reduce((s, f) => s + Math.max(0, f.saldoTotal), 0);
  const cobrado = filas.reduce((s, f) => s + f.totalPagado, 0);
  const personasHtml = filas.map((f, i) => `<div class="box" style="--c:${COLORES[i % COLORES.length]}">
      <div class="box-h"><div><div class="t">${esc(f.nombre)}</div>${f.inmueble ? `<div class="s">${esc(f.inmueble)}</div>` : ""}</div></div>
      <table><thead><tr><th>Período</th><th class="n">Debe</th></tr></thead>
        <tbody>${f.periodos.map(p => `<tr><td>${esc(p.label)}</td><td class="n">${fmtMoney(p.debe)}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>Total</td><td class="n">${fmtMoney(f.totalDebe)}</td></tr></tfoot></table>
    </div>`).join("");
  // Con soloDeuda, `filas` ya trae solo los meses con saldo pendiente.
  const claves = soloDeuda ? [...new Set(filas.flatMap(f => f.periodos.map(p => p.key)))].sort() : Object.keys(liquidaciones).sort();
  // Meses distintos con deuda (no la suma de meses de cada inquilino).
  const meses = claves.length;
  const calculos = claves.map(k => calculoLiquidacion(k, liquidaciones[k], servicios, personas, tarifas)).join("");
  const contenido = `<div class="kpis">${kpi("Inquilinos", filas.length)}${kpi("Con deuda", filas.filter(f => f.saldoTotal > 0).length, "bad")}${soloDeuda ? kpi("Meses adeudados", meses, "bad") : kpi("Cobrado", bs(cobrado), "ok")}${kpi("Deuda total", bs(deuda), "hl")}</div>
    <h3>${soloDeuda ? "Meses con saldo pendiente por inquilino" : "Estado de cuenta por inquilino"} (Bs.-)</h3><div class="cols">${personasHtml}</div>
    ${calculos ? `<h3>Cálculo de la liquidación por mes (Bs.-)</h3>
      <p class="liq-calc-nota">Cada factura se divide entre el total de habitaciones o personas del inmueble. Cada inquilino paga su cantidad por ese precio (redondeado a 1 decimal).</p><div class="liqs">${calculos}</div>` : ""}`;
  const sub = soloDeuda ? `Solo deudas · ${filas.length} inquilino(s) · ${meses} mes(es) adeudado(s)` : `${filas.length} inquilino(s) · ${Object.keys(liquidaciones).length} período(s) liquidados`;
  return abrirImpresion("Resumen por Persona", documento(cfg, { titulo: soloDeuda ? "Resumen de deudas por persona" : "Resumen por persona", sub, contenido }), { css: cssBase(cfg) + cssCompacto });
}

const lineasMontos = (pago, servicios) => servicios
  .map(s => ({ s, monto: Number(pago.montos?.[s.id] ?? pago[s.id]) || 0 }))
  .filter(x => x.monto > 0);

export function imprimirRecibo({ cfg, pago, servicios }) {
  const css = cssBase(cfg) + `
    .page { max-width:560px; } .doc { position:relative; }
    .stamp { position:absolute; right:28px; top:22px; transform:rotate(-8deg); border:3px solid var(--ok); color:var(--ok); border-radius:8px; padding:4px 12px; font-weight:900; letter-spacing:.12em; font-size:16px; opacity:.85; }
    dl { display:grid; grid-template-columns:120px 1fr; gap:6px 12px; margin-bottom:18px; font-size:13px; } dt { color:var(--mu); font-weight:600; }
    .total { display:flex; justify-content:space-between; align-items:center; background:var(--p); color:#fff; border-radius:8px; padding:12px 16px; margin-top:12px; font-weight:800; font-size:17px; }`;
  const contenido = `<div class="stamp">PAGADO</div>
    <dl><dt>Inquilino</dt><dd><b>${esc(pago.inquilino) || "—"}</b></dd>
      <dt>Período</dt><dd>${esc(pago.periodoMes)} ${esc(pago.periodoAnio)}</dd>
      <dt>Fecha de pago</dt><dd>${fmtDate(pago.fecha)}</dd>
      <dt>Método</dt><dd>${esc(pago.metodo) || "—"}</dd></dl>
    <table><thead><tr><th>Concepto</th><th class="n">Monto</th></tr></thead>
      <tbody>${lineasMontos(pago, servicios).map(({ s, monto }) => `<tr><td>${esc(s.icon)} ${esc(s.label)}</td><td class="n">${bs(monto)}</td></tr>`).join("")}</tbody></table>
    <div class="total"><span>TOTAL PAGADO</span><span>${bs(pago.total)}</span></div>
    ${Number(pago.montoRecibido) > 0 ? `<p class="muted" style="margin-top:8px;font-size:12px">Recibido ${bs(pago.montoRecibido)} · Cambio ${bs(Number(pago.cambio) || 0)}</p>` : ""}
    ${pago.notas ? `<p style="margin-top:10px;font-size:12px;font-style:italic;color:#92400e">“${esc(pago.notas)}”</p>` : ""}`;
  const meta = `Recibo N.º<br><b>${esc(String(pago.id).slice(-6))}</b>`;
  return abrirImpresion(`Recibo — ${cfg.orgNombre}`, documento(cfg, { titulo: "Recibo de pago", sub: esc(cfg.appTitulo), meta, contenido }), { css });
}

// Boleta de 80 mm para impresoras térmicas.
export function imprimirBoleta({ cfg, pago, servicios }) {
  const p = color(cfg?.colorPrimario, "#065f46");
  const css = `@page { size: 80mm auto; margin: 4mm; }
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font:12px/1.45 "Courier New",ui-monospace,monospace; color:#111; max-width:300px; margin:0 auto; padding:12px; background:#fff; }
    .c { text-align:center; } .hd { padding-bottom:10px; margin-bottom:10px; border-bottom:2px dashed #111; }
    .hd .o { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${p}; font-weight:700; }
    .hd .t { font-size:14px; font-weight:800; margin:2px 0; }
    .row { display:flex; justify-content:space-between; gap:8px; padding:2px 0; }
    .items { border-top:1px dashed #555; border-bottom:1px dashed #555; padding:6px 0; margin:8px 0; }
    .tot { font-size:16px; font-weight:800; padding:6px 0; border-bottom:2px solid #111; }
    .ft { margin-top:12px; font-size:10px; color:#555; }
    .toolbar { text-align:center; margin-bottom:10px } .toolbar button { margin:0 4px; padding:6px 12px; font:inherit; cursor:pointer; }
    @media print { .toolbar { display:none } }`;
  const fila = (l, v) => `<div class="row"><span>${l}</span><span>${v}</span></div>`;
  const cuerpo = `<div class="hd c"><div class="o">${esc(cfg.orgNombre)}</div><div class="t">${esc(cfg.appTitulo)}</div><div style="font-size:10px">${esc(cfg.orgSubtitulo)}</div></div>
    ${fila("Boleta N.º", esc(String(pago.id).slice(-6)))}${fila("Fecha", fmtDate(pago.fecha))}${fila("Período", `${esc(pago.periodoMes)} ${esc(pago.periodoAnio)}`)}
    <div style="margin:6px 0"><b>${esc(pago.inquilino)}</b></div>
    <div class="items">${lineasMontos(pago, servicios).map(({ s, monto }) => fila(`${esc(s.label)}`, bs(monto))).join("")}</div>
    <div class="row tot"><span>TOTAL</span><span>${bs(pago.total)}</span></div>
    ${fila("Método", esc(pago.metodo))}${fila("Recibido", bs(Number(pago.montoRecibido) || 0))}${fila("Cambio", bs(Number(pago.cambio) || 0))}
    ${pago.notas ? `<div style="font-size:10px;font-style:italic;margin-top:6px">"${esc(pago.notas)}"</div>` : ""}
    <div class="ft c"><div style="font-weight:700;font-size:12px;color:#111;margin-bottom:2px">¡Gracias por su pago!</div>${new Date().toLocaleString("es-ES")}</div>`;
  return abrirImpresion(`Boleta — ${cfg.orgNombre}`, cuerpo, { css });
}

export function imprimirPagos({ cfg, pagos, total }) {
  const metodos = {};
  pagos.forEach(p => { metodos[p.metodo || "—"] = (metodos[p.metodo || "—"] || 0) + Number(p.total || 0); });
  const contenido = `<div class="kpis">${kpi("Total cobrado", bs(total), "hl")}${kpi("Pagos", pagos.length)}${Object.entries(metodos).slice(0, 2).map(([m, v]) => kpi(esc(m), bs(v))).join("")}</div>
    <table><thead><tr><th>Fecha</th><th>Inquilino</th><th>Período</th><th>Método</th><th class="c">Estado</th><th class="n">Total</th></tr></thead>
    <tbody>${pagos.map(s => `<tr><td class="nowrap">${fmtDate(s.fecha)}</td>
      <td><b>${esc(s.inquilino) || "—"}</b>${s.notas ? `<span class="sm">“${esc(s.notas)}”</span>` : ""}</td>
      <td>${esc(s.periodoMes)} ${esc(s.periodoAnio)}</td><td>${esc(s.metodo) || "—"}</td>
      <td class="c"><span class="pill ${s.estado === "Pendiente" ? "warn" : "ok"}">${esc(s.estado || "Pagado")}</span></td>
      <td class="n"><b>${bs(s.total)}</b></td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="5">Total (${pagos.length} pago(s))</td><td class="n">${bs(total)}</td></tr></tfoot></table>`;
  return abrirImpresion(`Pagos — ${cfg.orgNombre}`, documento(cfg, { titulo: "Reporte de pagos", sub: `${pagos.length} registro(s)`, contenido }), { cfg });
}

const COLORES = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#dc2626", "#65a30d"];

export function imprimirInformeFinanciero({ cfg, filtros, total, cantidad, metodoComun, periodosGrafico = [], porServicio, porInquilino, servicios }) {
  const rango = filtros?.desde || filtros?.hasta ? `Del ${fmtDate(filtros.desde) || "…"} al ${fmtDate(filtros.hasta) || "…"}` : "Todos los pagos";
  const max = Math.max(...periodosGrafico.map(p => p.total), 1);
  const grafico = periodosGrafico.length ? `<h3>Cobrado por período</h3>
    <div style="display:flex;align-items:flex-end;gap:10px;height:170px;padding:6px 0;border-bottom:1px solid var(--bd)">
      ${periodosGrafico.map(per => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
        <div style="font-size:9.5px;font-weight:700;margin-bottom:3px">${fmtMoney(per.total)}</div>
        <div style="width:60%;max-width:46px;display:flex;flex-direction:column-reverse;height:${Math.round(per.total / max * 130)}px;border-radius:4px 4px 0 0;overflow:hidden">
          ${servicios.map((s, i) => per.vals[s.id] > 0 ? `<div style="height:${per.vals[s.id] / per.total * 100}%;background:${COLORES[i % COLORES.length]}"></div>` : "").join("")}
        </div></div>`).join("")}
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">${periodosGrafico.map(per => `<div style="flex:1;text-align:center;font-size:9.5px;color:var(--mu)">${esc(per.label)}</div>`).join("")}</div>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:8px;font-size:10.5px">${servicios.map((s, i) => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${COLORES[i % COLORES.length]};margin-right:4px"></i>${esc(s.label)}</span>`).join("")}</div>` : "";
  const contenido = `<div class="kpis">${kpi("Total cobrado", bs(total), "hl")}${kpi("Pagos", cantidad)}${kpi("Inquilinos", porInquilino.length)}${kpi("Método común", esc(metodoComun))}</div>
    ${porServicio.length ? `<h3>Por servicio</h3><table><thead><tr><th>Servicio</th><th class="n">Cobrado</th><th class="n">% del total</th></tr></thead>
      <tbody>${porServicio.map(({ s, monto }) => `<tr><td>${esc(s.icon)} ${esc(s.label)}</td><td class="n">${bs(monto)}</td><td class="n">${total ? fmtNum(Math.round(monto / total * 1000) / 10) : 0} %</td></tr>`).join("")}</tbody></table>` : ""}
    ${grafico}
    <h3>Desglose por inquilino</h3>
    <table><thead><tr><th>#</th><th>Inquilino</th><th class="c">Pagos</th>${servicios.map(s => `<th class="n">${esc(s.icon)} ${esc(s.label)}</th>`).join("")}<th class="n">Total</th></tr></thead>
    <tbody>${porInquilino.map((g, i) => `<tr><td class="muted">${i + 1}</td><td><b>${esc(g.inquilino)}</b></td><td class="c">${g.pagos}</td>
      ${servicios.map(s => `<td class="n">${g.montos[s.id] ? fmtMoney(g.montos[s.id]) : "—"}</td>`).join("")}<td class="n"><b>${fmtMoney(g.total)}</b></td></tr>`).join("")}</tbody>
    <tfoot><tr><td></td><td>Total</td><td class="c">${cantidad}</td>${porServicio.map(({ monto }) => `<td class="n">${fmtMoney(monto)}</td>`).join("")}<td class="n">${fmtMoney(total)}</td></tr></tfoot></table>`;
  return abrirImpresion(`Resumen financiero — ${cfg.orgNombre}`, documento(cfg, { titulo: "Resumen financiero", sub: rango, contenido }), { cfg });
}

// Datos comunes del informe de liquidación (HTML y PDF).
// `personas` es la lista completa: el informe usa a quienes participaron en esa liquidación.
export function datosInformeLiquidacion({ clave, liq, servicios, personas, pagos }) {
  const { label, mes, anio } = periodoDeKey(clave);
  const gente = personasDeLiquidacion(liq, personas);
  const totInq = totalesPorPersona(liq, servicios, gente);
  const srv = serviciosDeLiq(liq);
  const pagado = p => montoPagado(pagos, p, mes, anio) > 0;
  const filas = gente.map(p => {
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
    const tf = totalFactorServicio(s, liq, gente);
    return { s, reparto, total: Number(srv[s.id].totalFactura), totalFactor: tf, precio: tf ? Math.round(Number(srv[s.id].totalFactura) / tf * 100) / 100 : null };
  });
  return {
    label, filas, totalesServicio, tarifasLineas,
    total: Object.values(totInq).reduce((s, i) => s + i.total, 0),
    pagados: filas.filter(f => f.pagado).length,
    pendientes: filas.filter(f => !f.pagado).length,
  };
}

const etiquetaReparto = r => (r === SEReparto.HABITACIONES ? "por habitaciones" : r === SEReparto.PERSONAS ? "por personas" : "monto por inquilino");
const unidad = r => (r === SEReparto.HABITACIONES ? "hab." : "pers.");

export function imprimirLiquidacion({ cfg, servicios, ...args }) {
  const d = datosInformeLiquidacion({ servicios, ...args });
  const usados = servicios.filter(s => d.totalesServicio[s.id] > 0);
  const cobrado = d.filas.filter(f => f.pagado).reduce((s, f) => s + f.total, 0);
  const tarifas = d.tarifasLineas.map(t => `<div class="tarifa"><span><span class="n">${esc(t.s.icon)} ${esc(t.s.label)}</span>
      <span class="d">${etiquetaReparto(t.reparto)}${t.totalFactor ? ` · ${fmtNum(t.totalFactor)} ${unidad(t.reparto)} · Bs.- ${fmtPrecio(t.precio)}/${unidad(t.reparto)}` : ""}</span></span>
      <b class="num">${bs(t.total)}</b></div>`).join("");
  const contenido = `<div class="kpis">${kpi("Total liquidado", bs(d.total), "hl")}${kpi("Cobrado", bs(cobrado), "ok")}${kpi("Pagados", `${d.pagados} / ${d.filas.length}`)}${kpi("Pendientes", d.pendientes, d.pendientes ? "bad" : "")}</div>
    ${tarifas ? `<h3>Facturas del período</h3><div class="tarifas">${tarifas}</div>` : ""}
    <h3>Detalle por inquilino</h3>
    <table><thead><tr><th>Inquilino</th><th class="c">Hab.</th><th class="c">Pers.</th>${usados.map(s => `<th class="n">${esc(s.icon)} ${esc(s.label)}</th>`).join("")}<th class="n">Total</th><th class="c">Estado</th></tr></thead>
      <tbody>${d.filas.map(f => `<tr><td><b>${esc(f.nombre) || "—"}</b>${f.inmueble ? `<span class="sm">${esc(f.inmueble)}</span>` : ""}</td>
        <td class="c">${f.hab}</td><td class="c">${f.pers}</td>
        ${usados.map(s => `<td class="n">${f.detalles[s.id] > 0 ? bs(f.detalles[s.id]) : "—"}</td>`).join("")}
        <td class="n"><b>${bs(f.total)}</b></td><td class="c"><span class="pill ${f.pagado ? "ok" : "warn"}">${f.pagado ? "Pagado" : "Pendiente"}</span></td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Totales</td><td></td><td></td>${usados.map(s => `<td class="n">${bs(d.totalesServicio[s.id])}</td>`).join("")}<td class="n">${bs(d.total)}</td><td></td></tr></tfoot></table>`;
  return abrirImpresion(`Liquidación ${d.label} — ${cfg.orgNombre}`,
    documento(cfg, { titulo: "Informe de liquidación", sub: esc(d.label), contenido }), { cfg, imprimir: false });
}
