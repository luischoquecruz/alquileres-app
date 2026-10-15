import { useState, useRef, useEffect, useMemo } from "react";
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

const btnHeader = { background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, padding: "6px 10px", fontWeight: 600, cursor: "pointer", fontSize: 11 };

export default function VistaAdmin({ cfg, datos, acciones, sesion, cargando, esLocal, onRecargar, onLogout, onConfig, onCambiarPassword, toggleDarkMode, darkMode, notificar }) {
  const { personas, servicios, pagos, liquidaciones, tarifas, usuarios } = datos;
  const isMobile = useMobile();
  const [tab, setTab] = useState("historial");
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const filtrados = useMemo(() => aplicarFiltros(pagos, filtros), [pagos, filtros]);
  const tabRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    const check = () => setHasScroll(el.scrollWidth > el.clientWidth + el.scrollLeft + 4);
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => { el.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [isMobile]);

  const tabs = [
    ["nuevo-pago", "Registrar Pago", "Pago", "💳"],
    ["historial", `Historial (${pagos.length})`, `Hist. (${pagos.length})`, "📋"],
    ["informe", "Resumen Financiero", "Financiero", "📊"],
    ["resumen-persona", "Resumen por Persona", "x Persona", "🧾"],
    ["liquidaciones", "Liquidaciones", "Liq.", "📄"],
    ["tarifas", "Tarifas", "Tarifas", "💰"],
    ["servicios", `Servicios (${servicios.length})`, `Srv. (${servicios.length})`, "📦"],
    ["personas", `Personas (${personas.length})`, `Pers. (${personas.length})`, "👥"],
    ["usuarios", "Usuarios", "Usuarios", "🔐"],
  ];

  const comunes = { cfg, acciones, notificar };
  const contenido = {
    "nuevo-pago": () => <PagoNuevo {...comunes} datos={datos} />,
    historial: () => <Historial {...comunes} pagos={pagos} filtrados={filtrados} filtros={filtros} setFiltros={setFiltros} servicios={servicios} cargando={cargando} esLocal={esLocal} />,
    informe: () => <InformeFinanciero cfg={cfg} filtrados={filtrados} filtros={filtros} setFiltros={setFiltros} servicios={servicios} />,
    "resumen-persona": () => <ResumenPersona cfg={cfg} datos={datos} notificar={notificar} />,
    liquidaciones: () => <VistaLiquidaciones {...comunes} personas={personas} liquidaciones={liquidaciones} servicios={servicios} pagos={pagos} tarifas={tarifas} />,
    tarifas: () => <VistaTarifas {...comunes} tarifas={tarifas} servicios={servicios} />,
    servicios: () => <VistaServicios {...comunes} servicios={servicios} />,
    personas: () => <VistaPersonas {...comunes} personas={personas} />,
    usuarios: () => <VistaUsuarios {...comunes} usuarios={usuarios} personas={personas} sesion={sesion} />,
  };

  const botones = (
    <>
      <button onClick={onConfig} title="Configuración" style={btnHeader}>⚙️{isMobile ? " Config." : ""}</button>
      <button onClick={onRecargar} title="Actualizar datos" style={btnHeader}>{cargando ? "⏳" : "🔄"}</button>
      <button onClick={onCambiarPassword} title="Cambiar contraseña" style={btnHeader}>🔑</button>
      <button onClick={toggleDarkMode} title="Modo oscuro" style={{ ...btnHeader, fontSize: 14 }}>{darkMode ? "☀️" : "🌙"}</button>
      <button onClick={onLogout} title="Cerrar sesión" style={btnHeader}>Salir</button>
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-muted)", display: "flex" }}>
      {!isMobile && (
        <aside className="no-print" style={{ width: 230, flexShrink: 0, background: `linear-gradient(180deg,${cfg.colorPrimario},${cfg.colorAcento})`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "auto" }}>
          <div style={{ padding: "16px 16px 8px", color: "#fff" }}>
            <div style={{ fontSize: 10, opacity: .8, letterSpacing: 2, textTransform: "uppercase" }}>{cfg.orgNombre} — {cfg.orgSubtitulo}</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>Panel Administrador</div>
            <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>👤 {sesion.nombre}</div>
          </div>
          <nav style={{ flex: 1, paddingTop: 4 }}>
            {tabs.map(([id, label, , icon]) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", textAlign: "left", background: tab === id ? "rgba(255,255,255,.12)" : "transparent", color: tab === id ? "#fff" : "rgba(255,255,255,.75)", borderLeft: tab === id ? "3px solid #fff" : "3px solid transparent" }}>
                <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{icon}</span><span>{label}</span>
              </button>
            ))}
          </nav>
          {esLocal && (
            <div style={{ margin: "0 10px 6px", padding: "6px 10px", background: "rgba(255,255,255,.12)", borderRadius: 6, textAlign: "center", color: "#fff", fontSize: 10, fontWeight: 600 }}>📁 Solo local (sin Google Sheets)</div>
          )}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", gap: 6, flexWrap: "wrap" }}>{botones}</div>
        </aside>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {isMobile && (
          <div className="no-print">
            <div style={{ background: `linear-gradient(135deg,${cfg.colorPrimario},${cfg.colorAcento})`, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, opacity: .8, letterSpacing: 2, textTransform: "uppercase" }}>{cfg.orgNombre}</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Panel Administrador {esLocal && <span style={{ fontSize: 9, opacity: .8 }}>· 📁 Local</span>}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{botones}</div>
            </div>
            <div style={{ position: "relative", borderBottom: "1px solid var(--border-light)", background: "var(--bg-card)" }}>
              <div ref={tabRef} style={{ padding: "0 6px", display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
                {tabs.map(([id, , corto, icon]) => (
                  <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
                    style={{ padding: "8px 10px", fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, borderBottom: tab === id ? `3px solid ${cfg.colorAcento}` : "3px solid transparent", background: "transparent", color: tab === id ? cfg.colorAcento : "var(--text-secondary)" }}>
                    {icon} {corto}
                  </button>
                ))}
              </div>
              {hasScroll && (
                <button onClick={() => tabRef.current.scrollBy({ left: 200, behavior: "smooth" })} aria-label="Más pestañas"
                  style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: "var(--bg-card)", border: "1px solid var(--border-light)", cursor: "pointer", fontSize: 14, color: "var(--text-secondary)", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }}>›</button>
              )}
            </div>
          </div>
        )}
        <main style={{ padding: isMobile ? 12 : 20, maxWidth: 1200, margin: "0 auto", flex: 1, width: "100%", boxSizing: "border-box" }}>
          {contenido[tab]()}
        </main>
      </div>
    </div>
  );
}
