import { useState } from "react";
import { CONFIG_DEFAULT } from "../config.js";
import { Field, Mensaje, Modal } from "../ui.jsx";

const TABS = [["identidad", "🏛️ Identidad"], ["colores", "🎨 Colores"], ["formulario", "📝 Formulario"], ["backend", "🔗 Backend"]];

// Edita un borrador de la configuración; solo se guarda en el backend al pulsar "Guardar".
export default function PanelConfig({ config, gasUrl, onGuardar, onCambiarUrl, onClose }) {
  const [tab, setTab] = useState("identidad");
  const [draft, setDraft] = useState(config);
  const [url, setUrl] = useState(gasUrl);
  const [guardando, setGuardando] = useState(false);

  const set = (key, val) => setDraft(p => ({ ...p, [key]: val }));
  const setTexto = (key, val) => setDraft(p => ({ ...p, textos: { ...p.textos, [key]: val } }));

  const guardar = async () => {
    setGuardando(true);
    const ok = await onGuardar(draft);
    setGuardando(false);
    if (ok) onClose();
  };

  return (
    <Modal ancho={720} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", maxHeight: "inherit" }}>
        <div className="row-between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)" }}>
          <h2 className="card-title">⚙️ Configuración</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="tabs" role="tablist">
          {TABS.map(([id, lbl]) => (
            <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{lbl}</button>
          ))}
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {tab === "identidad" && (
            <div className="form-grid">
              {[["orgNombre", "Nombre de la organización"], ["orgSubtitulo", "Subtítulo / sistema"], ["appTitulo", "Título de la app"], ["appSubtitulo", "Descripción debajo del título"]].map(([key, lbl]) => (
                <Field key={key} label={lbl}><input className="input" value={draft[key]} onChange={e => set(key, e.target.value)} /></Field>
              ))}
              <Field label="Texto del botón de registrar"><input className="input" value={draft.textos.botonEnviar} onChange={e => setTexto("botonEnviar", e.target.value)} /></Field>
              <Field label="Mensaje de éxito"><input className="input" value={draft.textos.mensajeExito} onChange={e => setTexto("mensajeExito", e.target.value)} /></Field>
            </div>
          )}
          {tab === "colores" && (
            <div className="stack">
              <div className="form-grid">
                {[["colorPrimario", "Color primario"], ["colorAcento", "Color de acento"], ["colorFondo", "Fondo (inicio)"], ["colorFondoAlt", "Fondo (fin)"],
                  ["darkColorPrimario", "Modo oscuro: primario"], ["darkColorAcento", "Modo oscuro: acento"], ["darkColorFondo", "Modo oscuro: fondo inicio"], ["darkColorFondoAlt", "Modo oscuro: fondo fin"]].map(([key, lbl]) => (
                  <Field key={key} as="div" label={lbl}>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <input type="color" value={draft[key]} onChange={e => set(key, e.target.value)} aria-label={lbl}
                        style={{ width: 48, height: 44, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: 3, background: "var(--bg-input)", flexShrink: 0 }} />
                      <input className="input input-mono" value={draft[key]} onChange={e => set(key, e.target.value)} aria-label={`${lbl} (hex)`} />
                    </div>
                  </Field>
                ))}
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Vista previa</div>
                <div className="hero" style={{ background: `linear-gradient(135deg,${draft.colorPrimario},${draft.colorAcento})` }}>
                  <div className="hero-eyebrow">{draft.orgNombre} — {draft.orgSubtitulo}</div>
                  <div className="hero-title">{draft.appTitulo}</div>
                </div>
              </div>
            </div>
          )}
          {tab === "formulario" && (
            <div className="stack">
              <label className="check"><input type="checkbox" checked={draft.mostrarCampoNotas} onChange={e => set("mostrarCampoNotas", e.target.checked)} /> Mostrar campo Notas / Comprobante</label>
              <label className="check"><input type="checkbox" checked={draft.requiereNotas} onChange={e => set("requiereNotas", e.target.checked)} /> Notas obligatorias</label>
              <Field label="Métodos de pago" hint="Separados por coma">
                <input className="input" value={draft.metodosPago.join(", ")} onChange={e => set("metodosPago", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />
              </Field>
            </div>
          )}
          {tab === "backend" && (
            <div className="stack">
              <Mensaje tipo="warn">Cambiar la URL cierra la sesión y recarga todos los datos desde el nuevo backend. Esta URL se guarda solo en este navegador.</Mensaje>
              <Field label="URL de Google Apps Script" hint="Déjela vacía para usar solo almacenamiento local en este navegador.">
                <input className="input input-mono" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." />
              </Field>
              <div>
                <button className="btn btn-secondary" onClick={() => { onCambiarUrl(url); onClose(); }} disabled={url.trim() === gasUrl}>🔗 Conectar a esta URL</button>
              </div>
            </div>
          )}
        </div>
        <div className="row-between" style={{ padding: "14px 20px", borderTop: "1px solid var(--border-light)", background: "var(--bg-muted)" }}>
          <button className="btn btn-ghost text-danger" onClick={() => setDraft({ ...CONFIG_DEFAULT })}>Restaurar valores</button>
          <button className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "💾 Guardar y cerrar"}</button>
        </div>
      </div>
    </Modal>
  );
}
