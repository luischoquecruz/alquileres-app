import { useState, useMemo } from "react";
import { getLiq, estadoCuenta } from "../lib/calculos.js";
import { emptyForm, fmtMoney, round1 } from "../lib/format.js";
import { BotonWhatsApp, Field, Mensaje, PeriodoSelector } from "../ui.jsx";
import { compartirWhatsApp, textoEstadoCuenta } from "../lib/whatsapp.js";
import BuscadorPersonas from "../components/BuscadorPersonas.jsx";
import DetalleMontos from "../components/DetalleMontos.jsx";
import { useMontos } from "../hooks/useMontos.js";
import { imprimirDeuda } from "../print/reportes.js";

export default function VistaPublica({ cfg, datos, esLocal, errorCarga, cargando, onLoginClick, toggleDarkMode, darkMode, onSetUrl, notificar }) {
  const { personas, servicios, liquidaciones, tarifas, pagos } = datos;
  const [form, setForm] = useState(emptyForm());
  const [setupUrl, setSetupUrl] = useState("");

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
    <div className="public">
      <div className="public-inner">
        <header className="hero">
          <div className="hero-eyebrow">{cfg.orgNombre} — {cfg.orgSubtitulo}</div>
          <h1 className="hero-title">{cfg.appTitulo}</h1>
          <p className="hero-sub">{cfg.appSubtitulo}</p>
        </header>

        {esLocal && personas.length === 0 && (
          <div className="card card-body stack-sm" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30 }} aria-hidden="true">🔗</div>
            <div className="card-title">Conectar con Google Sheets</div>
            <p className="small muted">Ingrese la URL de su despliegue de Google Apps Script para sincronizar los datos.</p>
            <input className="input input-mono" value={setupUrl} onChange={e => setSetupUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." aria-label="URL de Apps Script" />
            <button className="btn btn-primary btn-block" onClick={() => onSetUrl(setupUrl)} disabled={!setupUrl.trim()}>Conectar y cargar datos</button>
          </div>
        )}

        <Mensaje tipo="error">{errorCarga && `No se pudieron cargar los datos: ${errorCarga}`}</Mensaje>

        <div className="card card-body stack">
          <Field as="div" label="Inquilino">
            <BuscadorPersonas personas={activas} value={form.personaId} onChange={p => setForm(prev => ({ ...prev, personaId: String(p.id), inquilino: p.nombre }))}
              placeholder={cargando && personas.length === 0 ? "Cargando…" : "Busque su nombre"} />
          </Field>
          <Field as="div" label="Período">
            <PeriodoSelector mes={form.periodoMes} anio={form.periodoAnio} periodos={Object.keys(liquidaciones)} etiquetaPeriodos="Disponibles:"
              onChange={(m, a) => setForm(p => ({ ...p, periodoMes: m, periodoAnio: a }))} />
          </Field>

          {!liqPeriodo && !cargando && (
            <Mensaje tipo="warn">⚠️ No hay liquidación para {form.periodoMes} {form.periodoAnio}. Elija uno de los períodos disponibles o consulte al administrador.</Mensaje>
          )}

          {listo && liqPeriodo && <DetalleMontos liqPeriodo={liqPeriodo} periodoLabel={`${form.periodoMes} ${form.periodoAnio}`} calculo={calculo} />}

          {deuda.total > 0 && (
            <div className="stack-sm">
              <div className="row-between">
                <div className="strong text-danger">⚠️ Deuda acumulada — Bs.- {fmtMoney(deuda.total)}</div>
                <div className="row">
                  <button className="btn btn-secondary btn-sm" onClick={imprimir}>🖨️ Imprimir</button>
                  <BotonWhatsApp className="btn-sm" notificar={notificar} title="Compartir el detalle de la deuda por WhatsApp"
                    onCompartir={() => compartirWhatsApp({ texto: textoEstadoCuenta({ cfg, nombre: personaSel.nombre, periodos: deuda.periodos, servicios, soloDeuda: true }), codigoPais: cfg.codigoPais })}>
                    Compartir
                  </BotonWhatsApp>
                </div>
              </div>
              <div className="table-wrap table-stack">
                <table className="table">
                  <thead>
                    <tr><th>Período</th><th>Servicios</th><th className="r">Pagado</th><th className="r">Saldo</th></tr>
                  </thead>
                  <tbody>
                    {deuda.periodos.map(d => (
                      <tr key={d.key}>
                        <td className="cell-head strong">{d.label}</td>
                        <td data-label="Servicios">
                          <span>
                            {serviciosConDeuda.filter(s => d.detalles[s.id] > 0).map(s => (
                              <span key={s.id} className="xsmall nowrap" style={{ display: "block" }}>{s.icon} Bs.- {fmtMoney(d.detalles[s.id])}</span>
                            ))}
                            <span className="strong num" style={{ display: "block" }}>Bs.- {fmtMoney(d.debe)}</span>
                          </span>
                        </td>
                        <td className="r num" data-label="Pagado">Bs.- {fmtMoney(d.pagado)}</td>
                        <td className="r num strong text-danger" data-label="Saldo">Bs.- {fmtMoney(d.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {listo && <p className="xsmall muted" style={{ textAlign: "center" }}>🔐 Los pagos los registra el administrador.</p>}
        </div>

        <footer className="public-footer">
          <button className="btn btn-ghost" onClick={onLoginClick}>🔐 Iniciar sesión</button>
          <button className="btn btn-ghost btn-icon" onClick={toggleDarkMode} aria-label="Cambiar modo oscuro">{darkMode ? "☀️" : "🌙"}</button>
        </footer>
      </div>
    </div>
  );
}
