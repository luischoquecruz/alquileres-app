import { useState } from "react";
import { SEReparto } from "../../lib/calculos.js";
import { inp, btnPrimario, btnSecundario, btnPeligro } from "../../estilos.js";
import { Label, Vacio } from "../../ui.jsx";

const formVacio = () => ({ label: "", icon: "📦", unit: "", tipo: "fijo", reparto: SEReparto.UNIDAD, requerido: false });
const tdS = { padding: "6px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center", fontSize: 11, color: "var(--text-main)" };

export default function VistaServicios({ cfg, servicios, acciones }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVacio());
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cancelar = () => { setEditando(null); setForm(formVacio()); };

  const guardar = () => {
    if (!form.label.trim()) return;
    if (editando) {
      const actual = servicios.find(s => s.id === editando);
      acciones.guardarServicio({ ...actual, ...form, label: form.label.trim(), id: editando });
    } else {
      const id = form.label.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "") + "_" + Date.now();
      const orden = servicios.reduce((m, s) => Math.max(m, Number(s.orden) || 0), 0) + 1;
      acciones.guardarServicio({ ...form, label: form.label.trim(), id, orden });
    }
    cancelar();
  };

  const editar = s => {
    setEditando(s.id);
    setForm({ label: s.label, icon: s.icon, unit: s.unit || "", tipo: s.tipo, reparto: s.reparto, requerido: !!s.requerido });
  };

  const eliminar = s => {
    if (!confirm(`¿Eliminar el servicio ${s.label}? Las liquidaciones que lo usan dejarán de mostrarlo.`)) return;
    acciones.eliminarServicio(s.id);
    if (editando === s.id) cancelar();
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>{servicios.length} servicio(s) configurados</div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 10 }}>{editando ? "✏️ Editar servicio" : "➕ Agregar servicio"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div><Label>Nombre *</Label><input value={form.label} onChange={e => setF("label", e.target.value)} style={inp} placeholder="Ej: Agua Potable" /></div>
          <div><Label>Icono (emoji)</Label><input value={form.icon} onChange={e => setF("icon", e.target.value)} style={inp} /></div>
          <div><Label>Unidad (solo consumo)</Label><input value={form.unit} onChange={e => setF("unit", e.target.value)} style={inp} placeholder="m³, kWh, kg" /></div>
          <div><Label>Tipo</Label>
            <select value={form.tipo} onChange={e => setF("tipo", e.target.value)} style={inp}>
              <option value="fijo">Fijo (monto directo)</option>
              <option value="consumo">Consumo (con unidad)</option>
            </select>
          </div>
          <div><Label>Método de reparto</Label>
            <select value={form.reparto} onChange={e => setF("reparto", e.target.value)} style={inp}>
              <option value={SEReparto.UNIDAD}>1 solo pago (por unidad)</option>
              <option value={SEReparto.HABITACIONES}>Por cantidad de habitaciones</option>
              <option value={SEReparto.PERSONAS}>Por cantidad de personas</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.requerido} onChange={e => setF("requerido", e.target.checked)} style={{ width: 16, height: 16, accentColor: cfg.colorPrimario }} />
            Requerido en el formulario
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={guardar} disabled={!form.label.trim()} style={{ ...btnPrimario(cfg), opacity: form.label.trim() ? 1 : .5 }}>{editando ? "💾 Guardar cambios" : "➕ Agregar"}</button>
          {editando && <button onClick={cancelar} style={btnSecundario}>Cancelar</button>}
        </div>
      </div>

      {servicios.length === 0 ? <Vacio>No hay servicios configurados. Agregue el primero arriba.</Vacio> : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border-light)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "var(--bg-card)" }}>
            <thead>
              <tr style={{ background: cfg.colorPrimario, color: "#fff" }}>
                {["Icono", "Nombre", "Tipo", "Reparto", "Unidad", "Req.", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", fontWeight: 600, fontSize: 10, letterSpacing: .5, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {servicios.map(s => (
                <tr key={s.id}>
                  <td style={{ ...tdS, fontSize: 20 }}>{s.icon}</td>
                  <td style={{ ...tdS, textAlign: "left", fontWeight: 700, fontSize: 12 }}>{s.label}</td>
                  <td style={tdS}>{s.tipo === "consumo" ? "📊 Consumo" : "💰 Fijo"}</td>
                  <td style={tdS}>{s.reparto === SEReparto.UNIDAD ? "🏷️ Unidad" : s.reparto === SEReparto.HABITACIONES ? "🏠 Habitaciones" : "👥 Personas"}</td>
                  <td style={tdS}>{s.unit || "—"}</td>
                  <td style={tdS}>{s.requerido ? "✅" : "—"}</td>
                  <td style={tdS}>
                    <button onClick={() => editar(s)} aria-label="Editar" style={{ ...btnPeligro, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}>✏️</button>
                    <button onClick={() => eliminar(s)} aria-label="Eliminar" style={{ ...btnPeligro, marginLeft: 4 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
        Los cambios en servicios afectan a nuevas liquidaciones. Las liquidaciones existentes conservan el reparto con que se guardaron.
      </div>
    </div>
  );
}
