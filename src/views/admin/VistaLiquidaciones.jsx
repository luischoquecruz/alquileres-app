import { useState, useMemo } from "react";
import { SEReparto, serviciosDeLiq, totalesPorPersona, totalFactorServicio, montoPagado } from "../../lib/calculos.js";
import { meses, mesActual, anioActual, periodoKey, periodoDeKey, fmtMoney, fmtNum, round1 } from "../../lib/format.js";
import { inp, btnPrimario } from "../../estilos.js";
import { Label, Vacio } from "../../ui.jsx";
import { labelReparto } from "../../hooks/useMontos.js";
import { imprimirLiquidacion } from "../../print/reportes.js";

const REPARTOS = [
  { value: SEReparto.UNIDAD, label: "1 solo pago (por unidad)" },
  { value: SEReparto.HABITACIONES, label: "Por cantidad de habitaciones" },
  { value: SEReparto.PERSONAS, label: "Por cantidad de personas" },
];
const unidadFactor = r => (r === SEReparto.HABITACIONES ? "hab" : "pers");
const btnMini = { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-light)", borderRadius: 5, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" };

// Construye la liquidación a guardar a partir del borrador y las tarifas del período.
const construirLiquidacion = (edit, servicios, tarifasPeriodo, activas) => {
  const srvEdit = serviciosDeLiq(edit);
  const data = { servicios: {}, inquilinos: edit?.inquilinos || {}, factores: {} };
  activas.forEach(p => {
    data.factores[String(p.id)] = { habitaciones: Number(p.habitaciones) || 1, personas: Number(p.personas) || 1 };
  });
  servicios.forEach(s => {
    const liq = { ...(srvEdit[s.id] || {}), totalFactura: Number(tarifasPeriodo[s.id]) || 0 };
    liq.reparto = liq.reparto || s.reparto;
    const consumo = Number(tarifasPeriodo[s.id + "_consumo"]);
    if (consumo) liq.consumoTotal = consumo; else delete liq.consumoTotal;
    data.servicios[s.id] = liq;
  });
  servicios.forEach(s => {
    const tf = totalFactorServicio(s, data, activas);
    if (tf) data.servicios[s.id].valorPorFactor = round1(data.servicios[s.id].totalFactura / tf);
    else delete data.servicios[s.id].valorPorFactor;
  });
  return data;
};

