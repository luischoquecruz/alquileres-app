import { useState } from "react";
import { useMobile } from "../../hooks/useMobile.js";
import { Field, PageHeader, Vacio } from "../../ui.jsx";

const personaVacia = () => ({ nombre: "", inmueble: "", telefono: "", email: "", notas: "", habitaciones: "1", personas: "1", activo: true });

export default function VistaPersonas({ personas, acciones }) {
  const isMobile = useMobile();
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(personaVacia());
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const q = busqueda.toLowerCase();
  const filtradas = personas.filter(p =>
    String(p.nombre || "").toLowerCase().includes(q) || String(p.inmueble || "").toLowerCase().includes(q) || String(p.telefono || "").includes(busqueda));
  const activas = personas.filter(p => p.activo !== false).length;

  // En el celular el formulario se pliega para que la lista quede a la vista
  const mostrarForm = !isMobile || personas.length === 0 || formAbierto || editando !== null;

  const cancelar = () => { setEditando(null); setForm(personaVacia()); setFormAbierto(false); };

  const guardar = e => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    const habitaciones = Math.max(1, parseInt(form.habitaciones, 10) || 1);
    const cantPersonas = Math.max(1, parseInt(form.personas, 10) || 1);
    acciones.guardarPersona({ ...form, nombre: form.nombre.trim(), habitaciones, personas: cantPersonas, id: editando ?? Date.now() });
    cancelar();
  };

  const editar = p => {
    setEditando(p.id);
    setForm({ nombre: p.nombre, inmueble: p.inmueble || "", telefono: p.telefono || "", email: p.email || "", notas: p.notas || "", habitaciones: String(p.habitaciones || 1), personas: String(p.personas || 1), activo: p.activo !== false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminar = p => {
    if (!confirm(`¿Eliminar a ${p.nombre}? Si tiene pagos o liquidaciones, considere marcarla como inactiva en su lugar.`)) return;
    acciones.eliminarPersona(p.id);
    if (editando === p.id) cancelar();
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <PageHeader title="Personas" sub={`${personas.length} persona(s) registradas`}>
        {!mostrarForm && <button className="btn btn-primary" onClick={() => setFormAbierto(true)}>➕ Nueva persona</button>}
      </PageHeader>

      {mostrarForm && (
        <form className="card" onSubmit={guardar}>
          <div className="card-header card-title">{editando ? "✏️ Editar persona" : "➕ Agregar persona"}</div>
          <div className="card-body form-grid">
            <Field label="Nombre *"><input className="input" value={form.nombre} onChange={e => setF("nombre", e.target.value)} placeholder="Nombre completo" autoComplete="off" /></Field>
            <Field label="Teléfono"><input className="input" type="tel" inputMode="tel" value={form.telefono} onChange={e => setF("telefono", e.target.value)} /></Field>
            <Field label="Inmueble"><input className="input" value={form.inmueble} onChange={e => setF("inmueble", e.target.value)} placeholder="Dirección / identificación" /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="correo@ejemplo.com" /></Field>
            <div className="form-grid-2">
              <Field label="🏠 Habitaciones"><input className="input" type="number" inputMode="numeric" value={form.habitaciones} onChange={e => setF("habitaciones", e.target.value)} min="1" step="1" /></Field>
              <Field label="👥 Personas"><input className="input" type="number" inputMode="numeric" value={form.personas} onChange={e => setF("personas", e.target.value)} min="1" step="1" /></Field>
            </div>
            <Field label="Notas"><input className="input" value={form.notas} onChange={e => setF("notas", e.target.value)} placeholder="Observaciones (opcional)" /></Field>
          </div>
          <div className="card-footer row">
            <button type="submit" className="btn btn-primary" disabled={!form.nombre.trim()}>{editando ? "💾 Guardar cambios" : "➕ Agregar"}</button>
            {(editando || (isMobile && personas.length > 0)) && <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>}
          </div>
        </form>
      )}

      <div className="stack-sm">
        <div className="row-between">
          <h2 className="section-title" style={{ margin: 0 }}>Listado <span className="muted xsmall" style={{ fontWeight: 500 }}>· {activas} activa(s)</span></h2>
        </div>
        <input className="input" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔎 Buscar por nombre, inmueble o teléfono…" aria-label="Buscar personas" />
        {filtradas.length === 0 ? (
          <Vacio icon="👥">{personas.length === 0 ? "No hay personas registradas. Agregue la primera arriba." : "Sin resultados de búsqueda"}</Vacio>
        ) : (
          <div className="list">
            {filtradas.map(p => {
              const activo = p.activo !== false;
              return (
                <article key={p.id} className="card list-item" style={activo ? undefined : { opacity: .7 }}>
                  <div className="avatar" aria-hidden="true">{String(p.nombre || "?").charAt(0).toUpperCase()}</div>
                  <div className="grow">
                    <div className="item-title">{p.nombre}</div>
                    <div className="badges" style={{ marginTop: 6 }}>
                      <button className={`badge ${activo ? "badge-ok" : "badge-warn"}`} onClick={() => acciones.guardarPersona({ ...p, activo: !activo })} title="Cambiar estado">
                        {activo ? "✅ Activo" : "⏸ Inactivo"}
                      </button>
                      {p.inmueble && <span className="badge badge-pink">🏠 {p.inmueble}</span>}
                      <span className="badge">{p.habitaciones || 1} hab · {p.personas || 1} pers</span>
                      {p.telefono && <a className="badge" href={`tel:${p.telefono}`}>📞 {p.telefono}</a>}
                      {p.email && <span className="badge badge-info">✉️ {p.email}</span>}
                    </div>
                    {p.notas && <div className="xsmall" style={{ color: "var(--text-comment)", fontStyle: "italic", marginTop: 6 }}>{p.notas}</div>}
                  </div>
                  <div className="actions">
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => editar(p)} aria-label="Editar" title="Editar">✏️</button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => eliminar(p)} aria-label="Eliminar" title="Eliminar">✕</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
