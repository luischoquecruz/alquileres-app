import { useState, useMemo, useEffect } from "react";
import { useMobile } from "../../hooks/useMobile.js";
import PagoNuevo from "./PagoNuevo.jsx";
import Historial from "./Historial.jsx";
import InformeFinanciero from "./InformeFinanciero.jsx";
import ResumenPersona from "./ResumenPersona.jsx";
import VistaLiquidaciones from "./VistaLiquidaciones.jsx";
import VistaServicios from "./VistaServicios.jsx";
import VistaPersonas from "./VistaPersonas.jsx";
import VistaTarifas from "./VistaTarifas.jsx";
import VistaUsuarios from "./VistaUsuarios.jsx";
import { filtrosIniciales, aplicarFiltros } from "../../lib/filtros.js";

// Secciones agrupadas; `corto` se usa en la navegación inferior del celular.
const GRUPOS = [
  ["Operación", [
    { id: "nuevo-pago", label: "Registrar Pago", corto: "Cobrar", icon: "💳" },
    { id: "historial", label: "Historial", corto: "Historial", icon: "📋", cuenta: d => d.pagos.length },
    { id: "liquidaciones", label: "Liquidaciones", corto: "Liquidar", icon: "📄" },
    { id: "tarifas", label: "Tarifas", corto: "Tarifas", icon: "💰" },
  ]],
  ["Reportes", [
    { id: "informe", label: "Resumen Financiero", corto: "Finanzas", icon: "📊" },
    { id: "resumen-persona", label: "Resumen por Persona", corto: "Por persona", icon: "🧾" },
  ]],
  ["Administración", [
    { id: "personas", label: "Personas", corto: "Personas", icon: "👥", cuenta: d => d.personas.length },
    { id: "servicios", label: "Servicios", corto: "Servicios", icon: "📦", cuenta: d => d.servicios.length },
    { id: "usuarios", label: "Usuarios", corto: "Usuarios", icon: "🔐" },
  ]],
];
const SECCIONES = GRUPOS.flatMap(([, items]) => items);
const NAV_MOVIL = ["nuevo-pago", "historial", "liquidaciones", "personas"];

const nombreAccesible = (s, datos) => `${s.icon} ${s.label}${s.cuenta ? ` (${s.cuenta(datos)})` : ""}`;

