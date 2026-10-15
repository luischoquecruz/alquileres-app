import { useMemo } from "react";
import { estadoCuenta } from "../../lib/calculos.js";
import { fmtMoney } from "../../lib/format.js";
import { Vacio } from "../../ui.jsx";
import { imprimirResumenPersonas } from "../../print/reportes.js";

const tdS = { padding: "6px 8px", textAlign: "center" };

export default function ResumenPersona({ cfg, datos, notificar }) {
  const { personas, servicios, liquidaciones, tarifas, pagos } = datos;
  const activas = useMemo(() => personas.filter(p => p.activo !== false), [personas]);

  const filas = useMemo(() => activas
    .map(p => ({ id: p.id, nombre: p.nombre, inmueble: p.inmueble, ...estadoCuenta(p, liquidaciones, servicios, activas, pagos) }))
    .filter(f => f.periodos.length > 0), [activas, liquidaciones, servicios, pagos]);

  const imprimir = () => {
    if (!imprimirResumenPersonas({ cfg, filas, servicios, tarifas, liquidaciones })) {
      notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");
    }
  };

  const colorSaldo = n => (n > 0 ? "var(--danger-text)" : "var(--tag-pagado-text)");

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>Resumen de pagos por persona</span>
        <button onClick={imprimir} disabled={!filas.length} style={{ marginLeft: "auto", background: cfg.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>🖨️ Imprimir</button>
      </div>
      {filas.length === 0 ? <Vacio>{personas.length === 0 ? "No hay personas registradas" : "No hay liquidaciones con montos para mostrar"}</Vacio> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filas.map(data => (
            <div key={data.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-light)", background: "var(--bg-muted)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-main)" }}>{data.nombre}</span>
                  {data.inmueble && <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-secondary)" }}>{data.inmueble}</span>}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, flexWrap: "wrap", color: "var(--text-main)" }}>
                  <span>Debe: <strong style={{ color: cfg.colorAcento }}>Bs.- {fmtMoney(data.totalDebe)}</strong></span>
                  <span>Pagado: <strong style={{ color: "var(--tag-pagado-text)" }}>Bs.- {fmtMoney(data.totalPagado)}</strong></span>
                  <span>Saldo: <strong style={{ color: colorSaldo(data.saldoTotal) }}>Bs.- {fmtMoney(data.saldoTotal)}</strong></span>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, color: "var(--text-main)" }}>
                  <thead>
                    <tr style={{ background: cfg.colorPrimario, color: "#fff" }}>
                      <th style={{ padding: "7px 8px", textAlign: "left", fontSize: 10 }}>Período</th>
                      {servicios.map(s => <th key={s.id} style={{ padding: "7px 8px", fontSize: 10 }}>{s.icon} {s.label}</th>)}
                      <th style={{ padding: "7px 8px", fontSize: 10 }}>Debe</th>
                      <th style={{ padding: "7px 8px", fontSize: 10 }}>Pagó</th>
                      <th style={{ padding: "7px 8px", fontSize: 10 }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.periodos.map(per => (
                      <tr key={per.key} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ ...tdS, textAlign: "left", fontWeight: 700 }}>{per.label}</td>
                        {servicios.map(s => (
                          <td key={s.id} style={{ ...tdS, color: per.detalles[s.id] > 0 ? "var(--text-main)" : "var(--text-muted)" }}>
                            {per.detalles[s.id] > 0 ? `Bs.- ${fmtMoney(per.detalles[s.id])}` : "—"}
                          </td>
                        ))}
                        <td style={{ ...tdS, fontWeight: 700, color: cfg.colorAcento }}>Bs.- {fmtMoney(per.debe)}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: "var(--tag-pagado-text)" }}>{per.pagado > 0 ? `Bs.- ${fmtMoney(per.pagado)}` : "—"}</td>
                        <td style={{ ...tdS, fontWeight: 700, color: colorSaldo(per.saldo) }}>{per.saldo > 0 ? `Bs.- ${fmtMoney(per.saldo)}` : "✅"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--bg-muted)", fontWeight: 700 }}>
                      <td style={{ ...tdS, textAlign: "left" }}>TOTAL</td>
                      {servicios.map(s => {
                        const t = data.periodos.reduce((sum, per) => sum + (per.detalles[s.id] || 0), 0);
                        return <td key={s.id} style={tdS}>{t > 0 ? `Bs.- ${fmtMoney(t)}` : "—"}</td>;
                      })}
                      <td style={{ ...tdS, color: cfg.colorAcento }}>Bs.- {fmtMoney(data.totalDebe)}</td>
                      <td style={{ ...tdS, color: "var(--tag-pagado-text)" }}>Bs.- {fmtMoney(data.totalPagado)}</td>
                      <td style={{ ...tdS, color: colorSaldo(data.saldoTotal) }}>Bs.- {fmtMoney(data.saldoTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
