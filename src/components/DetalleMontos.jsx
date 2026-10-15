import { SEReparto, serviciosDeLiq } from "../lib/calculos.js";
import { labelReparto } from "../hooks/useMontos.js";
import { fmtMoney, fmtNum, fmtPrecio } from "../lib/format.js";

export default function DetalleMontos({ liqPeriodo, periodoLabel, calculo }) {
  const srvLiq = serviciosDeLiq(liqPeriodo);
  return (
    <div className="stack-sm">
      <div className="row-between">
        <div className="strong">Detalle de montos</div>
        {liqPeriodo && <span className="badge badge-accent">Liquidación {periodoLabel}</span>}
      </div>
      <div className="card" style={{ boxShadow: "none" }}>
        {calculo.servicios.map(s => {
          const liq = srvLiq[s.id];
          if (!liq) {
            return (
              <div key={s.id} className="list-item muted small" style={{ borderBottom: "1px solid var(--border-light)" }}>
                {s.icon} {s.label} — sin datos de liquidación
              </div>
            );
          }
          const r = liq.reparto || s.reparto;
          const d = calculo.detalles[s.id];
          const reparte = r !== SEReparto.UNIDAD;
          return (
            <div key={s.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)" }}>
              <div className="row-between" style={{ flexWrap: "nowrap" }}>
                <div className="grow">
                  <div className="strong">{s.icon} {s.label}</div>
                  <span className="xsmall muted">{labelReparto(r)}</span>
                </div>
                <div className="strong num" style={{ fontSize: 16 }}>Bs.- {fmtMoney(d.monto)}</div>
              </div>
              {reparte && d.totalFactor > 0 && (
                <div className="xsmall muted" style={{ marginTop: 4 }}>
                  Factura Bs.- {fmtMoney(liq.totalFactura)} × {fmtNum(d.factor)}/{fmtNum(d.totalFactor)} {r === SEReparto.HABITACIONES ? "hab." : "pers."}
                  {" · "}Bs.- {fmtPrecio(d.precio)} por {r === SEReparto.HABITACIONES ? "hab." : "pers."}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="total-box">
        <div className="total-label">Total a pagar</div>
        <div className="total-value">Bs.- {fmtMoney(calculo.total)}</div>
      </div>
    </div>
  );
}
