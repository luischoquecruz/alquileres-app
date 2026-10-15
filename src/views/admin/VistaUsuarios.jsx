import { useState } from "react";
import { Field, Mensaje, PageHeader } from "../../ui.jsx";

const vacio = () => ({ nombre: "", email: "", password: "", rol: "inquilino", personaId: "" });

export default function VistaUsuarios({ usuarios, personas, sesion, acciones }) {
  const [form, setForm] = useState(vacio());
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cancelar = () => { setEditando(null); setForm(vacio()); setError(""); };

  const guardar = async e => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) return setError("Complete nombre y usuario/email");
    if (!editando && !form.password) return setError("La contraseña es obligatoria para usuarios nuevos");
    if (form.password && form.password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    if (form.rol === "inquilino" && !form.personaId) return setError("Vincule el usuario inquilino a una persona para que pueda ver su cuenta");
    setError("");
    setEnviando(true);
    const usuario = {
      id: editando ?? Date.now(),
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
      personaId: form.rol === "inquilino" ? form.personaId : "",
      ...(form.password ? { password: form.password } : {}),
    };
    const r = await acciones.guardarUsuario(usuario);
    setEnviando(false);
    if (r) cancelar();
  };

  const editar = u => {
    setEditando(u.id);
    setForm({ nombre: u.nombre || "", email: u.email || "", password: "", rol: u.rol, personaId: u.personaId ? String(u.personaId) : "" });
    document.getElementById("form-usuario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const eliminar = u => {
    if (!confirm(`¿Eliminar el usuario ${u.nombre}?`)) return;
    acciones.eliminarUsuario(u.id);
  };

  const nombrePersona = id => personas.find(p => String(p.id) === String(id))?.nombre;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <PageHeader title="Usuarios" sub={`${usuarios.length} usuario(s) con acceso al sistema`} />

      <div className="list">
        {usuarios.map(u => {
          const yo = String(u.id) === String(sesion.id);
          const admin = u.rol === "admin";
          return (
            <article key={u.id} className="card list-item">
              <div className="avatar" style={admin ? { background: "var(--primary)", color: "#fff" } : undefined} aria-hidden="true">{admin ? "🔐" : "👤"}</div>
              <div className="grow">
                <div className="item-title">{u.nombre} {yo && <span className="badge" style={{ marginLeft: 4 }}>usted</span>}</div>
                <div className="item-meta truncate">{u.email}</div>
                <div className="badges" style={{ marginTop: 6 }}>
                  <span className={`badge ${admin ? "badge-accent" : "badge-pink"}`}>{admin ? "Administrador" : "Inquilino"}</span>
                  {!admin && nombrePersona(u.personaId) && <span className="badge">👤 {nombrePersona(u.personaId)}</span>}
                </div>
              </div>
              <div className="actions">
                <button className="btn btn-secondary btn-icon btn-sm" onClick={() => editar(u)} aria-label="Editar" title="Editar">✏️</button>
                {!yo && <button className="btn btn-danger btn-icon btn-sm" onClick={() => eliminar(u)} aria-label="Eliminar" title="Eliminar">✕</button>}
              </div>
            </article>
          );
        })}
      </div>

      <form id="form-usuario" className="card" onSubmit={guardar}>
        <div className="card-header card-title">{editando ? "✏️ Editar usuario" : "➕ Nuevo usuario"}</div>
        <div className="card-body stack">
          <Mensaje tipo="error">{error}</Mensaje>
          <div className="form-grid">
            <Field label="Nombre"><input className="input" value={form.nombre} onChange={e => setF("nombre", e.target.value)} /></Field>
            <Field label="Email / Usuario"><input className="input" value={form.email} autoComplete="off" autoCapitalize="none" onChange={e => setF("email", e.target.value)} /></Field>
            <Field label={editando ? "Nueva contraseña" : "Contraseña"} hint={editando ? "Déjela vacía para no cambiarla" : undefined}>
              <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={e => setF("password", e.target.value)} placeholder="mínimo 6 caracteres" />
            </Field>
            <Field label="Rol">
              <select className="select" value={form.rol} onChange={e => setF("rol", e.target.value)}>
                <option value="inquilino">Inquilino</option>
                <option value="admin">Administrador</option>
              </select>
            </Field>
            {form.rol === "inquilino" && (
              <Field label="Vincular a persona" className="span-all">
                <select className="select" value={form.personaId} onChange={e => setF("personaId", e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {personas.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                </select>
              </Field>
            )}
          </div>
        </div>
        <div className="card-footer row">
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Guardando…" : editando ? "💾 Guardar cambios" : "➕ Crear usuario"}</button>
          {editando && <button type="button" className="btn btn-ghost" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>
    </div>
  );
}