export default function VistaAdmin({ cfg, datos, acciones, sesion, cargando, esLocal, onRecargar, onLogout, onConfig, onCambiarPassword, toggleDarkMode, darkMode, notificar }) {
  const { personas, servicios, pagos, liquidaciones, tarifas, usuarios } = datos;
  const isMobile = useMobile();
  const [tab, setTab] = useState("historial");
  const [masAbierto, setMasAbierto] = useState(false);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const filtrados = useMemo(() => aplicarFiltros(pagos, filtros), [pagos, filtros]);

  const ir = id => {
    setTab(id);
    setMasAbierto(false);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (!masAbierto) return;
    const esc = e => { if (e.key === "Escape") setMasAbierto(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [masAbierto]);

  const comunes = { cfg, acciones, notificar };
  const contenido = {
    "nuevo-pago": () => <PagoNuevo {...comunes} datos={datos} />,
    historial: () => <Historial {...comunes} pagos={pagos} personas={personas} filtrados={filtrados} filtros={filtros} setFiltros={setFiltros} servicios={servicios} cargando={cargando} esLocal={esLocal} />,
    informe: () => <InformeFinanciero cfg={cfg} notificar={notificar} filtrados={filtrados} filtros={filtros} setFiltros={setFiltros} servicios={servicios} />,
    "resumen-persona": () => <ResumenPersona cfg={cfg} datos={datos} notificar={notificar} />,
    liquidaciones: () => <VistaLiquidaciones {...comunes} personas={personas} liquidaciones={liquidaciones} servicios={servicios} pagos={pagos} tarifas={tarifas} />,
    tarifas: () => <VistaTarifas {...comunes} tarifas={tarifas} servicios={servicios} />,
    servicios: () => <VistaServicios {...comunes} servicios={servicios} />,
    personas: () => <VistaPersonas {...comunes} personas={personas} />,
    usuarios: () => <VistaUsuarios {...comunes} usuarios={usuarios} personas={personas} sesion={sesion} />,
  };

  const inicial = String(sesion.nombre || "?").charAt(0).toUpperCase();

  return (
    <div className="admin">
      {!isMobile && (
        <aside className="sidebar no-print">
          <div className="sidebar-brand">
            <div className="sidebar-org">{cfg.orgNombre}</div>
            <div className="sidebar-title">Panel Administrador</div>
          </div>
          <nav aria-label="Secciones">
            {GRUPOS.map(([grupo, items]) => (
              <div key={grupo} className="nav-group">
                <div className="nav-group-label">{grupo}</div>
                {items.map(s => (
                  <button key={s.id} className="nav-item" onClick={() => ir(s.id)} aria-current={tab === s.id ? "page" : undefined} aria-label={nombreAccesible(s, datos)}>
                    <span className="nav-icon" aria-hidden="true">{s.icon}</span>
                    <span>{s.label}</span>
                    {s.cuenta && <span className="nav-count" aria-hidden="true">{s.cuenta(datos)}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            {esLocal && <div className="local-badge" style={{ margin: "0 0 12px" }}>📁 Solo local (sin Google Sheets)</div>}
            <div className="user-chip">
              <div className="avatar" aria-hidden="true">{inicial}</div>
              <div className="grow">
                <div className="strong truncate">{sesion.nombre}</div>
                <div className="xsmall" style={{ opacity: .7 }}>Administrador</div>
              </div>
            </div>
            <div className="sidebar-tools">
              <button className="btn btn-sm btn-on-dark" onClick={onRecargar} title="Actualizar datos" aria-label="Actualizar datos">{cargando ? "⏳" : "🔄"}</button>
              <button className="btn btn-sm btn-on-dark" onClick={onConfig} title="Configuración" aria-label="Configuración">⚙️</button>
              <button className="btn btn-sm btn-on-dark" onClick={onCambiarPassword} title="Cambiar contraseña" aria-label="Cambiar contraseña">🔑</button>
              <button className="btn btn-sm btn-on-dark" onClick={toggleDarkMode} title="Modo oscuro" aria-label="Cambiar modo oscuro">{darkMode ? "☀️" : "🌙"}</button>
            </div>
            <button className="btn btn-sm btn-on-dark btn-block" style={{ marginTop: 8 }} onClick={onLogout}>Salir</button>
          </div>
        </aside>
      )}

      <div className="admin-main">
        {isMobile && (
          <header className="topbar no-print">
            <div className="topbar-title">
              <div className="topbar-org truncate">{cfg.orgNombre}{esLocal ? " · 📁 Local" : ""}</div>
              <div className="topbar-section">Panel Administrador</div>
            </div>
            <button className="btn btn-icon" onClick={onRecargar} aria-label="Actualizar datos">{cargando ? "⏳" : "🔄"}</button>
            <button className="btn btn-icon" onClick={toggleDarkMode} aria-label="Cambiar modo oscuro">{darkMode ? "☀️" : "🌙"}</button>
          </header>
        )}

        <main className="admin-content">{contenido[tab]()}</main>
      </div>

      {isMobile && (
        <>
          <nav className="bottom-nav no-print" aria-label="Secciones principales">
            {NAV_MOVIL.map(id => {
              const s = SECCIONES.find(x => x.id === id);
              return (
                <button key={id} onClick={() => ir(id)} aria-current={tab === id ? "page" : undefined}>
                  <span className="nav-icon" aria-hidden="true">{s.icon}</span>{s.corto}
                </button>
              );
            })}
            <button onClick={() => setMasAbierto(true)} aria-current={!NAV_MOVIL.includes(tab) ? "page" : undefined} aria-haspopup="dialog">
              <span className="nav-icon" aria-hidden="true">☰</span>Más
            </button>
          </nav>

          {masAbierto && (
            <>
              <div className="sheet-backdrop" onClick={() => setMasAbierto(false)} />
              <div className="sheet" role="dialog" aria-modal="true" aria-label="Más opciones">
                <div className="sheet-handle" />
                <div className="user-chip" style={{ padding: "0 4px" }}>
                  <div className="avatar" aria-hidden="true">{inicial}</div>
                  <div className="grow">
                    <div className="strong truncate">{sesion.nombre}</div>
                    <div className="xsmall muted">Administrador</div>
                  </div>
                </div>
                {GRUPOS.map(([grupo, items]) => (
                  <div key={grupo}>
                    <div className="sheet-section">{grupo}</div>
                    <div className="sheet-grid">
                      {items.map(s => (
                        <button key={s.id} className="sheet-tile" onClick={() => ir(s.id)} aria-current={tab === s.id ? "page" : undefined}>
                          <span className="nav-icon" aria-hidden="true">{s.icon}</span>
                          {s.label}{s.cuenta ? ` (${s.cuenta(datos)})` : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="sheet-section">Cuenta</div>
                <div className="sheet-list">
                  <button onClick={() => { setMasAbierto(false); onConfig(); }}><span aria-hidden="true">⚙️</span> Configuración</button>
                  <button onClick={() => { setMasAbierto(false); onCambiarPassword(); }}><span aria-hidden="true">🔑</span> Cambiar contraseña</button>
                  <button onClick={onLogout} className="text-danger"><span aria-hidden="true">🚪</span> Cerrar sesión</button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
