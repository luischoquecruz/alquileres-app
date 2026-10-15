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
