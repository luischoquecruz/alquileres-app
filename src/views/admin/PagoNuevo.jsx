import { useState, useMemo } from "react";
import { getLiq, pagosDePersonaPeriodo } from "../../lib/calculos.js";
import { emptyForm, fmtMoney, round1 } from "../../lib/format.js";
import { Field, Mensaje, PageHeader, PeriodoSelector } from "../../ui.jsx";
import BuscadorPersonas from "../../components/BuscadorPersonas.jsx";
import DetalleMontos from "../../components/DetalleMontos.jsx";
import { useMontos } from "../../hooks/useMontos.js";
import { imprimirBoleta } from "../../print/reportes.js";

const Paso = ({ n, titulo, children }) => (
  <section className="stack-sm">
    <div className="row" style={{ gap: 10 }}>
      <span className="badge badge-accent" style={{ width: 24, height: 24, padding: 0, justifyContent: "center" }}>{n}</span>
      <span className="strong">{titulo}</span>
    </div>
    {children}
  </section>
);

export default function PagoNuevo({ cfg, datos, acciones, notificar }) {
  const { personas, servicios, liquidaciones, pagos } = datos;
  const [form, setForm] = useState(emptyForm());
  const [guardado, setGuardado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const activas = useMemo(() => personas.filter(p => p.activo !== false), [personas]);
  const liqPeriodo = getLiq(liquidaciones, form.periodoMes, form.periodoAnio);
  const persona = personas.find(p => String(p.id) === String(form.personaId));
  const calculo = useMontos(servicios, liqPeriodo, persona, activas);
  const listo = form.personaId && form.periodoMes && form.periodoAnio;
  const recibido = Number(form.montoRecibido);

  const boleta = pago => {
    if (!imprimirBoleta({ cfg, pago, servicios })) notificar("El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.", "error");
  };

  const enviar = async () => {
    if (!liqPeriodo) return setError("No hay liquidación configurada para este período.");
    const faltan = ["personaId", "metodo", "fecha", ...(cfg.requiereNotas ? ["notas"] : [])].filter(k => !form[k]);
    if (faltan.length) return setError("Complete todos los campos obligatorios (*).");
    if (calculo.total <= 0) return setError("El total a pagar debe ser mayor a cero.");
    if (!(recibido > 0)) return setError("Indique el monto recibido.");
    if (recibido < calculo.total) return setError(`El monto recibido (Bs.- ${fmtMoney(recibido)}) es menor al total (Bs.- ${fmtMoney(calculo.total)}).`);
    if (pagosDePersonaPeriodo(pagos, persona, form.periodoMes, form.periodoAnio).length) {
      return setError(`⚠️ ${persona.nombre} ya tiene un pago registrado para ${form.periodoMes} ${form.periodoAnio}.`);
    }
    setError("");
    setEnviando(true);
    const pago = {
      ...form,
      inquilino: persona.nombre,
      id: Date.now(),
      montoRecibido: recibido,
      cambio: round1(recibido - calculo.total),
      montos: calculo.montos,
      total: calculo.total,
      estado: "Pagado",
    };
    const r = await acciones.registrarPago(pago);
    setEnviando(false);
    if (!r) return;
    setGuardado(pago);
    setForm(emptyForm());
    window.scrollTo({ top: 0, behavior: "smooth" });
    boleta(pago);
  };

  const cambioOk = recibido >= calculo.total;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <PageHeader title="Registrar pago" sub="Seleccione el inquilino y el período; el monto se calcula con la liquidación." />

      {guardado && (
        <div role="status" className="card card-body" style={{ marginBottom: 16, textAlign: "center", background: "var(--bg-success)", borderColor: "var(--tag-pagado-text)" }}>
          <div style={{ fontSize: 32 }} aria-hidden="true">✅</div>
          <div className="strong text-ok" style={{ fontSize: 17 }}>{cfg.textos.mensajeExito}</div>
          <div className="small text-ok" style={{ marginTop: 4, fontWeight: 600 }}>{guardado.inquilino} — Total: Bs.- {fmtMoney(guardado.total)}</div>
          <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
            <button className="btn btn-primary" onClick={() => boleta(guardado)}>🖨️ Imprimir boleta</button>
            <button className="btn btn-ghost" onClick={() => setGuardado(null)}>Cerrar</button>
          </div>
        </div>
      )}

      <div className="card card-body stack" style={{ gap: 22 }}>
        <Paso n={1} titulo="Inquilino y período">
          <Field as="div" label="Inquilino *">
            <BuscadorPersonas personas={activas} value={form.personaId} onChange={p => setForm(prev => ({ ...prev, personaId: String(p.id), inquilino: p.nombre }))} />
          </Field>
          <Field as="div" label="Período *">
            <PeriodoSelector mes={form.periodoMes} anio={form.periodoAnio} periodos={Object.keys(liquidaciones)} etiquetaPeriodos="Liquidados:"
              onChange={(m, a) => setForm(p => ({ ...p, periodoMes: m, periodoAnio: a }))} />
          </Field>
          {!liqPeriodo && (
            <Mensaje tipo="warn">⚠️ No hay liquidación configurada para {form.periodoMes} {form.periodoAnio}. Créela en la sección Liquidaciones.</Mensaje>
          )}
        </Paso>

        {listo && liqPeriodo && (
          <Paso n={2} titulo="Montos">
            <DetalleMontos liqPeriodo={liqPeriodo} periodoLabel={`${form.periodoMes} ${form.periodoAnio}`} calculo={calculo} />
          </Paso>
        )}

        <Paso n={listo && liqPeriodo ? 3 : 2} titulo="Cobro">
          <div className="form-grid-2">
            <Field label="Fecha de pago *"><input className="input" type="date" value={form.fecha} onChange={e => setF("fecha", e.target.value)} /></Field>
            <Field label="Método de pago *">
              <select className="select" value={form.metodo} onChange={e => setF("metodo", e.target.value)}>
                <option value="">-- Seleccione --</option>
                {cfg.metodosPago.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          {listo && (
            <div className="form-grid-2">
              <Field label="Monto recibido *">
                <input className="input input-num" type="number" inputMode="decimal" step="0.1" min="0" value={form.montoRecibido} onChange={e => setF("montoRecibido", e.target.value)} placeholder="0" />
              </Field>
              <Field as="div" label="Cambio">
                <div className="input input-static num" style={{ color: form.montoRecibido === "" ? "var(--text-muted)" : cambioOk ? "var(--tag-pagado-text)" : "var(--danger-text)", fontSize: 17 }}>
                  {form.montoRecibido === "" ? "—" : cambioOk ? `Bs.- ${fmtMoney(round1(recibido - calculo.total))}` : `Faltan Bs.- ${fmtMoney(round1(calculo.total - recibido))}`}
                </div>
              </Field>
            </div>
          )}
          {cfg.mostrarCampoNotas && (
            <Field label={`Notas / Comprobante${cfg.requiereNotas ? " *" : ""}`}>
              <textarea className="textarea" value={form.notas} onChange={e => setF("notas", e.target.value)} rows={2} placeholder="Comprobante o notas adicionales" />
            </Field>
          )}
        </Paso>

        <Mensaje tipo="error">{error}</Mensaje>
        <button className="btn btn-primary btn-lg btn-block" onClick={enviar} disabled={enviando || !liqPeriodo}>
          {enviando ? "Guardando…" : cfg.textos.botonEnviar}
        </button>
      </div>
    </div>
  );
}
