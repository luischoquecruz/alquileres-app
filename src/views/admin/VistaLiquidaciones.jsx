import { useState, useMemo } from "react";
import { SEReparto, serviciosDeLiq, totalesPorPersona, totalFactorServicio, montoPagado } from "../../lib/calculos.js";
import { mesActual, anioActual, periodoKey, periodoDeKey, fmtMoney, fmtNum, round1 } from "../../lib/format.js";
import { Field, Mensaje, PageHeader, PeriodoSelector, Vacio } from "../../ui.jsx";
import { labelReparto } from "../../hooks/useMontos.js";
import { imprimirLiquidacion } from "../../print/reportes.js";

const REPARTOS = [
  { value: SEReparto.UNIDAD, label: "1 solo pago (por unidad)" },
  { value: SEReparto.HABITACIONES, label: "Por cantidad de habitaciones" },
  { value: SEReparto.PERSONAS, label: "Por cantidad de personas" },
];
const unidadFactor = r => (r === SEReparto.HABITACIONES ? "hab" : "pers");

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
  const sinTarifas = !servicios.some(s => Number(tarifasPeriodo[s.id]) > 0);

  const cambiarPeriodo = (m, a) => { setMes(m); setAnio(Number(a)); };
  const editarPeriodo = k => {
    const p = periodoDeKey(k);
    cambiarPeriodo(p.mes, p.anio);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const todosTienen = sid => activas.length > 0 && activas.every(p => (inquilinosEdit[String(p.id)]?.servicios || []).includes(sid));
  const toggleAllServicio = sid => {
    const todos = todosTienen(sid);
    activas.forEach(p => setAsignados(String(p.id), lista =>
      todos ? lista.filter(x => x !== sid) : (lista.includes(sid) ? lista : [...lista, sid])));
  };

  const guardar = async () => {
    const conTarifa = servicios.filter(s => Number(tarifasPeriodo[s.id]) > 0);
    if (conTarifa.length === 0) {
      setMsg(`⚠️ Primero cargue las tarifas de ${mes} ${anio} en la sección Tarifas`);
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
    <div className="stack" style={{ gap: 20 }}>
      <PageHeader title="Liquidaciones" sub="Reparte las facturas del mes entre los inquilinos según las tarifas registradas." />

      <div className="card">
        <div className="card-body stack">
          <div className="field">
            <div className="row-between">
              <span className="label">Período</span>
              <span className={`badge ${liqActual ? "badge-ok" : "badge-warn"}`}>{liqActual ? "✅ Configurado" : "⚠️ Sin configurar"}</span>
            </div>
            <PeriodoSelector mes={mes} anio={anio} onChange={cambiarPeriodo} periodos={Object.keys(liquidaciones)} etiquetaPeriodos="Liquidados:" />
          </div>

          {sinTarifas && <Mensaje tipo="warn">No hay tarifas cargadas para {mes} {anio}. Regístrelas primero en la sección Tarifas.</Mensaje>}

          <div className="stack-sm">
            <div className="label">Servicios del período</div>
            {servicios.map(s => {
              const liq = borrador.servicios[s.id];
              const tf = totalFactorServicio(s, borrador, activas);
              const precio = tf ? round1(liq.totalFactura / tf) : 0;
              const u = unidadFactor(liq.reparto);
              return (
                <div key={s.id} className="card" style={{ boxShadow: "none", background: "var(--bg-muted)", padding: 14 }}>
                  <div className="row-between" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div className="strong">{s.icon} {s.label}</div>
                      <div className="xsmall muted">
                        {liq.totalFactura > 0 ? `Factura Bs.- ${fmtMoney(liq.totalFactura)}` : "Sin tarifa"}
                        {liq.consumoTotal ? ` · ${fmtNum(liq.consumoTotal)} ${s.unit}` : ""}
                      </div>
                    </div>
                    {liq.totalFactura > 0 && tf > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div className="strong num text-accent">Bs.- {fmtMoney(precio)}/{u}</div>
                        <div className="xsmall muted num">× {fmtNum(tf)} {u}</div>
                      </div>
                    )}
                  </div>
                  <select className="select" style={{ marginTop: 10 }} value={liq.reparto} onChange={e => setReparto(s.id, e.target.value)} aria-label={`Reparto ${s.label}`}>
                    {REPARTOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          {activas.length > 0 && (
            <div className="stack-sm">
              <div>
                <div className="label">👥 Asignación de servicios por inquilino</div>
                <div className="hint">Un inquilino <b>sin ninguna marca</b> participa de todos los servicios.</div>
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <div className="assign-row" style={{ background: "var(--bg-muted)", borderRadius: "var(--radius) var(--radius) 0 0" }}>
                  <span className="grow xsmall strong secondary">Marcar a todos</span>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    {servicios.map(s => (
                      <button key={s.id} type="button" className="toggle-pill" onClick={() => toggleAllServicio(s.id)} aria-pressed={todosTienen(s.id)}>
                        {todosTienen(s.id) ? "☑" : "☐"} {s.icon} <span className="only-desktop">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {activas.map(p => {
                  const asignados = inquilinosEdit[String(p.id)]?.servicios || [];
                  return (
                    <div key={p.id} className="assign-row" style={{ flexWrap: "wrap" }}>
                      <div className="grow" style={{ minWidth: 140 }}>
                        <div className="strong">{p.nombre}{asignados.length === 0 && <span className="xsmall muted" style={{ fontWeight: 400, marginLeft: 6 }}>(todos)</span>}</div>
                        <div className="xsmall muted">🏠 {p.habitaciones || 1} hab · 👥 {p.personas || 1} pers</div>
                      </div>
                      <div className="row" style={{ justifyContent: "flex-end" }}>
                        {servicios.map(s => (
                          <label key={s.id} className="toggle-pill">
                            <input type="checkbox" aria-label={`${s.label} para ${p.nombre}`} checked={asignados.includes(s.id)} onChange={() => toggleServicioInquilino(String(p.id), s.id)} />
                            <span aria-hidden="true">{s.icon}</span><span className="only-desktop" aria-hidden="true">{s.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="card-footer stack-sm">
          {msg && <Mensaje tipo={msg.startsWith("⚠️") ? "warn" : "ok"}>{msg}</Mensaje>}
          <button className="btn btn-primary btn-lg btn-block" onClick={guardar}>💾 Guardar liquidación para {mes} {anio}</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Historial de liquidaciones</h2>
        {Object.keys(liquidaciones).length === 0 ? <Vacio icon="📄">No hay liquidaciones configuradas aún</Vacio> : (
          <div className="list">
            {Object.entries(liquidaciones).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => (
              <TarjetaLiquidacion key={k} clave={k} liq={v} servicios={servicios} activas={activas} pagos={pagos} actual={k === key}
                expandido={expandKey === k} onToggle={() => setExpandKey(expandKey === k ? null : k)}
                onEditar={() => editarPeriodo(k)} onImprimir={() => imprimir(k, v)} onPdf={() => pdf(k, v)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TarjetaLiquidacion({ clave, liq, servicios, activas, pagos, actual, expandido, onToggle, onEditar, onImprimir, onPdf }) {
  const { label, mes, anio } = periodoDeKey(clave);
  const totInq = useMemo(() => totalesPorPersona(liq, servicios, activas), [liq, servicios, activas]);
  const pagado = p => montoPagado(pagos, p, mes, anio) > 0;
  const conMonto = activas.filter(p => totInq[String(p.id)]?.total > 0);
  const totalPagados = conMonto.filter(pagado).length;
  const totalPendientes = conMonto.length - totalPagados;
  const total = Object.values(totInq).reduce((s, i) => s + i.total, 0);
  const totalServicio = s => Object.values(totInq).reduce((sum, i) => sum + (i.detalles[s.id] || 0), 0);

  return (
    <div className="card" style={actual ? { borderColor: "var(--accent)" } : undefined}>
      <button type="button" className="collapse-trigger" onClick={onToggle} aria-expanded={expandido}>
        <div className="grow">
          <div className="row">
            <span className="item-title">{label}</span>
            {totalPendientes === 0 && totalPagados > 0
              ? <span className="badge badge-ok">✅ Todo pagado</span>
              : <span className="badge badge-warn">{totalPendientes} pendiente(s)</span>}
          </div>
          <div className="xsmall muted" style={{ marginTop: 4 }}>
            {servicios.map(s => { const st = totalServicio(s); return st > 0 ? <span key={s.id} className="nowrap" style={{ marginRight: 10, display: "inline-block" }}>{s.icon} Bs.- {fmtMoney(st)}</span> : null; })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="strong num">Bs.- {fmtMoney(total)}</div>
          <div className="xsmall muted">{totalPagados}/{conMonto.length} pagados</div>
        </div>
        <span className="chevron" aria-hidden="true">▼</span>
      </button>
      <div className="row" style={{ padding: "0 18px 14px", gap: 6 }}>
        <button className="btn btn-secondary btn-sm" onClick={onEditar}>✏️ Editar</button>
        <button className="btn btn-secondary btn-sm" onClick={onImprimir}>🖨️ Imprimir</button>
        <button className="btn btn-secondary btn-sm" onClick={onPdf}>📄 PDF</button>
      </div>

      {expandido && (
        <div style={{ padding: "0 14px 14px" }}>
          <div className="table-wrap table-stack">
            <table className="table">
              <thead>
                <tr>
                  <th>Inquilino</th>
                  {servicios.map(s => <th key={s.id} className="r">{s.icon} {s.label}</th>)}
                  <th className="r">Total</th>
                  <th className="c">Estado</th>
                </tr>
              </thead>
              <tbody>
                {activas.map(p => {
                  const datos = totInq[String(p.id)];
                  if (!datos || datos.total <= 0) return null;
                  const f = liq.factores?.[String(p.id)];
                  return (
                    <tr key={p.id}>
                      <td className="cell-head">
                        <div className="strong">{datos.nombre}</div>
                        <div className="xsmall muted">{datos.inmueble ? `${datos.inmueble} · ` : ""}🏠 {f?.habitaciones || p.habitaciones || 1} hab · 👥 {f?.personas || p.personas || 1} pers</div>
                      </td>
                      {servicios.map(s => (
                        <td key={s.id} className="r num" data-label={`${s.icon} ${s.label}`}>{datos.detalles[s.id] > 0 ? `Bs.- ${fmtMoney(datos.detalles[s.id])}` : "—"}</td>
                      ))}
                      <td className="r num strong text-accent" data-label="Total">Bs.- {fmtMoney(datos.total)}</td>
                      <td className="c" data-label="Estado">
                        {pagado(p) ? <span className="badge badge-ok">✅ Pagado</span> : <span className="badge badge-warn">⏳ Pendiente</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="cell-head">Totales</td>
                  {servicios.map(s => { const t = totalServicio(s); return <td key={s.id} className="r num" data-label={`${s.icon} ${s.label}`}>{t > 0 ? `Bs.- ${fmtMoney(t)}` : "—"}</td>; })}
                  <td className="r num text-accent" data-label="Total">Bs.- {fmtMoney(total)}</td>
                  <td data-label=""></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="xsmall muted" style={{ marginTop: 8 }}>
            Reparto: {servicios.map(s => {
              const ft = totalFactorServicio(s, liq, activas);
              const r = serviciosDeLiq(liq)[s.id]?.reparto || s.reparto;
              return <span key={s.id} style={{ marginRight: 10 }}>{s.icon} {labelReparto(r)}{ft ? ` (${fmtNum(ft)} ${unidadFactor(r)})` : ""}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
