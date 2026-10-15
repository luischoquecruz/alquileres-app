import { useState } from "react";
import { inp } from "../estilos.js";
import { Modal, Label } from "../ui.jsx";

export default function LoginModal({ onLogin, onClose, cfg }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async e => {
    e.preventDefault();
    if (enviando) return;
    setError("");
    setEnviando(true);
    const r = await onLogin(usuario, password);
    setEnviando(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <Modal>
      <form onSubmit={enviar} style={{ padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-main)", marginBottom: 16, textAlign: "center" }}>🔐 Iniciar sesión</div>
        {error && <div role="alert" style={{ background: "var(--bg-error)", border: "1px solid var(--danger-text)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "var(--danger-text)", fontSize: 12, textAlign: "center" }}>{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <Label size={12}>Usuario / Email</Label>
          <input autoFocus autoComplete="username" value={usuario} onChange={e => setUsuario(e.target.value)} style={{ ...inp, padding: "9px 12px" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Label size={12}>Contraseña</Label>
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, padding: "9px 12px" }} placeholder="••••••" />
        </div>
        <button type="submit" disabled={enviando || !usuario || !password} style={{ width: "100%", background: cfg.colorPrimario, color: "#fff", border: "none", borderRadius: 8, padding: 11, fontWeight: 700, cursor: enviando ? "wait" : "pointer", fontSize: 14, marginBottom: 8, opacity: !usuario || !password ? .6 : 1 }}>
          {enviando ? "Verificando..." : "Ingresar"}
        </button>
        <button type="button" onClick={onClose} style={{ width: "100%", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: 11, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
      </form>
    </Modal>
  );
}
