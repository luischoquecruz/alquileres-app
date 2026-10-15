import { useState, useEffect, useMemo } from "react";
import { useDatos } from "./hooks/useDatos.js";
import { local, KEYS } from "./lib/storage.js";
import { Avisos } from "./ui.jsx";
import LoginModal from "./components/LoginModal.jsx";
import PanelConfig from "./components/PanelConfig.jsx";
import CambiarPassword from "./components/CambiarPassword.jsx";
import VistaPublica from "./views/VistaPublica.jsx";
import VistaInquilino from "./views/VistaInquilino.jsx";
import VistaAdmin from "./views/admin/VistaAdmin.jsx";

export default function App() {
  const store = useDatos();
  const { datos, sesion, acciones } = store;
  const [darkMode, setDarkMode] = useState(() => local.get(KEYS.darkMode, local.get("alquileres_config")?.darkMode ?? false));
  // Enlaces antiguos con #admin ya no dan acceso: solo abren el login
  const [loginOpen, setLoginOpen] = useState(() => window.location.hash === "#admin" && !sesion);
  const [showConfig, setShowConfig] = useState(false);
  const [cambiarPass, setCambiarPass] = useState(null); // null | "voluntario" | "obligatorio"

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    local.set(KEYS.darkMode, darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (window.location.hash === "#admin") history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const cfg = useMemo(() => {
    const c = datos.config;
    if (!darkMode) return c;
    return { ...c, colorPrimario: c.darkColorPrimario, colorAcento: c.darkColorAcento, colorFondo: c.darkColorFondo, colorFondoAlt: c.darkColorFondoAlt };
  }, [datos.config, darkMode]);

  useEffect(() => { document.title = datos.config.appTitulo; }, [datos.config.appTitulo]);

  // Los colores configurables se exponen como variables CSS para todo el sistema de diseño
  useEffect(() => {
    const root = document.documentElement.style;
    if (cfg.colorPrimario) root.setProperty("--primary", cfg.colorPrimario);
    if (cfg.colorAcento) root.setProperty("--accent", cfg.colorAcento);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", cfg.colorPrimario || "#065f46");
  }, [cfg.colorPrimario, cfg.colorAcento]);

  const toggleDarkMode = () => setDarkMode(d => !d);

  const handleLogin = async (usuario, password) => {
    const r = await store.login(usuario, password);
    if (r.ok) {
      setLoginOpen(false);
      if (r.debeCambiarPassword) setCambiarPass("obligatorio");
    }
    return r;
  };

  const cambiarPassword = async (actual, nueva) => !!(await acciones.cambiarPassword(actual, nueva));

  let vista;
  if (sesion?.rol === "admin") {
    vista = (
      <VistaAdmin cfg={cfg} datos={datos} acciones={acciones} sesion={sesion} cargando={store.cargando} esLocal={store.esLocal}
        onRecargar={store.cargar} onLogout={store.logout} onConfig={() => setShowConfig(true)} onCambiarPassword={() => setCambiarPass("voluntario")}
        toggleDarkMode={toggleDarkMode} darkMode={darkMode} notificar={store.notificar} />
    );
  } else if (sesion?.rol === "inquilino") {
    vista = <VistaInquilino cfg={cfg} sesion={sesion} datos={datos} onLogout={store.logout} onCambiarPassword={cambiarPassword} />;
  } else {
    vista = (
      <VistaPublica cfg={cfg} datos={datos} esLocal={store.esLocal} errorCarga={store.errorCarga} cargando={store.cargando}
        onLoginClick={() => setLoginOpen(true)} toggleDarkMode={toggleDarkMode} darkMode={darkMode}
        onSetUrl={store.setGasUrl} notificar={store.notificar} />
    );
  }

  return (
    <>
      {vista}
      {loginOpen && !sesion && <LoginModal cfg={cfg} onLogin={handleLogin} onClose={() => setLoginOpen(false)} />}
      {showConfig && sesion?.rol === "admin" && (
        <PanelConfig config={datos.config} gasUrl={store.gasUrl} onClose={() => setShowConfig(false)}
          onGuardar={async c => !!(await acciones.guardarConfig(c))} onCambiarUrl={store.setGasUrl} />
      )}
      {cambiarPass && sesion && (
        <CambiarPassword cfg={cfg} obligatorio={cambiarPass === "obligatorio"} onGuardar={cambiarPassword} onClose={() => setCambiarPass(null)} />
      )}
      <Avisos avisos={store.avisos} />
    </>
  );
}
