import { useState } from "react";
import { Modal, Field, Mensaje } from "../ui.jsx";

export default function CambiarPassword({ obligatorio, onGuardar, onClose }) {
  const [actual, setActual] = useState(obligatorio ? "admin123" : "");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async e => {
    e.preventDefault();
    if (nueva.length < 6) return setError("La nueva contraseña debe tener al menos 6 caracteres");
    if (nueva !== repetir) return setError("Las contraseñas no coinciden");
    setError("");
    setEnviando(true);
    const ok = await onGuardar(actual, nueva);
    setEnviando(false);
    if (ok) onClose();
  };

  return (
    <Modal onClose={obligatorio ? undefined : onClose}>
      <form onSubmit={enviar} className="modal-body stack">
        <div>
          <div style={{ fontSize: 34, textAlign: "center" }} aria-hidden="true">🔑</div>
          <h2 className="modal-title">Cambiar contraseña</h2>
        </div>
        {obligatorio && <Mensaje tipo="warn">Está usando la contraseña por defecto. Cámbiela para proteger el sistema.</Mensaje>}
        <Mensaje tipo="error">{error}</Mensaje>
        {!obligatorio && (
          <Field label="Contraseña actual">
            <input className="input" type="password" autoComplete="current-password" value={actual} onChange={e => setActual(e.target.value)} />
          </Field>
        )}
        <Field label="Nueva contraseña" hint="Mínimo 6 caracteres">
          <input className="input" type="password" autoComplete="new-password" autoFocus value={nueva} onChange={e => setNueva(e.target.value)} />
        </Field>
        <Field label="Repetir nueva contraseña">
          <input className="input" type="password" autoComplete="new-password" value={repetir} onChange={e => setRepetir(e.target.value)} />
        </Field>
        <div className="form-grid-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{obligatorio ? "Más tarde" : "Cancelar"}</button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}
