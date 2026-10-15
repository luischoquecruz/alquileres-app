import { useState } from "react";
import { inp, btnPrimario, btnSecundario, btnPeligro } from "../../estilos.js";
import { Label, Mensaje } from "../../ui.jsx";

const vacio = () => ({ nombre: "", email: "", password: "", rol: "inquilino", personaId: "" });

export default function VistaUsuarios({ cfg, usuarios, personas, sesion, acciones }) {
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
  };

  const eliminar = u => {
    if (!confirm(`¿Eliminar el usuario ${u.nombre}?`)) return;
    acciones.eliminarUsuario(u.id);
  };

  const nombrePersona = id => personas.find(p => String(p.id) === String(id))?.nombre;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>🔐 Gestión de usuarios ({usuarios.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {usuarios.map(u => (
          <div key={u.id} style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border-light)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.rol === "admin" ? cfg.colorPrimario : "var(--bg-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
              {u.rol === "admin" ? "🔐" : "👤"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)" }}>{u.nombre} {String(u.id) === String(sesion.id) && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(usted)</span>}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {u.email} · {u.rol === "admin" ? "Administrador" : `Inquilino${nombrePersona(u.personaId) ? ` — ${nombrePersona(u.personaId)}` : ""}`}
              </div>
            </div>
            <button onClick={() => editar(u)} aria-label="Editar" style={{ ...btnPeligro, background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}>✏️</button>
            {String(u.id) !== String(sesion.id) && <button onClick={() => eliminar(u)} aria-label="Eliminar" style={btnPeligro}>✕</button>}
          </div>
        ))}
      </div>

      <form onSubmit={guardar} style={{ marginTop: 16, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border-light)", padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 10 }}>{editando ? "✏️ Editar usuario" : "➕ Nuevo usuario"}</div>
        <Mensaje tipo="error">{error}</Mensaje>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <div><Label>Nombre</Label><input value={form.nombre} onChange={e => setF("nombre", e.target.value)} style={inp} /></div>
          <div><Label>Email / Usuario</Label><input value={form.email} autoComplete="off" onChange={e => setF("email", e.target.value)} style={inp} /></div>
          <div><Label>{editando ? "Nueva contraseña (vacío = no cambiar)" : "Contraseña"}</Label>
            <input type="password" autoComplete="new-password" value={form.password} onChange={e => setF("password", e.target.value)} style={inp} placeholder="mínimo 6 caracteres" /></div>
          <div><Label>Rol</Label>
            <select value={form.rol} onChange={e => setF("rol", e.target.value)} style={inp}>
              <option value="inquilino">Inquilino</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {form.rol === "inquilino" && (
            <div style={{ gridColumn: "1/-1" }}><Label>Vincular a persona</Label>
              <select value={form.personaId} onChange={e => setF("personaId", e.target.value)} style={inp}>
                <option value="">— Seleccione —</option>
                {personas.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="submit" disabled={enviando} style={btnPrimario(cfg)}>{enviando ? "Guardando..." : editando ? "💾 Guardar cambios" : "➕ Crear usuario"}</button>
          {editando && <button type="button" onClick={cancelar} style={btnSecundario}>Cancelar</button>}
        </div>
      </form>
    </div>
  );
}
