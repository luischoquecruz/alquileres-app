// Piezas de UI compartidas por todas las vistas. Los estilos viven en index.css.
import { meses, periodoKey, periodoDeKey } from "./lib/format.js";

export const Label = ({ children }) => <span className="label">{children}</span>;

// Campo con etiqueta. Usar as="div" cuando el contenido no es un único control (ej. el buscador).
export const Field = ({ label, hint, children, as = "label", className = "" }) => {
  const Tag = as;
  return (
    <Tag className={`field ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </Tag>
  );
};

export const PageHeader = ({ title, sub, children }) => (
  <div className="page-header">
    <div>
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </div>
    {children}
  </div>
);

export const Vacio = ({ children, icon }) => (
  <div className="empty">{icon && <span className="empty-icon" aria-hidden="true">{icon}</span>}{children}</div>
);

export const Mensaje = ({ tipo = "ok", children }) => {
  if (!children) return null;
  const clase = tipo === "error" ? "alert-error" : tipo === "warn" ? "alert-warn" : "alert-ok";
  return <div role={tipo === "error" ? "alert" : "status"} className={`alert ${clase}`}>{children}</div>;
};

export const Avisos = ({ avisos }) => (
  <div aria-live="polite" className="toasts">
    {avisos.map(a => (
      <div key={a.id} role={a.tipo === "error" ? "alert" : "status"} className={`toast ${a.tipo === "error" ? "toast-error" : "toast-ok"}`}>
        {a.tipo === "error" ? "⚠️ " : "✅ "}{a.texto}
      </div>
    ))}
  </div>
);

export const Modal = ({ children, ancho = 400, onClose }) => (
  <div className="modal-backdrop" onMouseDown={e => { if (onClose && e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" className="modal" style={{ maxWidth: ancho }}>
      {children}
    </div>
  </div>
);

const IconoWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.16-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.06.89.9-2.98-.2-.31a8.2 8.2 0 1 1 6.84 3.73Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.42l-.75-1.8c-.2-.47-.4-.4-.55-.41h-.47a.9.9 0 0 0-.65.3 2.73 2.73 0 0 0-.85 2.03 4.74 4.74 0 0 0 1 2.52 10.86 10.86 0 0 0 4.16 3.68c1.55.67 2.16.73 2.93.61.47-.07 1.46-.6 1.66-1.18.2-.58.2-1.07.15-1.18-.06-.1-.22-.16-.47-.28Z" />
  </svg>
);

// Botón "WhatsApp": `onCompartir` devuelve el resultado de compartirWhatsApp().
export function BotonWhatsApp({ onCompartir, notificar, children = "WhatsApp", soloIcono = false, className = "", title }) {
  const click = async () => {
    try {
      const r = await onCompartir();
      if (r === "bloqueado") notificar?.("El navegador bloqueó la ventana de WhatsApp. Permita ventanas emergentes.", "error");
    } catch (e) {
      notificar?.("No se pudo compartir: " + e.message, "error");
    }
  };
  return (
    <button type="button" className={`btn btn-whatsapp ${soloIcono ? "btn-icon" : ""} ${className}`} onClick={click}
      aria-label={soloIcono ? (title || "Enviar por WhatsApp") : undefined} title={title || "Enviar por WhatsApp"}>
      <IconoWhatsApp />{!soloIcono && <span>{children}</span>}
    </button>
  );
}

// Mes + año con flechas para moverse rápido, y accesos directos a los períodos que ya tienen datos.
export function PeriodoSelector({ mes, anio, onChange, periodos = [], etiquetaPeriodos = "Con datos:" }) {
  const mover = delta => {
    const i = meses.indexOf(mes) + delta;
    const y = Number(anio) + Math.floor(i / 12);
    onChange(meses[((i % 12) + 12) % 12], y);
  };
  const actual = periodoKey(mes, anio);
  const recientes = [...periodos].sort().reverse().slice(0, 12);
  return (
    <div className="stack-sm">
      <div className="periodo">
        <button type="button" className="btn btn-secondary btn-icon" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
        <select className="select" value={mes} onChange={e => onChange(e.target.value, anio)} aria-label="Mes">
          {meses.map(m => <option key={m}>{m}</option>)}
        </select>
        <input className="input" type="number" value={anio} onChange={e => onChange(mes, e.target.value)} aria-label="Año" />
        <button type="button" className="btn btn-secondary btn-icon" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
      </div>
      {recientes.length > 0 && (
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <span className="hint nowrap">{etiquetaPeriodos}</span>
          <div className="chips">
            {recientes.map(k => {
              const p = periodoDeKey(k);
              return (
                <button key={k} type="button" className="chip" aria-pressed={k === actual} onClick={() => onChange(p.mes, Number(p.anio))}>
                  {p.mes.slice(0, 3)} {p.anio}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
