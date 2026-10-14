import { useMobile } from "../../hooks/useMobile.js";
import { Label } from "../../ui.jsx";

const inp2 = { border: "1px solid var(--border)", borderRadius: 7, padding: "7px 10px", fontSize: 12, boxSizing: "border-box", background: "var(--bg-card)", color: "var(--text-main)", width: "100%" };

export default function FiltrosPagos({ filtros, setFiltros, metodos }) {
  const isMobile = useMobile();
  const set = (k, v) => setFiltros(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 12, marginBottom: 14, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 8 }}>
        <div><Label size={10}>Desde</Label><input type="date" value={filtros.desde} onChange={e => set("desde", e.target.value)} style={inp2} /></div>
        <div><Label size={10}>Hasta</Label><input type="date" value={filtros.hasta} onChange={e => set("hasta", e.target.value)} style={inp2} /></div>
        <div><Label size={10}>Inquilino</Label><input value={filtros.inquilino} onChange={e => set("inquilino", e.target.value)} style={inp2} placeholder="Buscar..." /></div>
        <div><Label size={10}>Método</Label>
          <select value={filtros.metodo} onChange={e => set("metodo", e.target.value)} style={inp2}>
            <option value="">Todos</option>{metodos.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div><Label size={10}>Estado</Label>
          <select value={filtros.estado} onChange={e => set("estado", e.target.value)} style={inp2}>
            <option value="">Todos</option><option value="Pagado">Pagado</option><option value="Pendiente">Pendiente</option>
          </select>
        </div>
      </div>
    </div>
  );
}
