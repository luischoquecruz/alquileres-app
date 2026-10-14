// PDF del informe de liquidación. jsPDF se carga solo cuando se pide un PDF (≈400 kB menos en la carga inicial).
import { fmtMoney } from "../lib/format.js";
import { SEReparto } from "../lib/calculos.js";
import { datosInformeLiquidacion } from "./reportes.js";

export async function descargarPdfLiquidacion({ cfg, servicios, ...args }) {
  const [{ jsPDF }, { applyPlugin }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  applyPlugin(jsPDF);

  const d = datosInformeLiquidacion({ servicios, ...args });
  const bs = n => `Bs.- ${fmtMoney(n)}`;
  const corto = s => (s.label.length > 6 ? s.label.slice(0, 5).trim() + "." : s.label);

  const columns = [
    { header: "Inquilino", dataKey: "nombre" },
    { header: "Hab.", dataKey: "hab" },
    { header: "Pers.", dataKey: "pers" },
    ...servicios.map(s => ({ header: corto(s), dataKey: `srv_${s.id}` })),
    { header: "Total", dataKey: "total" },
    { header: "Estado", dataKey: "estado" },
  ];
  const rows = d.filas.map(f => ({
    nombre: f.nombre, hab: f.hab, pers: f.pers, total: bs(f.total), estado: f.pagado ? "Pagado" : "Pendiente",
    ...Object.fromEntries(servicios.map(s => [`srv_${s.id}`, f.detalles[s.id] > 0 ? bs(f.detalles[s.id]) : ""])),
  }));
  rows.push({
    nombre: "Totales", hab: "", pers: "", total: bs(d.total), estado: "",
    ...Object.fromEntries(servicios.map(s => [`srv_${s.id}`, d.totalesServicio[s.id] > 0 ? bs(d.totalesServicio[s.id]) : ""])),
  });

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pw = doc.internal.pageSize.getWidth();
  const green = [6, 95, 70];
  const margin = 14;

  doc.setFontSize(9); doc.setTextColor(...green);
  doc.text(cfg.orgNombre, pw / 2, 14, { align: "center" });
  doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(30, 41, 59);
  doc.text("Informe de Liquidación", pw / 2, 21, { align: "center" });
  doc.setFont(undefined, "normal"); doc.setFontSize(12); doc.setTextColor(100, 116, 139);
  doc.text(d.label, pw / 2, 28, { align: "center" });

  doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  doc.text("Total:", margin, 36);
  doc.setFont(undefined, "bold"); doc.text(bs(d.total), margin + 14, 36); doc.setFont(undefined, "normal");
  doc.setTextColor(...green); doc.text(`Pagado(s): ${d.pagados}`, margin + 65, 36);
  doc.setTextColor(180, 83, 9); doc.text(`Pendiente(s): ${d.pendientes}`, margin + 105, 36);

  let yStart = 44;
  if (d.tarifasLineas.length > 0) {
    yStart = 50;
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yStart - 4, pw - margin * 2, d.tarifasLineas.length * 5 + 10, 2, 2, "FD");
    doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(...green);
    doc.text("Tarifas del Periodo", margin + 4, yStart + 1);
    doc.setFont(undefined, "normal");
    yStart += 6;
    d.tarifasLineas.forEach((t, i) => {
      const rep = t.reparto === SEReparto.HABITACIONES ? "x hab." : t.reparto === SEReparto.PERSONAS ? "x pers." : "1 pago";
      doc.setTextColor(30, 41, 59); doc.text(`${t.s.label} (${rep})`, margin + 4, yStart + i * 5);
      doc.setTextColor(71, 85, 105); doc.text(bs(t.total), pw - margin - 4, yStart + i * 5, { align: "right" });
    });
    yStart += d.tarifasLineas.length * 5 + 4;
  }

  doc.autoTable({
    columns, body: rows, startY: yStart,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: green, fontSize: 7, halign: "center", textColor: 255 },
    bodyStyles: { textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { nombre: { halign: "left" }, hab: { halign: "center", cellWidth: 8 }, pers: { halign: "center", cellWidth: 8 }, total: { halign: "center" }, estado: { halign: "center" } },
    didParseCell(data) {
      if (data.section !== "body") return;
      if (data.column.dataKey === "estado") {
        data.cell.styles.textColor = data.cell.raw === "Pagado" ? [22, 163, 74] : [180, 83, 9];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [30, 41, 59];
      }
    },
  });

  const footer = `Documento generado el ${new Date().toLocaleDateString("es-ES")} — ${cfg.orgNombre} Alquileres`;
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(footer, pw / 2, doc.internal.pageSize.height - 10, { align: "center" });
  }
  doc.save(`Informe-${d.label.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
