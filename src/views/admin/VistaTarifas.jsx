import { useState } from "react";
import { meses, mesActual, anioActual, periodoKey, periodoDeKey, fmtNum } from "../../lib/format.js";
import { inp, inpNum, btnPrimario } from "../../estilos.js";
import { Label, Vacio } from "../../ui.jsx";

// Tarifa = monto total de la factura del servicio en el período (y, opcional, el consumo registrado).
export default function VistaTarifas({ cfg, tarifas, servicios, acciones }) {
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

  const servFact = servicios;

  const guardar = async () => {
    const limpio = {};
    Object.entries(edit).forEach(([k, v]) => { if (v !== "" && v !== undefined && !isNaN(Number(v))) limpio[k] = Number(v); });
    const r = await acciones.guardarTarifa(key, limpio);
    if (r) { setMsg(`✅ Tarifas guardadas para ${mes} ${anio}`); setTimeout(() => setMsg(""), 3000); }
  };

  const cargarPeriodo = k => {
    const { mes: m, anio: y } = periodoDeKey(k);
    setMes(m);
    setAnio(Number(y));
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>
        Tarifas (monto de factura) por período
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, display: "block" }}>
          Ingrese el total de cada factura del mes. La liquidación lo reparte entre los inquilinos.
        </span>
      </div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 16 }}>
          <div><Label>Mes</Label><select value={mes} onChange={e => setMes(e.target.value)} style={inp}>{meses.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><Label>Año</Label><input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} style={inp} /></div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-muted)", borderRadius: 7, padding: "8px 12px", whiteSpace: "nowrap" }}>
            {tarifas[key] ? "✅ Configurado" : "⚠️ Sin configurar"}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {servFact.map(s => (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, alignItems: "center", background: "var(--bg-muted)", borderRadius: 8, padding: "10px 14px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)" }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Total factura en Bs.-</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Bs.-</span>
                <input type="number" aria-label={`Monto ${s.label}`} value={edit[s.id] ?? ""} onChange={e => setEdit(prev => ({ ...prev, [s.id]: e.target.value }))} style={inpNum} min="0" step="0.1" placeholder="0" />
              </div>
              {s.unit ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" aria-label={`Consumo ${s.label}`} value={edit[s.id + "_consumo"] ?? ""} onChange={e => setEdit(prev => ({ ...prev, [s.id + "_consumo"]: e.target.value }))} style={inpNum} min="0" step="1" placeholder={`Consumo (${s.unit})`} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{s.unit}</span>
                </div>
              ) : <div />}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={guardar} style={{ ...btnPrimario(cfg), padding: "10px 20px", fontSize: 13 }}>💾 Guardar tarifas para {mes} {anio}</button>
          {msg && <span style={{ fontSize: 12, color: "var(--tag-pagado-text)", fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 8 }}>Historial de tarifas</div>
      {Object.keys(tarifas).length === 0 ? <Vacio>No hay tarifas configuradas aún</Vacio> : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border-light)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "var(--bg-card)", color: "var(--text-main)" }}>
            <thead>
              <tr style={{ background: cfg.colorPrimario, color: "#fff" }}>
                <th style={{ padding: "9px 10px", textAlign: "left", fontSize: 11 }}>Período</th>
                {servFact.map(s => <th key={s.id} style={{ padding: "9px 10px", fontSize: 11 }}>{s.icon} {s.label}</th>)}
                <th style={{ padding: "9px 10px", fontSize: 11 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tarifas).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => (
                <tr key={k} style={{ background: k === key ? "var(--bg-accent)" : "transparent" }}>
                  <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", fontWeight: 700 }}>{periodoDeKey(k).label}</td>
                  {servFact.map(s => (
                    <td key={s.id} style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center" }}>
                      <div>{v[s.id] ? `Bs.- ${fmtNum(v[s.id])}` : "—"}</div>
                      {v[s.id + "_consumo"] ? <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmtNum(v[s.id + "_consumo"])} {s.unit}</div> : null}
                    </td>
                  ))}
                  <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center" }}>
                    <button onClick={() => cargarPeriodo(k)} style={{ ...btnPrimario(cfg), padding: "3px 10px", fontSize: 11 }}>✏️ Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
