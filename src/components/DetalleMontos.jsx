import { SEReparto, serviciosDeLiq } from "../lib/calculos.js";
import { labelReparto } from "../hooks/useMontos.js";
import { fmtMoney, fmtNum } from "../lib/format.js";

export default function DetalleMontos({ cfg, liqPeriodo, periodoLabel, calculo }) {
  const srvLiq = serviciosDeLiq(liqPeriodo);
  return (
    <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 10 }}>
        Detalle de montos
        {liqPeriodo && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>(Liquidación {periodoLabel})</span>}
      </div>
      {calculo.servicios.map(s => {
        const liq = srvLiq[s.id];
        if (!liq) {
          return (
            <div key={s.id} style={{ marginBottom: 6, opacity: .5, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
              {s.icon} {s.label} — Sin datos de liquidación
            </div>
          );
        }
        const r = liq.reparto || s.reparto;
        const d = calculo.detalles[s.id];
        const reparte = r !== SEReparto.UNIDAD;
        return (
          <div key={s.id} style={{ background: reparte ? "var(--bg-accent)" : "transparent", borderRadius: 10, padding: reparte ? "10px 12px" : "6px 0", marginBottom: reparte ? 8 : 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)" }}>{s.icon} {s.label}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6, background: "var(--bg-muted)", borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap" }}>{labelReparto(r)}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", whiteSpace: "nowrap" }}>Bs.- {fmtMoney(d.monto)}</div>
            </div>
            {reparte && d.totalFactor > 0 && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                Bs.- {fmtMoney(d.precio)} × {fmtNum(d.factor)} {r === SEReparto.HABITACIONES ? "hab." : "pers."} = Bs.- {fmtMoney(d.monto)}
                <span style={{ marginLeft: 6 }}>(factura Bs.- {fmtMoney(liq.totalFactura)} ÷ {fmtNum(d.totalFactor)})</span>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ background: "var(--bg-card)", border: "2px solid var(--tag-pagado-text)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-main)" }}>TOTAL A PAGAR</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: cfg.colorAcento }}>Bs.- {fmtMoney(calculo.total)}</div>
      </div>
    </div>
  );
}
