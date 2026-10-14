import { fmtMoney, fmtDate } from "../../lib/format.js";
import { useMobile } from "../../hooks/useMobile.js";
import { btnPeligro } from "../../estilos.js";
import { Vacio } from "../../ui.jsx";
import { imprimirRecibo, imprimirPagos } from "../../print/reportes.js";
import FiltrosPagos from "./FiltrosPagos.jsx";

const tag = (bg, color) => ({ background: bg, color, borderRadius: 6, padding: "1px 8px", fontSize: 11 });

export default function Historial({ cfg, pagos, filtrados, filtros, setFiltros, servicios, acciones, cargando, esLocal, notificar }) {
  const isMobile = useMobile();
  const total = filtrados.reduce((s, i) => s + Number(i.total || 0), 0);
  const ordenados = [...filtrados].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || Number(b.id) - Number(a.id));
  const bloqueada = () => notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");

  const eliminar = s => {
    if (!confirm(`¿Eliminar el pago de ${s.inquilino} (${s.periodoMes} ${s.periodoAnio}, Bs.- ${fmtMoney(s.total)})?`)) return;
    acciones.eliminarPago(s.id);
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>Historial de pagos — {pagos.length} registro(s)</span>
        {esLocal && <span style={{ fontSize: 11, color: "var(--star)", background: "var(--bg-warning)", padding: "2px 8px", borderRadius: 6 }}>⚠ Modo local</span>}
        <button onClick={() => imprimirPagos({ cfg, pagos: ordenados, total }) || bloqueada()} disabled={!filtrados.length}
          style={{ marginLeft: "auto", background: cfg.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, opacity: filtrados.length ? 1 : .5 }}>
          🖨️ Imprimir filtrados
        </button>
      </div>
      <FiltrosPagos filtros={filtros} setFiltros={setFiltros} metodos={cfg.metodosPago} />
      {cargando && pagos.length === 0 ? <Vacio>Cargando...</Vacio>
        : pagos.length === 0 ? <Vacio>Sin registros de pago</Vacio>
        : filtrados.length === 0 ? <Vacio>Sin pagos con estos filtros</Vacio>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ordenados.map(s => (
              <div key={s.id} style={{ border: "1px solid var(--border-light)", borderRadius: 10, padding: isMobile ? 10 : 14, background: "var(--bg-card)", display: "flex", gap: isMobile ? 8 : 12, alignItems: "flex-start", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ background: "var(--bg-success)", borderRadius: 8, padding: isMobile ? 6 : "8px 10px", textAlign: "center", minWidth: isMobile ? 65 : 85, flexShrink: 0 }}>
                  <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 800, color: cfg.colorAcento }}>Bs.-</div>
                  <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "var(--tag-pagado-text)" }}>{fmtMoney(s.total)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
                    <span style={{ ...tag("var(--tag-pagado)", "var(--tag-pagado-text)"), fontWeight: 600 }}>✅ {s.estado || "Pagado"}</span>
                    <span style={tag("var(--bg-muted)", "var(--text-secondary)")}>{fmtDate(s.fecha)}</span>
                    <span style={tag("var(--tag-metodo)", "var(--tag-metodo-text)")}>{cfg.metodosIconos[s.metodo] || "💳"} {s.metodo}</span>
                    <span style={tag("var(--tag-inquilino)", "var(--tag-inquilino-text)")}>{s.periodoMes} {s.periodoAnio}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)" }}>{s.inquilino}</div>
                  {s.notas && <div style={{ fontSize: 11, color: "var(--text-comment)", fontStyle: "italic", marginTop: 2 }}>"{s.notas}"</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => imprimirRecibo({ cfg, pago: s, servicios }) || bloqueada()} aria-label="Imprimir recibo" title="Imprimir recibo"
                    style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer" }}>🖨️</button>
                  <button onClick={() => eliminar(s)} aria-label="Eliminar pago" style={btnPeligro}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
