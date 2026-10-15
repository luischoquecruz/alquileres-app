import { useMemo, useState } from "react";
import { estadoCuenta, pagoEsDePersona } from "../lib/calculos.js";
import { fmtMoney, fmtDate, round1 } from "../lib/format.js";
import { Vacio } from "../ui.jsx";
import CambiarPassword from "../components/CambiarPassword.jsx";

export default function VistaInquilino({ cfg, sesion, datos, onLogout, onCambiarPassword }) {
  const { personas, servicios, liquidaciones, pagos } = datos;
  const [cambiarPass, setCambiarPass] = useState(false);
  const activas = useMemo(() => personas.filter(p => p.activo !== false), [personas]);
  const persona = useMemo(() => personas.find(p => String(p.id) === String(sesion.personaId)) || null, [sesion, personas]);

  const cuenta = useMemo(() => (persona ? estadoCuenta(persona, liquidaciones, servicios, activas, pagos) : null), [persona, liquidaciones, servicios, activas, pagos]);
  const pendientes = cuenta ? cuenta.periodos.filter(p => p.saldo > 0) : [];
  const deudaTotal = round1(pendientes.reduce((s, p) => s + p.saldo, 0));

  const historial = useMemo(() => (persona
    ? pagos.filter(pg => pg.estado === "Pagado" && pagoEsDePersona(pg, persona)).sort((a, b) => Number(b.id) - Number(a.id))
    : []), [pagos, persona]);

  return (
    <div className="public">
      {cambiarPass && <CambiarPassword cfg={cfg} onGuardar={onCambiarPassword} onClose={() => setCambiarPass(false)} />}
      <div className="public-inner">
        <header className="hero" style={{ textAlign: "left" }}>
          <div className="hero-eyebrow">{cfg.orgNombre} — {cfg.orgSubtitulo}</div>
          <h1 className="hero-title">👋 Hola, {persona ? persona.nombre : sesion.nombre}</h1>
          <p className="hero-sub">{persona?.inmueble || "Panel del inquilino"}</p>
          <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
            <button className="btn btn-sm btn-on-dark" onClick={() => setCambiarPass(true)}>🔑 Contraseña</button>
            <button className="btn btn-sm btn-on-dark" onClick={onLogout}>🚪 Cerrar sesión</button>
          </div>
        </header>

        {!persona && <Vacio icon="🔗">Su usuario no está vinculado a ningún inquilino. Consulte al administrador.</Vacio>}

        {persona && (
          <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="card stat" style={deudaTotal > 0 ? { background: "var(--bg-error)", borderColor: "var(--danger-text)" } : undefined}>
              <div className="stat-label">Saldo pendiente</div>
              <div className={`stat-value ${deudaTotal > 0 ? "text-danger" : "text-ok"}`}>{deudaTotal > 0 ? `Bs.- ${fmtMoney(deudaTotal)}` : "Al día ✅"}</div>
            </div>
            <div className="card stat">
              <div className="stat-label">Total pagado</div>
              <div className="stat-value">Bs.- {fmtMoney(cuenta?.totalPagado || 0)}</div>
            </div>
          </div>
        )}

        {pendientes.length > 0 && (
          <div className="card">
            <div className="card-header card-title">⚠️ Períodos pendientes</div>
            {pendientes.map(p => (
              <div key={p.key} className="list-item" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <div className="grow strong">{p.label}</div>
                <div className="strong num text-danger">Bs.- {fmtMoney(p.saldo)}</div>
              </div>
            ))}
          </div>
        )}

        {persona && (historial.length === 0 ? (
          <Vacio icon="🧾">No hay pagos registrados a su nombre.</Vacio>
        ) : (
          <div className="card">
            <div className="card-header card-title">📋 Historial de pagos ({historial.length})</div>
            {historial.map(s => (
              <div key={s.id} className="list-item" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <div className="grow">
                  <div className="strong">{s.periodoMes} {s.periodoAnio}</div>
                  <div className="item-meta">{fmtDate(s.fecha)} · {cfg.metodosIconos?.[s.metodo] || "💳"} {s.metodo}</div>
                </div>
                <div className="strong num text-accent">Bs.- {fmtMoney(Number(s.total) || 0)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
