import { useMemo } from "react";
import { fmtMoney, periodoKey, periodoDeKey, meses } from "../../lib/format.js";
import { BotonWhatsApp, PageHeader, Vacio } from "../../ui.jsx";
import { compartirWhatsApp, textoInformeFinanciero } from "../../lib/whatsapp.js";
import { imprimirInformeFinanciero } from "../../print/reportes.js";
import FiltrosPagos from "./FiltrosPagos.jsx";

const COLORES = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#dc2626", "#65a30d", "#4f46e5", "#0d9488", "#ea580c", "#9333ea"];
const montoDe = (pago, sid) => Number(pago.montos?.[sid] ?? pago[sid]) || 0;

export default function InformeFinanciero({ cfg, filtrados, filtros, setFiltros, servicios, notificar }) {
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

  const datosInforme = () => ({
    cfg, filtros, total: totalGeneral, cantidad: filtrados.length, metodoComun, periodosGrafico: grafico?.periodos || [],
    porServicio: svActivos.map(s => ({ s, monto: totalesServicios[s.id] })), porInquilino, servicios: svActivos,
  });
  const imprimir = () => {
    if (!imprimirInformeFinanciero(datosInforme())) notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");
  };
  const compartir = () => compartirWhatsApp({ texto: textoInformeFinanciero(datosInforme()), codigoPais: cfg.codigoPais });

  return (
    <div className="stack" style={{ gap: 20 }}>
      <PageHeader title="Resumen Financiero" sub="Cobros del rango de fechas filtrado.">
        {filtrados.length > 0 && (
          <div className="row no-print">
            <button className="btn btn-secondary" onClick={imprimir}>🖨️ Imprimir informe</button>
            <BotonWhatsApp onCompartir={compartir} notificar={notificar} title="Compartir el resumen por WhatsApp">Compartir</BotonWhatsApp>
          </div>
        )}
      </PageHeader>
      <div className="no-print" style={{ marginBottom: -4 }}><FiltrosPagos filtros={filtros} setFiltros={setFiltros} metodos={cfg.metodosPago} /></div>

      <div className="stats">
        <div className="card stat"><div className="stat-label">Monto total</div><div className="stat-value text-ok">Bs.- {fmtMoney(totalGeneral)}</div></div>
        <div className="card stat"><div className="stat-label">Pagos</div><div className="stat-value">{filtrados.length}</div></div>
        <div className="card stat"><div className="stat-label">Inquilinos</div><div className="stat-value">{porInquilino.length}</div></div>
        <div className="card stat"><div className="stat-label">Método común</div><div className="stat-value truncate" style={{ fontSize: 18 }}>{metodoComun}</div></div>
      </div>

      {svActivos.length > 0 && (
        <div className="stats">
          {svActivos.map((sv, si) => (
            <div key={sv.id} className="card stat" style={{ borderLeft: `4px solid ${COLORES[si % COLORES.length]}` }}>
              <div className="stat-label">{sv.icon} {sv.label}</div>
              <div className="stat-value" style={{ fontSize: 19 }}>Bs.- {fmtMoney(totalesServicios[sv.id])}</div>
            </div>
          ))}
        </div>
      )}

      {grafico && grafico.periodos.length > 0 && (
        <div className="card card-body">
          <div className="card-title" style={{ marginBottom: 14 }}>Cobrado por período y servicio</div>
          <div className="chart" role="img" aria-label="Gráfico de barras de lo cobrado por período">
            {grafico.periodos.map(per => (
              <div key={per.key} className="chart-col" title={`${per.label}: Bs.- ${fmtMoney(per.total)}`}>
                <div className="xsmall strong num" style={{ marginBottom: 4 }}>{fmtMoney(per.total)}</div>
                <div className="chart-bar">
                  {svActivos.map((sv, si) => {
                    const h = (per.vals[sv.id] / grafico.max) * 170;
                    return h > 0 ? <div key={sv.id} title={`${sv.label}: Bs.- ${fmtMoney(per.vals[sv.id])}`} style={{ height: h, background: COLORES[si % COLORES.length], borderTop: "2px solid var(--bg-card)" }} /> : null;
                  })}
                </div>
                <div className="xsmall muted" style={{ marginTop: 6, textAlign: "center" }}>{per.label}</div>
              </div>
            ))}
          </div>
          <div className="legend">
            {svActivos.map((sv, si) => (
              <span key={sv.id}><i className="legend-dot" style={{ background: COLORES[si % COLORES.length] }} />{sv.icon} {sv.label}</span>
            ))}
          </div>
        </div>
      )}

      {filtrados.length === 0 ? <Vacio icon="📊">Sin pagos en el período</Vacio> : (
        <div>
          <h2 className="section-title">Desglose por inquilino</h2>
          <div className="table-wrap table-stack">
            <table className="table">
              <thead>
                <tr>
                  <th>Inquilino</th>
                  <th className="c">Pagos</th>
                  {svActivos.map(sv => <th key={sv.id} className="r">{sv.icon} {sv.label}</th>)}
                  <th className="r">Total</th>
                </tr>
              </thead>
              <tbody>
                {porInquilino.map((g, i) => (
                  <tr key={i}>
                    <td className="cell-head strong">{g.inquilino}</td>
                    <td className="c num" data-label="Pagos">{g.pagos}</td>
                    {svActivos.map(sv => <td key={sv.id} className="r num" data-label={`${sv.icon} ${sv.label}`}>{g.montos[sv.id] ? fmtMoney(g.montos[sv.id]) : "—"}</td>)}
                    <td className="r num strong text-accent" data-label="Total">{fmtMoney(g.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="cell-head">TOTAL</td>
                  <td className="c num" data-label="Pagos">{filtrados.length}</td>
                  {svActivos.map(sv => <td key={sv.id} className="r num" data-label={`${sv.icon} ${sv.label}`}>{fmtMoney(totalesServicios[sv.id])}</td>)}
                  <td className="r num text-accent" data-label="Total">{fmtMoney(totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
