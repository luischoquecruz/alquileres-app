import { useMemo, useState } from "react";
import { estadoCuenta } from "../../lib/calculos.js";
import { fmtMoney } from "../../lib/format.js";
import { PageHeader, Vacio } from "../../ui.jsx";
import { imprimirResumenPersonas } from "../../print/reportes.js";

const claseSaldo = n => (n > 0 ? "text-danger" : "text-ok");

export default function ResumenPersona({ cfg, datos, notificar }) {
  const { personas, servicios, liquidaciones, tarifas, pagos } = datos;
  const activas = useMemo(() => personas.filter(p => p.activo !== false), [personas]);
  const [abierto, setAbierto] = useState(null);
  const [soloDeuda, setSoloDeuda] = useState(false);

  const filas = useMemo(() => activas
    .map(p => ({ id: p.id, nombre: p.nombre, inmueble: p.inmueble, ...estadoCuenta(p, liquidaciones, servicios, activas, pagos) }))
    .filter(f => f.periodos.length > 0), [activas, liquidaciones, servicios, pagos]);
  const visibles = soloDeuda ? filas.filter(f => f.saldoTotal > 0) : filas;
  const deudaTotal = filas.reduce((s, f) => s + Math.max(0, f.saldoTotal), 0);

  const imprimir = () => {
    if (!imprimirResumenPersonas({ cfg, filas, servicios, tarifas, liquidaciones })) {
      notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <PageHeader title="Resumen por persona" sub="Estado de cuenta de cada inquilino según las liquidaciones.">
        <button className="btn btn-secondary" onClick={imprimir} disabled={!filas.length}>🖨️ Imprimir</button>
      </PageHeader>

      {filas.length > 0 && (
        <div className="stats">
          <div className="card stat"><div className="stat-label">Inquilinos</div><div className="stat-value">{filas.length}</div></div>
          <div className="card stat"><div className="stat-label">Con deuda</div><div className="stat-value text-danger">{filas.filter(f => f.saldoTotal > 0).length}</div></div>
          <div className="card stat"><div className="stat-label">Deuda total</div><div className="stat-value text-danger">Bs.- {fmtMoney(deudaTotal)}</div></div>
        </div>
      )}

      {filas.length > 0 && (
        <label className="check" style={{ minHeight: 0 }}>
          <input type="checkbox" checked={soloDeuda} onChange={e => setSoloDeuda(e.target.checked)} /> Mostrar solo quienes tienen saldo pendiente
        </label>
      )}

      {filas.length === 0 ? <Vacio icon="🧾">{personas.length === 0 ? "No hay personas registradas" : "No hay liquidaciones con montos para mostrar"}</Vacio>
        : visibles.length === 0 ? <Vacio icon="🎉">Nadie tiene saldo pendiente</Vacio>
        : (
          <div className="list">
            {visibles.map(data => {
              const exp = abierto === data.id;
              return (
                <div key={data.id} className="card">
                  <button type="button" className="collapse-trigger" onClick={() => setAbierto(exp ? null : data.id)} aria-expanded={exp}>
                    <div className="avatar" aria-hidden="true">{String(data.nombre || "?").charAt(0).toUpperCase()}</div>
                    <div className="grow">
                      <div className="item-title">{data.nombre}</div>
                      <div className="item-meta">{data.inmueble ? `${data.inmueble} · ` : ""}{data.periodos.length} período(s)</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className={`strong num ${claseSaldo(data.saldoTotal)}`}>{data.saldoTotal > 0 ? `Bs.- ${fmtMoney(data.saldoTotal)}` : "Al día ✅"}</div>
                      <div className="xsmall muted num">Pagó Bs.- {fmtMoney(data.totalPagado)}</div>
                    </div>
                    <span className="chevron" aria-hidden="true">▼</span>
                  </button>
                  {exp && (
                    <div style={{ padding: "0 14px 14px" }}>
                      <div className="table-wrap table-stack">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Período</th>
                              {servicios.map(s => <th key={s.id} className="r">{s.icon} {s.label}</th>)}
                              <th className="r">Debe</th>
                              <th className="r">Pagó</th>
                              <th className="r">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.periodos.map(per => (
                              <tr key={per.key}>
                                <td className="cell-head strong">{per.label}</td>
                                {servicios.map(s => (
                                  <td key={s.id} className="r num" data-label={`${s.icon} ${s.label}`}>{per.detalles[s.id] > 0 ? `Bs.- ${fmtMoney(per.detalles[s.id])}` : "—"}</td>
                                ))}
                                <td className="r num strong" data-label="Debe">Bs.- {fmtMoney(per.debe)}</td>
                                <td className="r num text-ok" data-label="Pagó">{per.pagado > 0 ? `Bs.- ${fmtMoney(per.pagado)}` : "—"}</td>
                                <td className={`r num strong ${claseSaldo(per.saldo)}`} data-label="Saldo">{per.saldo > 0 ? `Bs.- ${fmtMoney(per.saldo)}` : "✅"}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td className="cell-head">TOTAL</td>
                              {servicios.map(s => {
                                const t = data.periodos.reduce((sum, per) => sum + (per.detalles[s.id] || 0), 0);
                                return <td key={s.id} className="r num" data-label={`${s.icon} ${s.label}`}>{t > 0 ? `Bs.- ${fmtMoney(t)}` : "—"}</td>;
                              })}
                              <td className="r num" data-label="Debe">Bs.- {fmtMoney(data.totalDebe)}</td>
                              <td className="r num text-ok" data-label="Pagó">Bs.- {fmtMoney(data.totalPagado)}</td>
                              <td className={`r num ${claseSaldo(data.saldoTotal)}`} data-label="Saldo">Bs.- {fmtMoney(data.saldoTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
