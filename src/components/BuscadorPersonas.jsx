import { useState, useEffect, useRef } from "react";

export default function BuscadorPersonas({ personas, value, onChange, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = busqueda.toLowerCase();
  const filtradas = personas.filter(p =>
    String(p.nombre || "").toLowerCase().includes(q) || String(p.inmueble || "").toLowerCase().includes(q));
  const perSel = personas.find(p => String(p.id) === String(value));

  const elegir = p => { onChange(p); setAbierto(false); setBusqueda(""); };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}
        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", background: "var(--bg-card)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
        <span style={{ color: perSel ? "var(--text-main)" : "var(--text-muted)" }}>
          {perSel ? `${perSel.nombre}${perSel.inmueble ? ` — ${perSel.inmueble}` : ""}` : placeholder || "-- Seleccione un inquilino --"}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, marginTop: 5, zIndex: 100, boxShadow: "var(--shadow-lg)", maxHeight: 320, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 8, borderBottom: "1px solid var(--border-light)" }}>
            <input autoFocus value={busqueda} onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && filtradas.length === 1) elegir(filtradas[0]); if (e.key === "Escape") setAbierto(false); }}
              placeholder="Buscar persona o inmueble..."
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", fontSize: 12, boxSizing: "border-box", outline: "none", background: "var(--bg-card)", color: "var(--text-main)" }} />
          </div>
          <div role="listbox" style={{ overflowY: "auto", flex: 1 }}>
            {filtradas.length === 0 ? (
              <div style={{ padding: 12, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Sin resultados</div>
            ) : filtradas.map(p => {
              const sel = String(p.id) === String(value);
              return (
                <div key={p.id} role="option" aria-selected={sel} onClick={() => elegir(p)}
                  style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, background: sel ? "var(--bg-accent)" : "transparent", color: "var(--text-main)", borderBottom: "1px solid var(--border-light)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-muted)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = sel ? "var(--bg-accent)" : "transparent"; }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nombre}</div>
                  {p.inmueble && <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{p.inmueble}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
