import { useState } from "react";
import { mesActual, anioActual, periodoKey, periodoDeKey, fmtNum } from "../../lib/format.js";
import { Field, Mensaje, PageHeader, PeriodoSelector, Vacio } from "../../ui.jsx";

// Tarifa = monto total de la factura del servicio en el período (y, opcional, el consumo registrado).
export default function VistaTarifas({ tarifas, servicios, acciones }) {
  const [mes, setMes] = useState(mesActual());
  const [anio, setAnio] = useState(anioActual());
  const key = periodoKey(mes, anio);
  const guardado = tarifas[key];
  const [edit, setEdit] = useState(() => ({ ...(guardado || {}) }));
  const [origen, setOrigen] = useState({ key, guardado });
  const [msg, setMsg] = useState("");

  // Al cambiar de período (o al llegar datos del servidor) se carga lo guardado
  if (origen.key !== key || origen.guardado !== guardado) {
    setOrigen({ key, guardado });
    setEdit({ ...(guardado || {}) });
  }

  const guardar = async () => {
    const limpio = {};
    Object.entries(edit).forEach(([k, v]) => { if (v !== "" && v !== undefined && !isNaN(Number(v))) limpio[k] = Number(v); });
    const r = await acciones.guardarTarifa(key, limpio);
    if (r) { setMsg(`✅ Tarifas guardadas para ${mes} ${anio}`); setTimeout(() => setMsg(""), 3000); }
  };

  const cambiarPeriodo = (m, a) => { setMes(m); setAnio(Number(a)); };
  const cargarPeriodo = k => {
    const p = periodoDeKey(k);
    cambiarPeriodo(p.mes, p.anio);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <PageHeader title="Tarifas" sub="Ingrese el total de cada factura del mes. La liquidación lo reparte entre los inquilinos." />

      <div className="card">
        <div className="card-body stack">
          <div className="field">
            <div className="row-between">
              <span className="label">Período</span>
              <span className={`badge ${guardado ? "badge-ok" : "badge-warn"}`}>{guardado ? "✅ Configurado" : "⚠️ Sin configurar"}</span>
            </div>
            <PeriodoSelector mes={mes} anio={anio} onChange={cambiarPeriodo} periodos={Object.keys(tarifas)} etiquetaPeriodos="Cargados:" />
          </div>

          <div className="stack-sm">
            {servicios.map(s => (
              <div key={s.id} className="card" style={{ boxShadow: "none", background: "var(--bg-muted)", padding: 14 }}>
                <div className="strong" style={{ marginBottom: 10 }}>{s.icon} {s.label}</div>
                <div className="form-grid-2" style={!s.unit ? { gridTemplateColumns: "1fr" } : undefined}>
                  <Field as="div" label="Total factura">
                    <div className="input-group">
                      <span className="addon">Bs.-</span>
                      <input className="input input-num" type="number" inputMode="decimal" aria-label={`Monto ${s.label}`} value={edit[s.id] ?? ""}
                        onChange={e => setEdit(prev => ({ ...prev, [s.id]: e.target.value }))} min="0" step="0.1" placeholder="0" />
                    </div>
                  </Field>
                  {s.unit && (
                    <Field as="div" label="Consumo (opcional)">
                      <div className="input-group">
                        <input className="input input-num" type="number" inputMode="decimal" aria-label={`Consumo ${s.label}`} value={edit[s.id + "_consumo"] ?? ""}
                          onChange={e => setEdit(prev => ({ ...prev, [s.id + "_consumo"]: e.target.value }))} min="0" step="1" placeholder="0" />
                        <span className="addon">{s.unit}</span>
                      </div>
                    </Field>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-footer stack-sm">
          {msg && <Mensaje>{msg}</Mensaje>}
          <button className="btn btn-primary btn-lg btn-block" onClick={guardar}>💾 Guardar tarifas para {mes} {anio}</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Historial de tarifas</h2>
        {Object.keys(tarifas).length === 0 ? <Vacio icon="💰">No hay tarifas configuradas aún</Vacio> : (
          <div className="table-wrap table-stack">
            <table className="table">
              <thead>
                <tr>
                  <th>Período</th>
                  {servicios.map(s => <th key={s.id} className="r">{s.icon} {s.label}</th>)}
                  <th className="c">Acción</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tarifas).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => (
                  <tr key={k} className={k === key ? "is-current" : undefined}>
                    <td className="cell-head strong">{periodoDeKey(k).label}</td>
                    {servicios.map(s => (
                      <td key={s.id} className="r num" data-label={`${s.icon} ${s.label}`}>
                        <span>
                          {v[s.id] ? `Bs.- ${fmtNum(v[s.id])}` : "—"}
                          {v[s.id + "_consumo"] ? <span className="xsmall muted" style={{ display: "block" }}>{fmtNum(v[s.id + "_consumo"])} {s.unit}</span> : null}
                        </span>
                      </td>
                    ))}
                    <td className="c" data-label="">
                      <button className="btn btn-secondary btn-sm" onClick={() => cargarPeriodo(k)}>✏️ Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
