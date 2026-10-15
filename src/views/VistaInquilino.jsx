import { useMemo, useState } from "react";
import { estadoCuenta, pagoEsDePersona } from "../lib/calculos.js";
import { fmtMoney, fmtDate, round1 } from "../lib/format.js";
import { useMobile } from "../hooks/useMobile.js";
import { Vacio } from "../ui.jsx";
import CambiarPassword from "../components/CambiarPassword.jsx";

export default function VistaInquilino({ cfg, sesion, datos, onLogout, onCambiarPassword }) {
  const { personas, servicios, liquidaciones, pagos } = datos;
  const isMobile = useMobile();
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
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${cfg.colorFondo} 0%,${cfg.colorFondoAlt} 100%)`, padding: isMobile ? "16px 10px" : "24px 16px" }}>
      {cambiarPass && <CambiarPassword cfg={cfg} onGuardar={onCambiarPassword} onClose={() => setCambiarPass(false)} />}
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: `linear-gradient(135deg,${cfg.colorPrimario},${cfg.colorAcento})`, borderRadius: 16, padding: isMobile ? 16 : "20px 24px", marginBottom: 20, color: "#fff" }}>
          <div style={{ fontSize: 10, opacity: .7, letterSpacing: 2 }}>{cfg.orgNombre} — {cfg.orgSubtitulo}</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>👋 Hola, {persona ? persona.nombre : sesion.nombre}</div>
          <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>Panel del inquilino</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={() => setCambiarPass(true)} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🔑 Contraseña</button>
            <button onClick={onLogout} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🚪 Cerrar sesión</button>
          </div>
        </div>

        {!persona && <Vacio>Su usuario no está vinculado a ningún inquilino. Consulte al administrador.</Vacio>}

        {deudaTotal > 0 && (
          <div style={{ background: "var(--bg-error)", border: "1px solid var(--danger-text)", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "var(--danger-text)", fontWeight: 600, fontSize: 13 }}>⚠️ Saldo pendiente</div>
              <div style={{ color: "var(--danger-text)", fontWeight: 900, fontSize: 20 }}>Bs.- {fmtMoney(deudaTotal)}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--danger-text)" }}>
              {pendientes.map(p => <span key={p.key} style={{ marginRight: 10 }}>{p.label}: Bs.- {fmtMoney(p.saldo)}</span>)}
            </div>
          </div>
        )}

        {persona && (historial.length === 0 ? (
          <Vacio>No hay pagos registrados a su nombre.</Vacio>
        ) : (
          <div style={{ background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-light)", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 14, color: "var(--text-main)", borderBottom: "1px solid var(--border-light)" }}>
              📋 Historial de pagos ({historial.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "var(--text-main)" }}>
                <thead>
                  <tr style={{ background: cfg.colorPrimario, color: "#fff" }}>
                    <th style={{ padding: "7px 8px", textAlign: "left", fontSize: 10 }}>Fecha</th>
                    <th style={{ padding: "7px 8px", fontSize: 10 }}>Período</th>
                    <th style={{ padding: "7px 8px", fontSize: 10 }}>Total</th>
                    <th style={{ padding: "7px 8px", fontSize: 10 }}>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>{fmtDate(s.fecha)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>{s.periodoMes} {s.periodoAnio}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: cfg.colorAcento }}>Bs.- {fmtMoney(Number(s.total) || 0)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>{s.metodo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
