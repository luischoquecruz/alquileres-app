// PDF del informe de liquidación. jsPDF se carga solo cuando se pide un PDF (≈400 kB menos en la carga inicial).
import { fmtMoney, fmtNum, fmtPrecio } from "../lib/format.js";
import { SEReparto } from "../lib/calculos.js";
import { datosInformeLiquidacion } from "./reportes.js";

export async function descargarPdfLiquidacion(ctx) {
  const { doc, nombre } = await generarPdfLiquidacion(ctx);
  doc.save(nombre);
}

// El PDF como archivo, para adjuntarlo al compartir (WhatsApp desde el celular).
export async function archivoPdfLiquidacion(ctx) {
  const { doc, nombre } = await generarPdfLiquidacion(ctx);
  return new File([doc.output("blob")], nombre, { type: "application/pdf" });
}

const rgb = (hex, def) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ""));
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : def;
};
// jsPDF con las fuentes estándar no dibuja emojis: se quitan de los textos
const sinEmoji = s => String(s ?? "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}|\u{200D}/gu, "").trim();
const unidad = r => (r === SEReparto.HABITACIONES ? "hab." : "pers.");
const etiquetaReparto = r => (r === SEReparto.HABITACIONES ? "por habitaciones" : r === SEReparto.PERSONAS ? "por personas" : "monto por inquilino");

async function generarPdfLiquidacion({ cfg, servicios, ...args }) {
  const [{ jsPDF }, { applyPlugin }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  applyPlugin(jsPDF);

  const d = datosInformeLiquidacion({ servicios, ...args });
  const usados = servicios.filter(s => d.totalesServicio[s.id] > 0);
  const cobrado = d.filas.filter(f => f.pagado).reduce((s, f) => s + f.total, 0);
  const bs = n => `Bs. ${fmtMoney(n)}`;

  const P = rgb(cfg.colorPrimario, [6, 95, 70]);
  const A = rgb(cfg.colorAcento, [5, 150, 105]);
  const TX = [15, 23, 42], MU = [100, 116, 139], BD = [226, 232, 240], BG = [248, 250, 252];
  const OK = [4, 120, 87], WARN = [146, 64, 14], OKBG = [209, 250, 229], WARNBG = [254, 243, 199];

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: usados.length > 4 ? "landscape" : "portrait" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;

  // Banda de encabezado con una franja del color de acento
  doc.setFillColor(...P); doc.rect(0, 0, pw, 32, "F");
  doc.setFillColor(...A); doc.rect(0, 32, pw, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(sinEmoji(`${cfg.orgNombre} · ${cfg.orgSubtitulo}`).toUpperCase(), m, 11);
  doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text("Informe de liquidación", m, 20);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(d.label, m, 27);
  doc.setFontSize(8);
  doc.text("Emitido el", pw - m, 20, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }), pw - m, 25, { align: "right" });

  // Recuadros de resumen
  let y = 40;
  const kpis = [["TOTAL LIQUIDADO", bs(d.total), true], ["COBRADO", bs(cobrado)], ["PAGADOS", `${d.pagados} / ${d.filas.length}`], ["PENDIENTES", String(d.pendientes)]];
  const gap = 4, kw = (pw - m * 2 - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach(([l, v, hl], i) => {
    const x = m + i * (kw + gap);
    doc.setDrawColor(...(hl ? P : BD)); doc.setFillColor(...(hl ? P : BG));
    doc.roundedRect(x, y, kw, 16, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...(hl ? [220, 252, 231] : MU));
    doc.text(l, x + 4, y + 5.5);
    doc.setFontSize(12); doc.setTextColor(...(hl ? [255, 255, 255] : i === 3 && d.pendientes ? [185, 28, 28] : i === 1 ? OK : TX));
    doc.text(v, x + 4, y + 12.5);
  });
  y += 24;

  // Facturas del período
  if (d.tarifasLineas.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...P);
    doc.text("FACTURAS DEL PERÍODO", m, y); y += 3;
    doc.autoTable({
      startY: y, margin: { left: m, right: m }, theme: "plain",
      head: [["Servicio", "Reparto", "Precio unitario", "Factura"]],
      body: d.tarifasLineas.map(t => [
        sinEmoji(t.s.label),
        `${etiquetaReparto(t.reparto)}${t.totalFactor ? ` (${fmtNum(t.totalFactor)} ${unidad(t.reparto)})` : ""}`,
        t.totalFactor ? `Bs. ${fmtPrecio(t.precio)} / ${unidad(t.reparto)}` : "—",
        bs(t.total),
      ]),
      styles: { fontSize: 8, cellPadding: 1.8, textColor: TX },
      headStyles: { textColor: MU, fontStyle: "bold", fontSize: 7, lineWidth: { bottom: 0.4 }, lineColor: P },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
      didParseCell(c) {
        if (c.section === "body") { c.cell.styles.lineWidth = { bottom: 0.1 }; c.cell.styles.lineColor = BD; }
        if (c.column.index >= 2) c.cell.styles.halign = "right";
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Detalle por inquilino
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...P);
  doc.text("DETALLE POR INQUILINO", m, y); y += 3;
  const columns = [
    { header: "Inquilino", dataKey: "nombre" },
    { header: "Hab.", dataKey: "hab" },
    { header: "Pers.", dataKey: "pers" },
    ...usados.map(s => ({ header: sinEmoji(s.label), dataKey: `srv_${s.id}` })),
    { header: "Total", dataKey: "total" },
    { header: "Estado", dataKey: "estado" },
  ];
  const body = d.filas.map(f => ({
    nombre: sinEmoji(f.nombre) + (f.inmueble ? `\n${sinEmoji(f.inmueble)}` : ""), hab: f.hab, pers: f.pers,
    total: bs(f.total), estado: f.pagado ? "Pagado" : "Pendiente",
    ...Object.fromEntries(usados.map(s => [`srv_${s.id}`, f.detalles[s.id] > 0 ? bs(f.detalles[s.id]) : "—"])),
  }));
  const foot = [{
    nombre: "Totales", hab: "", pers: "", total: bs(d.total), estado: "",
    ...Object.fromEntries(usados.map(s => [`srv_${s.id}`, bs(d.totalesServicio[s.id])])),
  }];
  const numCols = Object.fromEntries([...usados.map(s => `srv_${s.id}`), "total"].map(k => [k, { halign: "right" }]));

  doc.autoTable({
    columns, body, foot, startY: y, margin: { left: m, right: m, bottom: 18 }, theme: "plain", showFoot: "lastPage",
    styles: { fontSize: 8, cellPadding: 2, textColor: TX, valign: "middle" },
    headStyles: { textColor: MU, fontStyle: "bold", fontSize: 7, lineWidth: { bottom: 0.5 }, lineColor: P },
    footStyles: { fillColor: BG, fontStyle: "bold", textColor: TX, lineWidth: { top: 0.4 }, lineColor: TX },
    alternateRowStyles: { fillColor: [251, 252, 253] },
    columnStyles: { nombre: { fontStyle: "bold" }, hab: { halign: "center", cellWidth: 10 }, pers: { halign: "center", cellWidth: 10 }, estado: { halign: "center", cellWidth: 22 }, ...numCols, total: { halign: "right", fontStyle: "bold" } },
    didParseCell(c) {
      if (c.section === "body") { c.cell.styles.lineWidth = { bottom: 0.1 }; c.cell.styles.lineColor = BD; }
      if (c.section === "body" && c.column.dataKey === "estado") {
        const ok = c.cell.raw === "Pagado";
        c.cell.styles.textColor = ok ? OK : WARN;
        c.cell.styles.fillColor = ok ? OKBG : WARNBG;
        c.cell.styles.fontStyle = "bold";
        c.cell.styles.fontSize = 7;
      }
      ["hab", "pers", "estado"].forEach(k => { if (c.column.dataKey === k && c.section !== "body") c.cell.styles.halign = "center"; });
      if (c.section !== "body" && (c.column.dataKey === "total" || String(c.column.dataKey).startsWith("srv_"))) c.cell.styles.halign = "right";
    },
  });

  // Pie en todas las páginas
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BD); doc.line(m, ph - 12, pw - m, ph - 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MU);
    doc.text(sinEmoji(`${cfg.orgNombre} — ${cfg.appTitulo || "Alquileres"}`), m, ph - 7.5);
    doc.text(`Página ${i} de ${pages}`, pw - m, ph - 7.5, { align: "right" });
  }
  return { doc, nombre: `Liquidacion-${d.label.replace(/[^a-zA-Z0-9]/g, "_")}.pdf` };
}
