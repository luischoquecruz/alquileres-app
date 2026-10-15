import { useState } from "react";
import { useMobile } from "../../hooks/useMobile.js";
import { Field } from "../../ui.jsx";
import { filtrosIniciales } from "../../lib/filtros.js";

export default function FiltrosPagos({ filtros, setFiltros, metodos }) {
  const isMobile = useMobile();
  const [abierto, setAbierto] = useState(false);
  const set = (k, v) => setFiltros(p => ({ ...p, [k]: v }));
  const base = filtrosIniciales();
  const activos = Object.entries(filtros).filter(([k, v]) => v && v !== base[k]).length;

  const campos = (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: 12 }}>
      <Field label="Desde"><input className="input" type="date" value={filtros.desde} onChange={e => set("desde", e.target.value)} /></Field>
      <Field label="Hasta"><input className="input" type="date" value={filtros.hasta} onChange={e => set("hasta", e.target.value)} /></Field>
      <Field label="Inquilino" className={isMobile ? "span-all" : ""}><input className="input" value={filtros.inquilino} onChange={e => set("inquilino", e.target.value)} placeholder="Buscar…" /></Field>
      <Field label="Método">
        <select className="select" value={filtros.metodo} onChange={e => set("metodo", e.target.value)}>
          <option value="">Todos</option>{metodos.map(m => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Estado">
        <select className="select" value={filtros.estado} onChange={e => set("estado", e.target.value)}>
          <option value="">Todos</option><option value="Pagado">Pagado</option><option value="Pendiente">Pendiente</option>
        </select>
      </Field>
    </div>
  );

  if (!isMobile) return <div className="card card-body" style={{ marginBottom: 16, padding: 16 }}>{campos}</div>;

  // En el celular los filtros se pliegan para no ocupar media pantalla
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <button type="button" className="collapse-trigger" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}>
        <span className="grow strong">🔎 Filtros{activos ? <span className="badge badge-accent" style={{ marginLeft: 8 }}>{activos} activo(s)</span> : null}</span>
        <span className="chevron" aria-hidden="true">▼</span>
      </button>
      {abierto && (
        <div style={{ padding: "0 16px 16px" }}>
          {campos}
          {activos > 0 && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setFiltros(filtrosIniciales())}>Limpiar filtros</button>}
        </div>
      )}
    </div>
  );
}