export default function VistaLiquidaciones({ cfg, personas, liquidaciones, servicios, pagos, tarifas, acciones, notificar }) {
  const activas = useMemo(() => personas.filter(p => p.activo !== false), [personas]);
  const [mes, setMes] = useState(mesActual());
  const [anio, setAnio] = useState(anioActual());
  const key = periodoKey(mes, anio);
  const liqActual = liquidaciones[key] || null;
  const tarifasPeriodo = useMemo(() => tarifas[key] || {}, [tarifas, key]);
  const [edit, setEdit] = useState(() => (liqActual ? structuredClone(liqActual) : null));
  const [origen, setOrigen] = useState({ key, liqActual });
  const [msg, setMsg] = useState("");
  const [expandKey, setExpandKey] = useState(null);

  if (origen.key !== key || origen.liqActual !== liqActual) {
    setOrigen({ key, liqActual });
    setEdit(liqActual ? structuredClone(liqActual) : null);
  }

  const borrador = useMemo(() => construirLiquidacion(edit, servicios, tarifasPeriodo, activas), [edit, servicios, tarifasPeriodo, activas]);
  const inquilinosEdit = edit?.inquilinos || {};

  const setReparto = (servicioId, reparto) => setEdit(prev => {
    const base = prev || { servicios: {}, inquilinos: {} };
    const srv = serviciosDeLiq(base);
    return { ...base, servicios: { ...srv, [servicioId]: { ...(srv[servicioId] || {}), reparto } } };
  });

  const setAsignados = (pid, fn) => setEdit(prev => {
    const base = prev || { servicios: {}, inquilinos: {} };
    const inq = base.inquilinos || {};
    return { ...base, inquilinos: { ...inq, [pid]: { ...(inq[pid] || {}), servicios: fn(inq[pid]?.servicios || []) } } };
  });

  const toggleServicioInquilino = (pid, sid) =>
    setAsignados(pid, lista => (lista.includes(sid) ? lista.filter(x => x !== sid) : [...lista, sid]));

  const toggleAllServicio = sid => {
    const todos = activas.every(p => (inquilinosEdit[String(p.id)]?.servicios || []).includes(sid));
    activas.forEach(p => setAsignados(String(p.id), lista =>
      todos ? lista.filter(x => x !== sid) : (lista.includes(sid) ? lista : [...lista, sid])));
  };

  const guardar = async () => {
    const conTarifa = servicios.filter(s => Number(tarifasPeriodo[s.id]) > 0);
    if (conTarifa.length === 0) {
      setMsg(`⚠️ Primero cargue las tarifas de ${mes} ${anio} en la pestaña Tarifas`);
      setTimeout(() => setMsg(""), 5000);
      return;
    }
    const sinTarifa = servicios.filter(s => !(Number(tarifasPeriodo[s.id]) > 0));
    if (sinTarifa.length && !confirm(`Sin tarifa (no se cobrarán): ${sinTarifa.map(s => s.label).join(", ")}.\n¿Guardar la liquidación igualmente?`)) return;
    const r = await acciones.guardarLiquidacion(key, borrador);
    if (r) { setMsg(`✅ Liquidación guardada para ${mes} ${anio}`); setTimeout(() => setMsg(""), 3000); }
  };

  const contexto = (clave, liq) => ({ cfg, clave, liq, servicios, activas, pagos });
  const imprimir = (clave, liq) => {
    if (!imprimirLiquidacion(contexto(clave, liq))) notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");
  };
  const pdf = async (clave, liq) => {
    try {
      const { descargarPdfLiquidacion } = await import("../../print/liquidacionPdf.js");
      await descargarPdfLiquidacion(contexto(clave, liq));
    } catch (e) {
      notificar("No se pudo generar el PDF: " + e.message, "error");
    }
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>
        Gestión de Liquidaciones Mensuales
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, display: "block" }}>
          Usa las tarifas registradas para {mes} {anio}. Asigne los servicios a cada inquilino y guarde.
        </span>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 16 }}>
          <div><Label>Mes</Label><select value={mes} onChange={e => setMes(e.target.value)} style={inp}>{meses.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><Label>Año</Label><input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} style={inp} /></div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", background: liqActual ? "var(--bg-success)" : "var(--bg-warning)", borderRadius: 7, padding: "8px 12px", whiteSpace: "nowrap", fontWeight: 600 }}>
            {liqActual ? "✅ Configurado" : "⚠️ Sin configurar"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-secondary)" }}>Tarifas del período</div>
          {servicios.map(s => {
            const liq = borrador.servicios[s.id];
            const tf = totalFactorServicio(s, borrador, activas);
            const precio = tf ? round1(liq.totalFactura / tf) : 0;
            const u = unidadFactor(liq.reparto);
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, alignItems: "center", background: "var(--bg-muted)", borderRadius: 8, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)" }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {liq.totalFactura > 0 ? `Bs.- ${fmtMoney(liq.totalFactura)}` : "Sin tarifa"}
                    {liq.consumoTotal ? ` · ${fmtNum(liq.consumoTotal)} ${s.unit}` : ""}
                    {" · "}<span style={{ color: "var(--text-secondary)" }}>{labelReparto(liq.reparto)}</span>
                  </div>
                </div>
                <select value={liq.reparto} onChange={e => setReparto(s.id, e.target.value)} aria-label={`Reparto ${s.label}`} style={inp}>
                  {REPARTOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {liq.totalFactura > 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: cfg.colorAcento }}>Bs.- {fmtMoney(liq.totalFactura)}</div>
                    {tf > 0 && <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Bs.- {fmtMoney(precio)}/{u} × {fmtNum(tf)} {u}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {activas.length > 0 && (
          <div style={{ marginTop: 18, borderTop: "1px solid var(--border-light)", paddingTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 4 }}>👥 Asignación de servicios por inquilino</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
              Marque qué servicios corresponden a cada uno. Un inquilino <b>sin ninguna marca</b> participa de todos los servicios.
            </div>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border-light)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "var(--text-main)" }}>
                <thead>
                  <tr style={{ background: cfg.colorPrimario, color: "#fff" }}>
                    <th style={{ padding: "7px 8px", textAlign: "left", fontSize: 10, textTransform: "uppercase" }}>Inquilino</th>
                    {servicios.map(s => {
                      const todos = activas.every(p => (inquilinosEdit[String(p.id)]?.servicios || []).includes(s.id));
                      return (
                        <th key={s.id} style={{ padding: "7px 8px", fontSize: 10 }}>
                          <button onClick={() => toggleAllServicio(s.id)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
                            {s.icon}<br />{s.label}<br /><span style={{ opacity: .8 }}>{todos ? "☑ Todos" : "☐ Todos"}</span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {activas.map(p => {
                    const asignados = inquilinosEdit[String(p.id)]?.servicios || [];
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-card)" }}>
                        <td style={{ padding: "5px 8px", fontWeight: 700 }}>
                          <div>{p.nombre}{asignados.length === 0 && <span style={{ fontSize: 9, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>(todos)</span>}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>🏠 {p.habitaciones || 1} hab · 👥 {p.personas || 1} pers</div>
                        </td>
                        {servicios.map(s => (
                          <td key={s.id} style={{ padding: "5px 8px", textAlign: "center" }}>
                            <input type="checkbox" aria-label={`${s.label} para ${p.nombre}`} checked={asignados.includes(s.id)} onChange={() => toggleServicioInquilino(String(p.id), s.id)}
                              style={{ width: 16, height: 16, cursor: "pointer", accentColor: cfg.colorPrimario }} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={guardar} style={{ ...btnPrimario(cfg), padding: "10px 20px", fontSize: 13 }}>💾 Guardar liquidación para {mes} {anio}</button>
          {msg && <span style={{ fontSize: 12, color: msg.startsWith("⚠️") ? "var(--star)" : "var(--tag-pagado-text)", fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 8 }}>Historial de liquidaciones</div>
      {Object.keys(liquidaciones).length === 0 ? <Vacio>No hay liquidaciones configuradas aún</Vacio> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(liquidaciones).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => (
            <TarjetaLiquidacion key={k} clave={k} liq={v} cfg={cfg} servicios={servicios} activas={activas} pagos={pagos}
              expandido={expandKey === k} onToggle={() => setExpandKey(expandKey === k ? null : k)}
              onImprimir={() => imprimir(k, v)} onPdf={() => pdf(k, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaLiquidacion({ clave, liq, cfg, servicios, activas, pagos, expandido, onToggle, onImprimir, onPdf }) {
  const { label, mes, anio } = periodoDeKey(clave);
  const totInq = useMemo(() => totalesPorPersona(liq, servicios, activas), [liq, servicios, activas]);
  const pagado = p => montoPagado(pagos, p, mes, anio) > 0;
  const totalPagados = activas.filter(pagado).length;
  const totalPendientes = activas.length - totalPagados;
  const total = Object.values(totInq).reduce((s, i) => s + i.total, 0);
  const totalServicio = s => Object.values(totInq).reduce((sum, i) => sum + (i.detalles[s.id] || 0), 0);

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border-light)", overflow: "hidden" }}>
      <div onClick={onToggle} role="button" tabIndex={0} aria-expanded={expandido} onKeyDown={e => { if (e.key === "Enter") onToggle(); }}
        style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, userSelect: "none", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>{label}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {servicios.map(s => { const st = totalServicio(s); return st > 0 ? <span key={s.id} style={{ marginRight: 8 }}>{s.icon} Bs.- {fmtMoney(st)}</span> : null; })}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
            Bs.- {fmtMoney(total)} total | {totalPagados} pagado(s) · {totalPendientes} pendiente(s)
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
            {servicios.map(s => {
              const ft = totalFactorServicio(s, liq, activas);
              return ft ? <span key={s.id} style={{ marginRight: 8 }}>{s.icon} {fmtNum(ft)} {unidadFactor(serviciosDeLiq(liq)[s.id]?.reparto || s.reparto)}</span> : null;
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); onImprimir(); }} style={btnMini}>🖨️ Imprimir</button>
          <button onClick={e => { e.stopPropagation(); onPdf(); }} style={btnMini}>📄 PDF</button>
          {totalPendientes === 0 && totalPagados > 0 && <span style={{ fontSize: 10, color: "var(--tag-pagado-text)", background: "var(--bg-success)", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>✅ Todo pagado</span>}
          <span style={{ fontSize: 12, color: "var(--text-muted)", transition: "transform .2s", transform: expandido ? "rotate(180deg)" : "none" }}>▼</span>
        </div>
      </div>

      {expandido && (
        <div style={{ borderTop: "1px solid var(--border-light)", padding: 12 }}>
          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border-light)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, color: "var(--text-main)" }}>
              <thead>
                <tr style={{ background: cfg.colorPrimario, color: "#fff" }}>
                  <th style={{ padding: "7px 8px", textAlign: "left", fontSize: 10 }}>Inquilino</th>
                  {servicios.map(s => <th key={s.id} style={{ padding: "7px 8px", fontSize: 10 }}>{s.icon} {s.label}</th>)}
                  <th style={{ padding: "7px 8px", fontSize: 10 }}>Total</th>
                  <th style={{ padding: "7px 8px", fontSize: 10 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {activas.map(p => {
                  const datos = totInq[String(p.id)];
                  if (!datos || datos.total <= 0) return null;
                  const f = liq.factores?.[String(p.id)];
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>
                        <div>{datos.nombre}</div>
                        {datos.inmueble && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{datos.inmueble}</div>}
                        <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 400 }}>🏠 {f?.habitaciones || p.habitaciones || 1} hab · 👥 {f?.personas || p.personas || 1} pers</div>
                      </td>
                      {servicios.map(s => (
                        <td key={s.id} style={{ padding: "6px 8px", textAlign: "center", color: datos.detalles[s.id] > 0 ? "var(--text-main)" : "var(--text-muted)" }}>
                          {datos.detalles[s.id] > 0 ? `Bs.- ${fmtMoney(datos.detalles[s.id])}` : "—"}
                        </td>
                      ))}
                      <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: cfg.colorAcento }}>Bs.- {fmtMoney(datos.total)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        {pagado(p)
                          ? <span style={{ fontSize: 10, color: "var(--tag-pagado-text)", background: "var(--bg-success)", padding: "2px 8px", borderRadius: 6, fontWeight: 600, whiteSpace: "nowrap" }}>✅ Pagado</span>
                          : <span style={{ fontSize: 10, color: "var(--star)", background: "var(--bg-warning)", padding: "2px 8px", borderRadius: 6, fontWeight: 600, whiteSpace: "nowrap" }}>⏳ Pendiente</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--bg-muted)", fontWeight: 700 }}>
                  <td style={{ padding: "6px 8px" }}>Totales</td>
                  {servicios.map(s => { const t = totalServicio(s); return <td key={s.id} style={{ padding: "6px 8px", textAlign: "center" }}>{t > 0 ? `Bs.- ${fmtMoney(t)}` : "—"}</td>; })}
                  <td style={{ padding: "6px 8px", textAlign: "center", color: cfg.colorAcento }}>Bs.- {fmtMoney(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
