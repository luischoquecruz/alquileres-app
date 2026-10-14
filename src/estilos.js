// Estilos inline compartidos por todas las vistas.
export const inp = {
  width: "100%", border: "1px solid var(--border)", borderRadius: 7,
  padding: "8px 11px", fontSize: 13, boxSizing: "border-box",
  background: "var(--bg-card)", color: "var(--text-main)",
};
export const inpNum = { ...inp, textAlign: "right" };


export const btnPrimario = cfg => ({
  background: cfg.colorPrimario, color: "#fff", border: "none", borderRadius: 7,
  padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12,
});
export const btnSecundario = {
  background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)",
  borderRadius: 7, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 12,
};
export const btnPeligro = {
  background: "var(--danger-bg)", color: "var(--danger-text)", border: "none",
  borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer",
};

export const th = (align = "center") => ({ padding: "7px 8px", textAlign: align, fontWeight: 600, fontSize: 10 });
