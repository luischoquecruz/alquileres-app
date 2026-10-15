import { useState, useEffect, useRef } from "react";

export default function BuscadorPersonas({ personas, value, onChange, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const q = busqueda.toLowerCase();
  const filtradas = personas.filter(p =>
    String(p.nombre || "").toLowerCase().includes(q) || String(p.inmueble || "").toLowerCase().includes(q));
  const perSel = personas.find(p => String(p.id) === String(value));

  const elegir = p => { onChange(p); setAbierto(false); setBusqueda(""); };

  return (
    <div ref={ref} className="combo">
      <button type="button" className="input combo-trigger" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-haspopup="listbox">
        <span className="truncate" style={{ color: perSel ? "var(--text-main)" : "var(--text-muted)" }}>
          {perSel ? `${perSel.nombre}${perSel.inmueble ? ` — ${perSel.inmueble}` : ""}` : placeholder || "Seleccione un inquilino"}
        </span>
        <span className="chevron" aria-hidden="true">▼</span>
      </button>
      {abierto && (
        <div className="combo-panel">
          <div className="combo-search">
            <input className="input" autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && filtradas.length === 1) elegir(filtradas[0]); if (e.key === "Escape") setAbierto(false); }}
              placeholder="Buscar persona o inmueble…" aria-label="Buscar persona" />
          </div>
          <div role="listbox" className="combo-list">
            {filtradas.length === 0 ? (
              <div className="muted small" style={{ padding: 16, textAlign: "center" }}>Sin resultados</div>
            ) : filtradas.map(p => (
              <div key={p.id} role="option" className="combo-option" aria-selected={String(p.id) === String(value)} onClick={() => elegir(p)}>
                <div className="strong">{p.nombre}</div>
                {p.inmueble && <div className="xsmall secondary">{p.inmueble}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
