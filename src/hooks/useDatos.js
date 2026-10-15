import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { crearApi, leerSesionGuardada, borrarSesion } from "../api/client.js";
import { CONFIG_DEFAULT, GAS_URL_DEFAULT, SERVICIOS_POR_DEFECTO, limpiarConfig } from "../config.js";
import { vincularPagos } from "../lib/calculos.js";
import { local, KEYS } from "../lib/storage.js";

const VACIO = { config: CONFIG_DEFAULT, personas: [], servicios: SERVICIOS_POR_DEFECTO, tarifas: {}, liquidaciones: {}, pagos: [], usuarios: [] };

// La URL guardada por versiones anteriores ("alquileres_config".appsScriptUrl) se ignora a propósito:
// apuntaba a la implementación antigua de Apps Script, incompatible con este frontend.
const urlInicial = () => local.get(KEYS.gasUrl) ?? GAS_URL_DEFAULT;

const normalizar = data => {
  const personas = data.personas || [];
  return {
    config: limpiarConfig(data.config),
    personas,
    servicios: data.servicios?.length ? data.servicios : SERVICIOS_POR_DEFECTO,
    tarifas: data.tarifas || {},
    liquidaciones: data.liquidaciones || {},
    pagos: vincularPagos(data.pagos || [], personas),
    usuarios: data.usuarios || [],
  };
};

const reemplazar = (lista, obj) => {
  const i = lista.findIndex(x => String(x.id) === String(obj.id));
  return i >= 0 ? lista.map((x, j) => (j === i ? obj : x)) : [...lista, obj];
};
const quitar = (lista, id) => lista.filter(x => String(x.id) !== String(id));

export function useDatos() {
  const [gasUrl, setGasUrlState] = useState(urlInicial);
  const [sesion, setSesion] = useState(() => leerSesionGuardada()?.sesion || null);
  const [datos, setDatos] = useState(() => (sesion ? VACIO : normalizar({ ...VACIO, ...local.get(KEYS.cache, {}) })));
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [avisos, setAvisos] = useState([]);
  const sembrado = useRef(false);

  const notificar = useCallback((texto, tipo = "ok") => {
    const id = Date.now() + Math.random();
    setAvisos(a => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos(a => a.filter(x => x.id !== id)), tipo === "error" ? 7000 : 3500);
  }, []);

  const api = useMemo(() => crearApi(gasUrl, {
    onSesionExpirada: () => { setSesion(null); notificar("Su sesión expiró. Inicie sesión nuevamente.", "error"); },
  }), [gasUrl, notificar]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const j = await api.bootstrap();
      const nuevos = normalizar(j.data);
      setDatos(nuevos);
      setErrorCarga("");
      if (!j.sesion && leerSesionGuardada()) setSesion(null);
      if (!j.sesion) local.set(KEYS.cache, j.data); // solo se cachean datos públicos
      // Primera vez con hoja de servicios vacía: guarda los servicios por defecto
      if (j.sesion?.rol === "admin" && !j.data.servicios?.length && !sembrado.current) {
        sembrado.current = true;
        for (const [orden, s] of SERVICIOS_POR_DEFECTO.entries()) await api.call("upsertServicio", { servicio: { ...s, orden } });
      }
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  // Aplica el cambio en pantalla de inmediato y lo envía al backend; si falla, avisa y recarga.
  const mutar = useCallback(async (action, payload, aplicar, mensajeOk) => {
    if (aplicar) setDatos(aplicar);
    try {
      const r = await api.call(action, payload);
      if (mensajeOk) notificar(mensajeOk);
      return r;
    } catch (e) {
      notificar(e.message, "error");
      cargar();
      return null;
    }
  }, [api, cargar, notificar]);

  const acciones = useMemo(() => ({
    guardarConfig: config => mutar("saveConfig", { config }, d => ({ ...d, config: limpiarConfig(config) }), "Configuración guardada"),
    guardarPersona: persona => mutar("upsertPersona", { persona }, d => ({ ...d, personas: reemplazar(d.personas, persona) })),
    eliminarPersona: id => mutar("deletePersona", { id }, d => ({ ...d, personas: quitar(d.personas, id) })),
    guardarServicio: servicio => mutar("upsertServicio", { servicio }, d => ({ ...d, servicios: reemplazar(d.servicios, servicio) })),
    eliminarServicio: id => mutar("deleteServicio", { id }, d => ({ ...d, servicios: quitar(d.servicios, id) })),
    guardarTarifa: (clave, datosTarifa) => mutar("setTarifa", { clave, datos: datosTarifa }, d => ({ ...d, tarifas: { ...d.tarifas, [clave]: datosTarifa } })),
    guardarLiquidacion: (clave, liq) => mutar("setLiquidacion", { clave, datos: liq }, d => ({ ...d, liquidaciones: { ...d.liquidaciones, [clave]: liq } })),
    registrarPago: async pago => {
      const r = await mutar("createPago", { pago });
      if (r) setDatos(d => ({ ...d, pagos: [...d.pagos, { ...pago.montos, ...pago, creadoEn: r.creadoEn, estado: "Pagado" }] }));
      return r;
    },
    eliminarPago: id => mutar("deletePago", { id }, d => ({ ...d, pagos: quitar(d.pagos, id) }), "Pago eliminado"),
    guardarUsuario: usuario => {
      const { password: _p, ...visible } = usuario;
      return mutar("upsertUsuario", { usuario }, d => ({ ...d, usuarios: reemplazar(d.usuarios, visible) }), "Usuario guardado");
    },
    eliminarUsuario: id => mutar("deleteUsuario", { id }, d => ({ ...d, usuarios: quitar(d.usuarios, id) }), "Usuario eliminado"),
    cambiarPassword: (actual, nueva) => mutar("changePassword", { actual, nueva }, null, "Contraseña actualizada"),
  }), [mutar]);

  const login = useCallback(async (usuario, password) => {
    try {
      const j = await api.login(usuario, password);
      setSesion(j.sesion);
      await cargar();
      return { ok: true, sesion: j.sesion, debeCambiarPassword: j.debeCambiarPassword };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [api, cargar]);

  const logout = useCallback(async () => {
    await api.logout();
    setSesion(null);
    setDatos(d => ({ ...VACIO, config: d.config }));
    cargar();
  }, [api, cargar]);

  const setGasUrl = useCallback(url => {
    local.set(KEYS.gasUrl, url.trim());
    borrarSesion();
    setSesion(null);
    setGasUrlState(url.trim());
  }, []);

  return { datos, cargando, errorCarga, cargar, sesion, login, logout, acciones, avisos, notificar, gasUrl, setGasUrl, esLocal: api.esLocal };
}
