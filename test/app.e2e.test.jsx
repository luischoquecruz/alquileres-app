// @vitest-environment jsdom
// Recorrido completo de la app en modo local (sin Google Sheets).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto });

let App;
beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("VITE_GAS_URL", "");
  vi.resetModules();
  window.confirm = () => true;
  window.open = vi.fn(() => null); // ventana de impresión bloqueada
  App = (await import("../src/App.jsx")).default;
});
afterEach(() => { cleanup(); window.location.hash = ""; });

const login = async (user, usuario, password) => {
  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByRole("textbox"), usuario);
  await user.type(within(dialog).getByPlaceholderText("••••••"), password);
  await user.click(within(dialog).getByRole("button", { name: "Ingresar" }));
};

const elegirPersona = async (user, nombre) => {
  await user.click(screen.getByRole("button", { expanded: false }));
  await user.click(screen.getByRole("option", { name: new RegExp(nombre) }));
};

describe("App (modo local)", () => {
  it("#admin en la URL ya no da acceso: abre el login", async () => {
    window.location.hash = "#admin";
    render(<App />);
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.queryByText("Panel Administrador")).toBeNull();
  });

  it("flujo completo: login, personas, tarifas, liquidación, pago y deuda pública", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Login con credenciales por defecto → obliga a cambiar la contraseña
    await user.click(screen.getByRole("button", { name: "🔐 Iniciar sesión" }));
    await login(user, "admin", "mal");
    expect(await screen.findByText("Credenciales incorrectas")).toBeTruthy();
    await user.clear(within(screen.getByRole("dialog")).getByPlaceholderText("••••••"));
    await user.type(within(screen.getByRole("dialog")).getByPlaceholderText("••••••"), "admin123");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText(/contraseña por defecto/)).toBeTruthy();
    const [nueva, repetir] = within(screen.getByRole("dialog")).getAllByDisplayValue("");
    await user.type(nueva, "nueva123");
    await user.type(repetir, "nueva123");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getAllByText("Panel Administrador").length).toBeGreaterThan(0);

    // Personas
    await user.click(screen.getByRole("button", { name: /Personas \(0\)/ }));
    const agregarPersona = async (nombre, hab, pers) => {
      await user.type(screen.getByPlaceholderText("Nombre completo"), nombre);
      const [h, p] = screen.getAllByRole("spinbutton");
      await user.clear(h); await user.type(h, String(hab));
      await user.clear(p); await user.type(p, String(pers));
      await user.click(screen.getByRole("button", { name: "➕ Agregar" }));
    };
    await agregarPersona("Ana", 2, 1);
    await agregarPersona("Beto", 1, 3);
    expect(await screen.findByText("2 persona(s) registradas")).toBeTruthy();

    // Tarifas del mes actual
    await user.click(screen.getByRole("button", { name: /^💰 Tarifas$/ }));
    await user.type(screen.getByLabelText("Monto Alquiler"), "500");
    await user.type(screen.getByLabelText("Monto Agua Potable"), "100");
    await user.type(screen.getByLabelText("Monto Electricidad"), "200");
    await user.click(screen.getByRole("button", { name: /Guardar tarifas/ }));
    expect(await screen.findByText(/Tarifas guardadas/)).toBeTruthy();

    // Liquidación (sin asignaciones: todos participan de todo)
    await user.click(screen.getByRole("button", { name: /^📄 Liquidaciones$/ }));
    await user.click(screen.getByRole("button", { name: /Guardar liquidación/ }));
    expect(await screen.findByText(/Liquidación guardada/)).toBeTruthy();

    // Pago de Ana: 500 + 100·1/4 + 200·2/3 = 658.3
    await user.click(screen.getByRole("button", { name: /Registrar Pago/ }));
    await elegirPersona(user, "Ana");
    expect(await screen.findByText("Bs.- 658,3")).toBeTruthy();
    await user.selectOptions(screen.getByDisplayValue("-- Seleccione --"), "Efectivo");
    await user.type(screen.getByPlaceholderText("0"), "700");
    expect(screen.getByText("Bs.- 41,7")).toBeTruthy(); // cambio
    await user.click(screen.getByRole("button", { name: /Registrar pago/ }));
    expect(await screen.findByText(/Total: Bs.- 658,3/)).toBeTruthy();
    expect(await screen.findByText(/bloqueó la ventana/)).toBeTruthy();

    // Pago duplicado rechazado
    await elegirPersona(user, "Ana");
    await user.selectOptions(screen.getByDisplayValue("-- Seleccione --"), "Efectivo");
    await user.type(screen.getByPlaceholderText("0"), "700");
    await user.click(screen.getByRole("button", { name: /Registrar pago/ }));
    expect(await screen.findByText(/ya tiene un pago registrado/)).toBeTruthy();

    // Historial y resumen
    await user.click(screen.getByRole("button", { name: /Historial \(1\)/ }));
    expect(screen.getByText("Ana")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Resumen Financiero/ }));
    expect(screen.getAllByText(/658,3/).length).toBeGreaterThan(0);

    // Cerrar sesión → vista pública: Ana sin deuda, Beto debe 500 + 75 + 66.7 = 641.7
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(await screen.findByText("Cobro de Alquileres y Servicios Básicos")).toBeTruthy();
    await elegirPersona(user, "Ana");
    expect(screen.queryByText(/Deuda acumulada/)).toBeNull();
    await elegirPersona(user, "Beto");
    expect(await screen.findByText(/Deuda acumulada — Bs.- 641,7/)).toBeTruthy();

    // La sesión nueva usa la contraseña cambiada
    await user.click(screen.getByRole("button", { name: "🔐 Iniciar sesión" }));
    await login(user, "admin", "admin123");
    expect(await screen.findByText("Credenciales incorrectas")).toBeTruthy();
  });
});
