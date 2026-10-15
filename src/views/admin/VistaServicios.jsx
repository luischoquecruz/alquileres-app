import { useState } from "react";
import { SEReparto } from "../../lib/calculos.js";
import { labelReparto } from "../../hooks/useMontos.js";
import { Field, PageHeader, Vacio } from "../../ui.jsx";

const formVacio = () => ({ label: "", icon: "📦", unit: "", tipo: "fijo", reparto: SEReparto.UNIDAD, requerido: false });

export default function VistaServicios({ servicios, acciones }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVacio());
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cancelar = () => { setEditando(null); setForm(formVacio()); };

  const guardar = e => {
    e.preventDefault();
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminar = s => {
    if (!confirm(`¿Eliminar el servicio ${s.label}? Las liquidaciones que lo usan dejarán de mostrarlo.`)) return;
    acciones.eliminarServicio(s.id);
    if (editando === s.id) cancelar();
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <PageHeader title="Servicios" sub={`${servicios.length} servicio(s) configurados`} />

      <form className="card" onSubmit={guardar}>
        <div className="card-header card-title">{editando ? "✏️ Editar servicio" : "➕ Agregar servicio"}</div>
        <div className="card-body form-grid">
          <Field label="Nombre *"><input className="input" value={form.label} onChange={e => setF("label", e.target.value)} placeholder="Ej: Agua Potable" /></Field>
          <div className="form-grid-2">
            <Field label="Icono"><input className="input" value={form.icon} onChange={e => setF("icon", e.target.value)} style={{ textAlign: "center", fontSize: 20 }} /></Field>
            <Field label="Unidad"><input className="input" value={form.unit} onChange={e => setF("unit", e.target.value)} placeholder="m³, kWh" /></Field>
          </div>
          <Field label="Tipo">
            <select className="select" value={form.tipo} onChange={e => setF("tipo", e.target.value)}>
              <option value="fijo">Fijo (monto directo)</option>
              <option value="consumo">Consumo (con unidad)</option>
            </select>
          </Field>
          <Field label="Método de reparto">
            <select className="select" value={form.reparto} onChange={e => setF("reparto", e.target.value)}>
              <option value={SEReparto.UNIDAD}>1 solo pago (por unidad)</option>
              <option value={SEReparto.HABITACIONES}>Por cantidad de habitaciones</option>
              <option value={SEReparto.PERSONAS}>Por cantidad de personas</option>
            </select>
          </Field>
          <label className="check span-all">
            <input type="checkbox" checked={form.requerido} onChange={e => setF("requerido", e.target.checked)} />
            Requerido en el formulario
          </label>
        </div>
        <div className="card-footer row">
          <button type="submit" className="btn btn-primary" disabled={!form.label.trim()}>{editando ? "💾 Guardar cambios" : "➕ Agregar"}</button>
          {editando && <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>

      <div className="stack-sm">
        {servicios.length === 0 ? <Vacio icon="📦">No hay servicios configurados. Agregue el primero arriba.</Vacio> : (
          <div className="list">
            {servicios.map(s => (
              <article key={s.id} className="card list-item">
                <div className="avatar" style={{ fontSize: 22 }} aria-hidden="true">{s.icon}</div>
                <div className="grow">
                  <div className="item-title">{s.label}</div>
                  <div className="badges" style={{ marginTop: 6 }}>
                    <span className="badge">{s.tipo === "consumo" ? "📊 Consumo" : "💰 Fijo"}</span>
                    <span className="badge badge-accent">{labelReparto(s.reparto)}</span>
                    {s.unit && <span className="badge">{s.unit}</span>}
                    {s.requerido && <span className="badge badge-info">Requerido</span>}
                  </div>
                </div>
                <div className="actions">
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={() => editar(s)} aria-label="Editar" title="Editar">✏️</button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => eliminar(s)} aria-label="Eliminar" title="Eliminar">✕</button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="xsmall muted" style={{ fontStyle: "italic" }}>
          Los cambios en servicios afectan a nuevas liquidaciones. Las liquidaciones existentes conservan el reparto con que se guardaron.
        </p>
      </div>
    </div>
  );
}
