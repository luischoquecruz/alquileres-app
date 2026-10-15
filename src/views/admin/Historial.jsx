import { fmtMoney, fmtDate } from "../../lib/format.js";
import { BotonWhatsApp, PageHeader, Vacio } from "../../ui.jsx";
import { compartirWhatsApp, textoPagos, textoRecibo } from "../../lib/whatsapp.js";
import { imprimirRecibo, imprimirPagos } from "../../print/reportes.js";
import FiltrosPagos from "./FiltrosPagos.jsx";

export default function Historial({ cfg, pagos, personas = [], filtrados, filtros, setFiltros, servicios, acciones, cargando, esLocal, notificar }) {
  const total = filtrados.reduce((s, i) => s + Number(i.total || 0), 0);
  const ordenados = [...filtrados].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || Number(b.id) - Number(a.id));
  const bloqueada = () => notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");

  const telefonoDe = pago => personas.find(p => String(p.id) === String(pago.personaId))?.telefono;
  const enviarRecibo = pago => compartirWhatsApp({ texto: textoRecibo({ cfg, pago, servicios }), telefono: telefonoDe(pago), codigoPais: cfg.codigoPais });
  const compartirFiltrados = () => compartirWhatsApp({ texto: textoPagos({ cfg, pagos: ordenados, total, desde: filtros.desde, hasta: filtros.hasta }), codigoPais: cfg.codigoPais });

  const eliminar = s => {
    if (!confirm(`¿Eliminar el pago de ${s.inquilino} (${s.periodoMes} ${s.periodoAnio}, Bs.- ${fmtMoney(s.total)})?`)) return;
    acciones.eliminarPago(s.id);
  };

  return (
    <div>
      <PageHeader title="Historial de pagos" sub={`${pagos.length} registro(s) en total${esLocal ? " · ⚠ modo local" : ""}`}>
        <button className="btn btn-secondary" onClick={() => imprimirPagos({ cfg, pagos: ordenados, total }) || bloqueada()} disabled={!filtrados.length}>
          🖨️ Imprimir filtrados
        </button>
        {filtrados.length > 0 && <BotonWhatsApp onCompartir={compartirFiltrados} notificar={notificar} title="Compartir el listado filtrado por WhatsApp">Compartir</BotonWhatsApp>}
      </PageHeader>

      <FiltrosPagos filtros={filtros} setFiltros={setFiltros} metodos={cfg.metodosPago} />

      {filtrados.length > 0 && (
        <div className="row-between small secondary" style={{ margin: "0 4px 10px" }}>
          <span>{filtrados.length} pago(s) en el filtro</span>
          <span>Total <strong className="num text-ok">Bs.- {fmtMoney(total)}</strong></span>
        </div>
      )}

      {cargando && pagos.length === 0 ? <Vacio icon="⏳">Cargando…</Vacio>
        : pagos.length === 0 ? <Vacio icon="🧾">Sin registros de pago</Vacio>
        : filtrados.length === 0 ? <Vacio icon="🔎">Sin pagos con estos filtros. Pruebe ampliar el rango de fechas.</Vacio>
        : (
          <div className="list">
            {ordenados.map(s => (
              <article key={s.id} className="card list-item">
                <div className="grow">
                  <div className="row-between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                    <div className="item-title">{s.inquilino}</div>
                    <div className="strong num text-ok" style={{ fontSize: 17 }}>Bs.- {fmtMoney(s.total)}</div>
                  </div>
                  <div className="badges" style={{ marginTop: 8 }}>
                    <span className="badge badge-pink">{s.periodoMes} {s.periodoAnio}</span>
                    <span className="badge">{fmtDate(s.fecha)}</span>
                    <span className="badge badge-info">{cfg.metodosIconos[s.metodo] || "💳"} {s.metodo}</span>
                    <span className={`badge ${s.estado === "Pendiente" ? "badge-warn" : "badge-ok"}`}>{s.estado || "Pagado"}</span>
                  </div>
                  {s.notas && <div className="xsmall" style={{ color: "var(--text-comment)", fontStyle: "italic", marginTop: 6 }}>“{s.notas}”</div>}
                </div>
                <div className="actions" style={{ flexDirection: "column" }}>
                  <BotonWhatsApp soloIcono className="btn-sm" onCompartir={() => enviarRecibo(s)} notificar={notificar} title="Enviar recibo por WhatsApp" />
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={() => imprimirRecibo({ cfg, pago: s, servicios }) || bloqueada()} aria-label="Imprimir recibo" title="Imprimir recibo">🖨️</button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => eliminar(s)} aria-label="Eliminar pago" title="Eliminar pago">✕</button>
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
