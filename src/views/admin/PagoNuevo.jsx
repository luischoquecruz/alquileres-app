import { useState, useMemo } from "react";
import { getLiq, pagosDePersonaPeriodo } from "../../lib/calculos.js";
import { emptyForm, meses, fmtMoney, round1 } from "../../lib/format.js";
import { useMobile } from "../../hooks/useMobile.js";
import { inp } from "../../estilos.js";
import { Label, Mensaje } from "../../ui.jsx";
import BuscadorPersonas from "../../components/BuscadorPersonas.jsx";
import DetalleMontos from "../../components/DetalleMontos.jsx";
import { useMontos } from "../../hooks/useMontos.js";
import { imprimirBoleta } from "../../print/reportes.js";

export default function PagoNuevo({ cfg, datos, acciones, notificar }) {
  const { personas, servicios, liquidaciones, pagos } = datos;
  const isMobile = useMobile();
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
    boleta(pago);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {guardado && (
        <div role="status" style={{ background: "var(--bg-success)", border: "1px solid var(--tag-pagado-text)", borderRadius: 12, padding: isMobile ? "14px 16px" : "20px 24px", marginBottom: 16, color: "var(--tag-pagado-text)", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{cfg.textos.mensajeExito}</div>
          <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600 }}>{guardado.inquilino} — Total: Bs.- {fmtMoney(guardado.total)}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
            <button onClick={() => boleta(guardado)} style={{ background: "#fff", color: "var(--tag-pagado-text)", border: "2px solid var(--tag-pagado-text)", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>🖨️ Imprimir boleta</button>
            <button onClick={() => setGuardado(null)} style={{ background: "transparent", color: "var(--tag-pagado-text)", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>Cerrar</button>
          </div>
        </div>
      )}
      <Mensaje tipo="error">{error}</Mensaje>
      {!liqPeriodo && (
        <div style={{ background: "var(--bg-warning)", border: "1px solid var(--star)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "var(--star)", fontSize: 12, textAlign: "center" }}>
          ⚠️ No hay liquidación configurada para {form.periodoMes} {form.periodoAnio}. Cree una en la pestaña Liquidaciones.
        </div>
      )}
      <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: isMobile ? 16 : 24, boxShadow: "var(--shadow-md)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>💳 Registrar nuevo pago</div>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><Label size={12}>Fecha de pago *</Label><input type="date" value={form.fecha} onChange={e => setF("fecha", e.target.value)} style={inp} /></div>
            <div><Label size={12}>Método de pago *</Label>
              <select value={form.metodo} onChange={e => setF("metodo", e.target.value)} style={inp}>
                <option value="">-- Seleccione --</option>
                {cfg.metodosPago.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div><Label size={12}>Inquilino *</Label>
            <BuscadorPersonas personas={activas} value={form.personaId} onChange={p => setForm(prev => ({ ...prev, personaId: String(p.id), inquilino: p.nombre }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><Label size={12}>Período (Mes) *</Label>
              <select value={form.periodoMes} onChange={e => setF("periodoMes", e.target.value)} style={inp}>{meses.map(m => <option key={m}>{m}</option>)}</select>
            </div>
            <div><Label size={12}>Año</Label><input type="number" value={form.periodoAnio} onChange={e => setF("periodoAnio", e.target.value)} style={inp} /></div>
          </div>
          {listo && <DetalleMontos cfg={cfg} liqPeriodo={liqPeriodo} periodoLabel={`${form.periodoMes} ${form.periodoAnio}`} calculo={calculo} />}
          {listo && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div><Label size={12}>Monto recibido *</Label>
                <input type="number" step="0.1" min="0" value={form.montoRecibido} onChange={e => setF("montoRecibido", e.target.value)} style={inp} placeholder="0" />
              </div>
              <div><Label size={12}>Cambio</Label>
                <div style={{ ...inp, background: "var(--bg-muted)", fontWeight: 700, fontSize: 16, color: recibido >= calculo.total ? "var(--tag-pagado-text)" : "var(--danger-text)" }}>
                  {form.montoRecibido === "" ? "—" : recibido >= calculo.total ? `Bs.- ${fmtMoney(round1(recibido - calculo.total))}` : `Faltan Bs.- ${fmtMoney(round1(calculo.total - recibido))}`}
                </div>
              </div>
            </div>
          )}
          {cfg.mostrarCampoNotas && (
            <div><Label size={12}>Notas / Comprobante{cfg.requiereNotas ? " *" : ""}</Label>
              <textarea value={form.notas} onChange={e => setF("notas", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="Comprobante o notas adicionales" />
            </div>
          )}
        </div>
        <button onClick={enviar} disabled={enviando || !liqPeriodo}
          style={{ width: "100%", marginTop: 18, background: enviando || !liqPeriodo ? "var(--text-muted)" : cfg.colorPrimario, color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 800, cursor: enviando || !liqPeriodo ? "not-allowed" : "pointer", fontSize: 15 }}>
          {enviando ? "Guardando..." : cfg.textos.botonEnviar}
        </button>
      </div>
    </div>
  );
}
