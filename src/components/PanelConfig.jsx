import { useState } from "react";
import { CONFIG_DEFAULT } from "../config.js";
import { inp } from "../estilos.js";
import { Label, Mensaje } from "../ui.jsx";

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

  const tabStyle = id => ({
    padding: "8px 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
    borderBottom: tab === id ? `3px solid ${draft.colorAcento}` : "3px solid transparent",
    background: "transparent", color: tab === id ? draft.colorAcento : "var(--text-secondary)",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" style={{ background: "var(--bg-card)", borderRadius: 14, width: "min(700px, 96vw)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-xl)" }}>
        <div style={{ background: draft.colorPrimario, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>⚙️ Panel de Configuración</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>✕ Cerrar</button>
        </div>
        <div style={{ borderBottom: "1px solid var(--border-light)", display: "flex", flexWrap: "wrap", padding: "0 8px" }}>
          {[["identidad", "🏛️ Identidad"], ["colores", "🎨 Colores"], ["formulario", "📝 Formulario"], ["backend", "🔗 Backend"]].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>{lbl}</button>
          ))}
        </div>
        <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
          {tab === "identidad" && (
            <div style={{ display: "grid", gap: 12 }}>
              {[["orgNombre", "Nombre de la organización (ej: CEPI)"], ["orgSubtitulo", "Subtítulo / sistema"], ["appTitulo", "Título de la app"], ["appSubtitulo", "Descripción debajo del título"]].map(([key, lbl]) => (
                <div key={key}><Label>{lbl}</Label><input value={draft[key]} onChange={e => set(key, e.target.value)} style={inp} /></div>
              ))}
              <div><Label>Texto botón Enviar</Label><input value={draft.textos.botonEnviar} onChange={e => setTexto("botonEnviar", e.target.value)} style={inp} /></div>
              <div><Label>Mensaje de éxito</Label><input value={draft.textos.mensajeExito} onChange={e => setTexto("mensajeExito", e.target.value)} style={inp} /></div>
            </div>
          )}
          {tab === "colores" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {[["colorPrimario", "Color primario (header, botones)"], ["colorAcento", "Color de acento"], ["colorFondo", "Fondo gradiente inicio"], ["colorFondoAlt", "Fondo gradiente fin"],
                ["darkColorPrimario", "Modo oscuro: primario"], ["darkColorAcento", "Modo oscuro: acento"], ["darkColorFondo", "Modo oscuro: fondo inicio"], ["darkColorFondoAlt", "Modo oscuro: fondo fin"]].map(([key, lbl]) => (
                <div key={key}>
                  <Label>{lbl}</Label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={draft[key]} onChange={e => set(key, e.target.value)} style={{ width: 40, height: 34, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                    <input value={draft[key]} onChange={e => set(key, e.target.value)} style={{ ...inp, fontFamily: "monospace", width: "auto", flex: 1 }} />
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: "1/-1", padding: 12, background: "var(--bg-muted)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                Vista previa del header:
                <div style={{ marginTop: 8, background: `linear-gradient(135deg,${draft.colorPrimario},${draft.colorAcento})`, borderRadius: 8, padding: "12px 16px", color: "#fff" }}>
                  <div style={{ fontSize: 10, opacity: .8, letterSpacing: 2 }}>{draft.orgNombre} — {draft.orgSubtitulo}</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{draft.appTitulo}</div>
                </div>
              </div>
            </div>
          )}
          {tab === "formulario" && (
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text-main)" }}>
                <input type="checkbox" checked={draft.mostrarCampoNotas} onChange={e => set("mostrarCampoNotas", e.target.checked)} style={{ width: 16, height: 16 }} />
                Mostrar campo Notas / Comprobante
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text-main)" }}>
                <input type="checkbox" checked={draft.requiereNotas} onChange={e => set("requiereNotas", e.target.checked)} style={{ width: 16, height: 16 }} />
                Notas obligatorias
              </label>
              <div><Label>Métodos de pago (separados por coma)</Label>
                <input value={draft.metodosPago.join(", ")} onChange={e => set("metodosPago", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} style={inp} /></div>
            </div>
          )}
          {tab === "backend" && (
            <div style={{ display: "grid", gap: 12 }}>
              <Mensaje tipo="error">Cambiar la URL cierra la sesión y recarga todos los datos desde el nuevo backend. Esta URL se guarda solo en este navegador.</Mensaje>
              <div>
                <Label>URL Google Apps Script</Label>
                <input value={url} onChange={e => setUrl(e.target.value)} style={{ ...inp, fontFamily: "monospace" }} placeholder="https://script.google.com/macros/s/..." />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Déjela vacía para usar solo almacenamiento local en este navegador.</div>
              </div>
              <button onClick={() => { onCambiarUrl(url); onClose(); }} disabled={url.trim() === gasUrl}
                style={{ background: url.trim() === gasUrl ? "var(--text-muted)" : draft.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: url.trim() === gasUrl ? "not-allowed" : "pointer", fontSize: 12, justifySelf: "start" }}>
                🔗 Conectar a esta URL
              </button>
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--border-light)", padding: "12px 20px", background: "var(--bg-muted)", display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setDraft({ ...CONFIG_DEFAULT })}
            style={{ background: "var(--danger-bg)", color: "var(--danger-text)", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
            Restaurar valores por defecto
          </button>
          <button onClick={guardar} disabled={guardando} style={{ background: draft.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
            {guardando ? "Guardando..." : "💾 Guardar y cerrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
