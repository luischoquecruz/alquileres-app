import { useState, useMemo } from "react";
import { getLiq, estadoCuenta } from "../lib/calculos.js";
import { emptyForm, meses, fmtMoney, round1 } from "../lib/format.js";
import { useMobile } from "../hooks/useMobile.js";
import { inp } from "../estilos.js";
import { Label, Mensaje } from "../ui.jsx";
import BuscadorPersonas from "../components/BuscadorPersonas.jsx";
import DetalleMontos from "../components/DetalleMontos.jsx";
import { useMontos } from "../hooks/useMontos.js";
import { imprimirDeuda } from "../print/reportes.js";

export default function VistaPublica({ cfg, datos, esLocal, errorCarga, cargando, onLoginClick, toggleDarkMode, darkMode, onSetUrl, notificar }) {
  const { personas, servicios, liquidaciones, tarifas, pagos } = datos;
  const [form, setForm] = useState(emptyForm());
  const [setupUrl, setSetupUrl] = useState("");
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isMobile = useMobile();

  const activas = useMemo(() => personas.filter(p => p.activo !== false), [personas]);
  const liqPeriodo = getLiq(liquidaciones, form.periodoMes, form.periodoAnio);
  const personaSel = personas.find(p => String(p.id) === String(form.personaId));
  const calculo = useMontos(servicios, liqPeriodo, personaSel, activas);

  const deuda = useMemo(() => {
    if (!personaSel) return { periodos: [], total: 0 };
    const periodos = estadoCuenta(personaSel, liquidaciones, servicios, activas, pagos).periodos.filter(p => p.saldo > 0);
    return { periodos, total: round1(periodos.reduce((s, p) => s + p.saldo, 0)) };
  }, [personaSel, liquidaciones, servicios, activas, pagos]);

  const imprimir = () => {
    if (!imprimirDeuda({ cfg, persona: personaSel, periodos: deuda.periodos, servicios, tarifas })) {
      notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");
    }
  };

  const listo = form.personaId && form.periodoMes && form.periodoAnio;
  const serviciosConDeuda = servicios.filter(s => deuda.periodos.some(d => d.detalles[s.id] > 0));

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${cfg.colorFondo} 0%,${cfg.colorFondoAlt} 100%)`, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "16px 10px" : "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 600 }}>
        <div style={{ background: `linear-gradient(135deg,${cfg.colorPrimario},${cfg.colorAcento})`, borderRadius: 16, padding: isMobile ? 16 : "22px 24px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: isMobile ? 10 : 11, letterSpacing: 3, opacity: .8, textTransform: "uppercase", marginBottom: 4 }}>{cfg.orgNombre} — {cfg.orgSubtitulo}</div>
          <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800 }}>{cfg.appTitulo}</h1>
          <div style={{ fontSize: isMobile ? 11 : 12, opacity: .75, marginTop: 4 }}>{cfg.appSubtitulo}</div>
        </div>

        {esLocal && personas.length === 0 && (
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: isMobile ? 16 : 24, marginBottom: 20, boxShadow: "var(--shadow-md)", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-main)", marginBottom: 6 }}>Conectar con Google Sheets</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
              Ingrese la URL de su despliegue de Google Apps Script para sincronizar los datos.
            </div>
            <input value={setupUrl} onChange={e => setSetupUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." style={{ ...inp, fontFamily: "monospace", fontSize: 12, marginBottom: 10 }} />
            <button onClick={() => onSetUrl(setupUrl)} disabled={!setupUrl.trim()}
              style={{ width: "100%", background: setupUrl.trim() ? cfg.colorPrimario : "var(--text-muted)", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontWeight: 700, cursor: setupUrl.trim() ? "pointer" : "not-allowed", fontSize: 13 }}>
              Conectar y cargar datos
            </button>
          </div>
        )}

        <Mensaje tipo="error">{errorCarga && `No se pudieron cargar los datos: ${errorCarga}`}</Mensaje>

        {!liqPeriodo && !cargando && (
          <div style={{ background: "var(--bg-warning)", border: "1px solid var(--star)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "var(--star)", fontSize: 12, textAlign: "center" }}>
            ⚠️ No hay liquidación configurada para {form.periodoMes} {form.periodoAnio}. Consulte al administrador.
          </div>
        )}

        <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: isMobile ? 16 : 24, boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <Label size={12}>Inquilino *</Label>
              <BuscadorPersonas personas={activas} value={form.personaId} onChange={p => setForm(prev => ({ ...prev, personaId: String(p.id), inquilino: p.nombre }))}
                placeholder={cargando && personas.length === 0 ? "Cargando..." : undefined} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label size={12}>Período (Mes) *</Label>
                <select value={form.periodoMes} onChange={e => setF("periodoMes", e.target.value)} style={inp}>
                  {meses.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label size={12}>Año</Label>
                <input type="number" value={form.periodoAnio} onChange={e => setF("periodoAnio", e.target.value)} style={inp} />
              </div>
            </div>

            {listo && <DetalleMontos cfg={cfg} liqPeriodo={liqPeriodo} periodoLabel={`${form.periodoMes} ${form.periodoAnio}`} calculo={calculo} />}

            {listo && (
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 14, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                🔐 Los pagos los registra el administrador.
                <button onClick={onLoginClick} style={{ background: "none", border: "none", color: cfg.colorAcento, cursor: "pointer", fontWeight: 600, textDecoration: "underline", marginLeft: 4, fontSize: 12 }}>Iniciar sesión</button>
              </div>
            )}

            {deuda.total > 0 && (
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--danger-text)" }}>⚠️ Deuda acumulada — Bs.- {fmtMoney(deuda.total)}</div>
                  <button onClick={imprimir} style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>🖨️ Imprimir</button>
                </div>
                <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, color: "var(--text-main)" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-error)", color: "var(--danger-text)" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 10 }}>Período</th>
                        <th style={{ padding: "6px 8px", fontSize: 10 }}>Servicios</th>
                        <th style={{ padding: "6px 8px", fontSize: 10 }}>Pagado</th>
                        <th style={{ padding: "6px 8px", fontSize: 10 }}>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deuda.periodos.map((d, i) => (
                        <tr key={d.key} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-muted)" }}>
                          <td style={{ padding: "5px 8px", fontWeight: 600, verticalAlign: "top" }}>{d.label}</td>
                          <td style={{ padding: "5px 8px", textAlign: "center" }}>
                            {serviciosConDeuda.filter(s => d.detalles[s.id] > 0).map(s => (
                              <div key={s.id} style={{ fontSize: 10, whiteSpace: "nowrap" }}>{s.icon} Bs.- {fmtMoney(d.detalles[s.id])}</div>
                            ))}
                            <div style={{ fontWeight: 700, marginTop: 2, borderTop: "1px solid var(--border-light)", paddingTop: 2 }}>Bs.- {fmtMoney(d.debe)}</div>
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center" }}>Bs.- {fmtMoney(d.pagado)}</td>
                          <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: 700, color: "var(--danger-text)" }}>Bs.- {fmtMoney(d.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, display: "flex", justifyContent: "center", gap: 16, alignItems: "center" }}>
          <button onClick={onLoginClick} style={{ background: "none", border: "none", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", textDecoration: "underline" }}>🔐 Iniciar sesión</button>
          <button onClick={toggleDarkMode} aria-label="Cambiar modo oscuro" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>{darkMode ? "☀️" : "🌙"}</button>
        </div>
      </div>
    </div>
  );
}
