import { useState } from "react";
import { Modal, Field, Mensaje } from "../ui.jsx";

export default function LoginModal({ onLogin, onClose }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPass, setVerPass] = useState(false);
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
    <Modal onClose={onClose}>
      <form onSubmit={enviar} className="modal-body stack">
        <div>
          <div style={{ fontSize: 34, textAlign: "center" }} aria-hidden="true">🔐</div>
          <h2 className="modal-title">Iniciar sesión</h2>
          <p className="small muted" style={{ textAlign: "center" }}>Ingrese con su usuario y contraseña</p>
        </div>
        <Mensaje tipo="error">{error}</Mensaje>
        <Field label="Usuario / Email">
          <input className="input" autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} value={usuario} onChange={e => setUsuario(e.target.value)} />
        </Field>
        <Field as="div" label="Contraseña">
          <div className="input-group">
            <input className="input" type={verPass ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" aria-label="Contraseña" />
            <button type="button" className="addon" style={{ cursor: "pointer" }} onClick={() => setVerPass(v => !v)} aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}>{verPass ? "🙈" : "👁️"}</button>
          </div>
        </Field>
        <div className="stack-sm">
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={enviando || !usuario || !password}>
            {enviando ? "Verificando…" : "Ingresar"}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}
