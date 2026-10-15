import { useState } from "react";
import { inp, btnPrimario, btnSecundario } from "../estilos.js";
import { Modal, Label, Mensaje } from "../ui.jsx";

export default function CambiarPassword({ cfg, obligatorio, onGuardar, onClose }) {
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
    <Modal>
      <form onSubmit={enviar} style={{ padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-main)", marginBottom: 8, textAlign: "center" }}>🔑 Cambiar contraseña</div>
        {obligatorio && <Mensaje tipo="error">Está usando la contraseña por defecto. Cámbiela para proteger el sistema.</Mensaje>}
        <Mensaje tipo="error">{error}</Mensaje>
        {!obligatorio && (
          <div style={{ marginBottom: 12 }}><Label>Contraseña actual</Label>
            <input type="password" autoComplete="current-password" value={actual} onChange={e => setActual(e.target.value)} style={inp} /></div>
        )}
        <div style={{ marginBottom: 12 }}><Label>Nueva contraseña</Label>
          <input type="password" autoComplete="new-password" autoFocus value={nueva} onChange={e => setNueva(e.target.value)} style={inp} /></div>
        <div style={{ marginBottom: 16 }}><Label>Repetir nueva contraseña</Label>
          <input type="password" autoComplete="new-password" value={repetir} onChange={e => setRepetir(e.target.value)} style={inp} /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={enviando} style={{ ...btnPrimario(cfg), flex: 1, padding: 10 }}>{enviando ? "Guardando..." : "Guardar"}</button>
          <button type="button" onClick={onClose} style={{ ...btnSecundario, flex: 1, padding: 10 }}>{obligatorio ? "Más tarde" : "Cancelar"}</button>
        </div>
      </form>
    </Modal>
  );
}
