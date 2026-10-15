// Piezas de UI compartidas por todas las vistas.
export const Label = ({ children, size = 11 }) => (
  <label style={{ fontSize: size, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{children}</label>
);

export const Vacio = ({ children }) => (
  <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", border: "1px dashed var(--border-light)", borderRadius: 10 }}>{children}</div>
);

export const Mensaje = ({ tipo = "ok", children }) => {
  if (!children) return null;
  const err = tipo === "error";
  return (
    <div role={err ? "alert" : "status"} style={{
      background: err ? "var(--bg-error)" : "var(--bg-success)",
      border: `1px solid ${err ? "var(--danger-text)" : "var(--tag-pagado-text)"}`,
      color: err ? "var(--danger-text)" : "var(--tag-pagado-text)",
      borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12,
    }}>{children}</div>
  );
};

export const Avisos = ({ avisos }) => (
  <div aria-live="polite" style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10000, display: "flex", flexDirection: "column", gap: 8, width: "min(420px, 92vw)" }}>
    {avisos.map(a => (
      <div key={a.id} role={a.tipo === "error" ? "alert" : "status"} style={{
        background: a.tipo === "error" ? "var(--danger-text)" : "var(--tag-pagado-text)", color: "#fff",
        borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-lg)",
      }}>{a.tipo === "error" ? "⚠️ " : "✅ "}{a.texto}</div>
    ))}
  </div>
);

export const Modal = ({ children, ancho = 360 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div role="dialog" aria-modal="true" style={{ background: "var(--bg-card)", borderRadius: 14, width: `min(${ancho}px, 92vw)`, maxHeight: "90vh", overflow: "auto", boxShadow: "var(--shadow-xl)" }}>
      {children}
    </div>
  </div>
);
