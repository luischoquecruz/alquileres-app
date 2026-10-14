import { useState } from "react";
import { inp, btnPrimario, btnSecundario, btnPeligro } from "../../estilos.js";
import { Label, Vacio } from "../../ui.jsx";

const personaVacia = () => ({ nombre: "", inmueble: "", telefono: "", email: "", notas: "", habitaciones: "1", personas: "1", activo: true });

export default function VistaPersonas({ cfg, personas, acciones }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(personaVacia());
  const [busqueda, setBusqueda] = useState("");
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const q = busqueda.toLowerCase();
  const filtradas = personas.filter(p =>
    String(p.nombre || "").toLowerCase().includes(q) || String(p.inmueble || "").toLowerCase().includes(q) || String(p.telefono || "").includes(busqueda));

  const cancelar = () => { setEditando(null); setForm(personaVacia()); };

  const guardar = () => {
    if (!form.nombre.trim()) return;
    const habitaciones = Math.max(1, parseInt(form.habitaciones, 10) || 1);
    const cantPersonas = Math.max(1, parseInt(form.personas, 10) || 1);
    acciones.guardarPersona({ ...form, nombre: form.nombre.trim(), habitaciones, personas: cantPersonas, id: editando ?? Date.now() });
    cancelar();
  };

  const editar = p => {
    setEditando(p.id);
    setForm({ nombre: p.nombre, inmueble: p.inmueble || "", telefono: p.telefono || "", email: p.email || "", notas: p.notas || "", habitaciones: String(p.habitaciones || 1), personas: String(p.personas || 1), activo: p.activo !== false });
  };

  const eliminar = p => {
    if (!confirm(`¿Eliminar a ${p.nombre}? Si tiene pagos o liquidaciones, considere marcarla como inactiva en su lugar.`)) return;
    acciones.eliminarPersona(p.id);
    if (editando === p.id) cancelar();
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>{personas.length} persona(s) registradas</div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 10 }}>{editando ? "✏️ Editar persona" : "➕ Agregar persona"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div><Label>Nombre *</Label><input value={form.nombre} onChange={e => setF("nombre", e.target.value)} style={inp} placeholder="Nombre completo" /></div>
          <div><Label>Teléfono</Label><input value={form.telefono} onChange={e => setF("telefono", e.target.value)} style={inp} /></div>
          <div><Label>Inmueble</Label><input value={form.inmueble} onChange={e => setF("inmueble", e.target.value)} style={inp} placeholder="Dirección / identificación" /></div>
          <div><Label>Email</Label><input type="email" value={form.email} onChange={e => setF("email", e.target.value)} style={inp} placeholder="correo@ejemplo.com" /></div>
          <div><Label>🏠 Habitaciones (reparto por habitaciones)</Label><input type="number" value={form.habitaciones} onChange={e => setF("habitaciones", e.target.value)} style={inp} min="1" step="1" /></div>
          <div><Label>👥 Personas (reparto por personas)</Label><input type="number" value={form.personas} onChange={e => setF("personas", e.target.value)} style={inp} min="1" step="1" /></div>
          <div style={{ gridColumn: "1/-1" }}><Label>Notas</Label><input value={form.notas} onChange={e => setF("notas", e.target.value)} style={inp} placeholder="Observaciones (opcional)" /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={guardar} disabled={!form.nombre.trim()} style={{ ...btnPrimario(cfg), opacity: form.nombre.trim() ? 1 : .5 }}>{editando ? "💾 Guardar cambios" : "➕ Agregar"}</button>
          {editando && <button onClick={cancelar} style={btnSecundario}>Cancelar</button>}
        </div>
      </div>
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inp, marginBottom: 14 }} placeholder="Buscar por nombre, inmueble o teléfono..." />
      {filtradas.length === 0 ? (
        <Vacio>{personas.length === 0 ? "No hay personas registradas. Agregue la primera arriba." : "Sin resultados de búsqueda"}</Vacio>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtradas.map(p => {
            const activo = p.activo !== false;
            return (
              <div key={p.id} style={{ border: "1px solid var(--border-light)", borderRadius: 10, padding: 12, background: "var(--bg-card)", display: "flex", gap: 12, alignItems: "center", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ background: "var(--bg-accent)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: cfg.colorAcento }}>{String(p.nombre || "?").charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: activo ? "var(--text-main)" : "var(--text-muted)" }}>{p.nombre} {!activo && <span style={{ fontSize: 10, fontWeight: 400 }}>(inactivo)</span>}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 3 }}>
                    {p.inmueble && <span style={{ background: "var(--tag-inquilino)", color: "var(--tag-inquilino-text)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>🏠 {p.inmueble}</span>}
                    {p.telefono && <span style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>📞 {p.telefono}</span>}
                    {p.email && <span style={{ background: "var(--tag-metodo)", color: "var(--tag-metodo-text)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>✉️ {p.email}</span>}
                    <span style={{ background: "var(--bg-accent)", color: "var(--text-secondary)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>🏠 {p.habitaciones || 1} hab.</span>
                    <span style={{ background: "var(--bg-accent)", color: "var(--text-secondary)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>👥 {p.personas || 1} pers.</span>
                    <button onClick={() => acciones.guardarPersona({ ...p, activo: !activo })} title="Cambiar estado"
                      style={{ background: activo ? "var(--tag-pagado)" : "var(--bg-warning)", color: activo ? "var(--tag-pagado-text)" : "var(--star)", borderRadius: 6, padding: "1px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600, border: "none" }}>
                      {activo ? "✅ Activo" : "⏸ Inactivo"}
                    </button>
                  </div>
                  {p.notas && <div style={{ fontSize: 11, color: "var(--text-comment)", fontStyle: "italic", marginTop: 2 }}>{p.notas}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => editar(p)} aria-label="Editar" style={{ ...btnPeligro, background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}>✏️</button>
                  <button onClick={() => eliminar(p)} aria-label="Eliminar" style={btnPeligro}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
