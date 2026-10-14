import { useMemo } from "react";
import { fmtMoney, periodoKey, periodoDeKey, meses } from "../../lib/format.js";
import { useMobile } from "../../hooks/useMobile.js";
import { Vacio } from "../../ui.jsx";
import FiltrosPagos from "./FiltrosPagos.jsx";

const COLORES = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6", "#e11d48", "#84cc16"];
const montoDe = (pago, sid) => Number(pago.montos?.[sid] ?? pago[sid]) || 0;
const thS = { padding: "7px 8px", fontWeight: 600, fontSize: 10, letterSpacing: .5, textTransform: "uppercase" };
const tdS = { padding: "6px 8px", borderBottom: "1px solid var(--border-light)" };

export default function InformeFinanciero({ cfg, filtrados, filtros, setFiltros, servicios }) {
  const isMobile = useMobile();
  const totalGeneral = filtrados.reduce((s, i) => s + Number(i.total || 0), 0);

  const totalesServicios = useMemo(() => Object.fromEntries(servicios.map(sv => [sv.id, filtrados.reduce((sum, p) => sum + montoDe(p, sv.id), 0)])), [filtrados, servicios]);
  const svActivos = servicios.filter(sv => totalesServicios[sv.id] > 0);

  const grafico = useMemo(() => {
    if (!svActivos.length) return null;
    const grupos = {};
    filtrados.forEach(p => {
      if (!meses.includes(p.periodoMes) || !p.periodoAnio) return;
      const k = periodoKey(p.periodoMes, p.periodoAnio);
      grupos[k] = grupos[k] || {};
      svActivos.forEach(sv => { grupos[k][sv.id] = (grupos[k][sv.id] || 0) + montoDe(p, sv.id); });
    });
    const periodos = Object.keys(grupos).sort().map(k => ({ key: k, label: periodoDeKey(k).label, vals: grupos[k], total: Object.values(grupos[k]).reduce((a, b) => a + b, 0) }));
    return { periodos, max: Math.max(...periodos.map(p => p.total), 1) };
  }, [filtrados, svActivos]);

  const porInquilino = useMemo(() => {
    const g = {};
    filtrados.forEach(p => {
      const k = p.personaId || p.inquilino;
      g[k] = g[k] || { inquilino: p.inquilino, pagos: 0, total: 0, montos: {} };
      g[k].pagos += 1;
      g[k].total += Number(p.total || 0);
      svActivos.forEach(sv => { g[k].montos[sv.id] = (g[k].montos[sv.id] || 0) + montoDe(p, sv.id); });
    });
    return Object.values(g).sort((a, b) => b.total - a.total);
  }, [filtrados, svActivos]);

  const metodoComun = (() => {
    const m = {};
    filtrados.forEach(s => { m[s.metodo] = (m[s.metodo] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  })();

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>Resumen Financiero</div>
      <div className="no-print"><FiltrosPagos filtros={filtros} setFiltros={setFiltros} metodos={cfg.metodosPago} /></div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Total pagos", val: filtrados.length, color: cfg.colorAcento, bg: "var(--bg-accent)" },
          { label: "Monto total", val: `Bs.- ${fmtMoney(totalGeneral)}`, color: "var(--tag-pagado-text)", bg: "var(--bg-success)" },
          { label: "Inquilinos únicos", val: porInquilino.length, color: "var(--tag-inquilino-text)", bg: "var(--tag-inquilino)" },
          { label: "Método común", val: metodoComun, color: "var(--tag-metodo-text)", bg: "var(--tag-metodo)" },
        ].map(m => (
          <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: "14px 8px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.val}</div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {svActivos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 130 : 160}px, 1fr))`, gap: 10, marginBottom: 18 }}>
          {svActivos.map(sv => (
            <div key={sv.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{sv.icon} {sv.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>Bs.- {fmtMoney(totalesServicios[sv.id])}</div>
            </div>
          ))}
        </div>
      )}

      {grafico && grafico.periodos.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 16, marginBottom: 18, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 12 }}>📈 Cobrado por período y servicio</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, minHeight: 200, paddingBottom: 8, overflowX: "auto" }}>
            {grafico.periodos.map(per => (
              <div key={per.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 50 }}
                title={`${per.label}: Bs.- ${fmtMoney(per.total)}`}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>{fmtMoney(per.total)}</div>
                <div style={{ display: "flex", flexDirection: "column-reverse", width: isMobile ? "100%" : "70%", height: 170 }}>
                  {svActivos.map((sv, si) => {
                    const h = (per.vals[sv.id] / grafico.max) * 170;
                    return h > 0 ? <div key={sv.id} title={`${sv.label}: Bs.- ${fmtMoney(per.vals[sv.id])}`} style={{ height: h, background: COLORES[si % COLORES.length], borderTop: "1px solid var(--bg-card)" }} /> : null;
                  })}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, textAlign: "center" }}>{per.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", paddingTop: 8, borderTop: "1px solid var(--border-light)" }}>
            {svActivos.map((sv, si) => (
              <div key={sv.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORES[si % COLORES.length] }} />{sv.icon} {sv.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {filtrados.length === 0 ? <Vacio>Sin pagos en el período</Vacio> : (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 8 }}>Desglose por Inquilino</div>
          <div style={{ overflowX: "auto", marginBottom: 18, borderRadius: 10, border: "1px solid var(--border-light)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, background: "var(--bg-card)", color: "var(--text-main)" }}>
              <thead>
                <tr style={{ background: cfg.colorPrimario, color: "#fff" }}>
                  <th style={thS}>#</th>
                  <th style={{ ...thS, textAlign: "left" }}>Inquilino</th>
                  <th style={thS}>Pagos</th>
                  {svActivos.map(sv => <th key={sv.id} style={{ ...thS, textAlign: "right" }}>{sv.icon} {sv.label}</th>)}
                  <th style={{ ...thS, textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {porInquilino.map((g, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-muted)" }}>
                    <td style={{ ...tdS, textAlign: "center", fontWeight: 700, color: cfg.colorAcento }}>{i + 1}</td>
                    <td style={tdS}>{g.inquilino}</td>
                    <td style={{ ...tdS, textAlign: "center", fontWeight: 700 }}>{g.pagos}</td>
                    {svActivos.map(sv => <td key={sv.id} style={{ ...tdS, textAlign: "right" }}>{g.montos[sv.id] ? fmtMoney(g.montos[sv.id]) : "—"}</td>)}
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: cfg.colorAcento }}>{fmtMoney(g.total)}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--bg-muted)", fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: "6px 8px", textAlign: "right" }}>TOTAL</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{filtrados.length}</td>
                  {svActivos.map(sv => <td key={sv.id} style={{ padding: "6px 8px", textAlign: "right" }}>{fmtMoney(totalesServicios[sv.id])}</td>)}
                  <td style={{ padding: "6px 8px", textAlign: "right", color: cfg.colorAcento }}>{fmtMoney(totalGeneral)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => window.print()} style={{ background: cfg.colorPrimario, color: "#fff", border: "none", borderRadius: 8, padding: "11px 26px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>🖨️ Imprimir informe</button>
          </div>
        </>
      )}
    </div>
  );
}
