# Cobro de Alquileres y Servicios

App React (Vite) para liquidar y cobrar alquileres y servicios básicos entre inquilinos. Backend en Google Apps Script sobre una Google Sheet (`Code.gs`), o modo "solo local" en el navegador si no hay URL configurada.

## Comandos

```bash
npm run dev      # servidor de desarrollo (puerto 3001)
npm test         # tests: cálculos, backend Code.gs simulado y recorrido completo de la UI
npm run lint
npm run build
```

Para desarrollar sin tocar la hoja de producción: `VITE_GAS_URL= npm run dev` (modo local).

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/lib/calculos.js` | Reparto de servicios y estado de cuenta (única fuente de verdad, con tests) |
| `src/api/` | Cliente del backend (`client.js`) y backend local en `localStorage` (`local.js`) |
| `src/hooks/useDatos.js` | Estado central: carga inicial, sesión y acciones de escritura |
| `src/views/` | Vista pública, inquilino y panel admin (`views/admin/`) |
| `src/print/` | Recibos, informes imprimibles y PDF (jsPDF se carga bajo demanda) |
| `Code.gs` | Backend de Apps Script |

## Desplegar el backend (`Code.gs`)

El frontend y el backend deben actualizarse **juntos**: el frontend nuevo usa acciones (`bootstrap`, `login`, `createPago`…) que el `Code.gs` anterior no tiene.

1. Abra la hoja → Extensiones → Apps Script, reemplace el código por `Code.gs` y guarde.
2. Implementar → Gestionar implementaciones → editar la implementación existente → **Nueva versión** → Implementar. (Así la URL `/exec` no cambia.)
   - Ejecutar como: *Yo*. Quién tiene acceso: *Cualquier usuario*.
3. Despliegue el frontend (Vercel).
4. Inicie sesión como admin. Si usaba `admin` / `admin123`, la app pedirá cambiar la contraseña.

Migraciones automáticas (sin pérdida de datos):
- Contraseñas en texto plano → hash SHA-256 con sal en el primer login correcto de cada usuario.
- Hojas `Tarifas` / `Liquidaciones` (JSON en A1) → una fila por período en la primera escritura.
- Hoja `Pagos` → se agrega la columna `Detalle` (montos de todos los servicios, incluidos los personalizados).

Recomendado antes de desplegar: Archivo → Hacer una copia de la hoja.

## Seguridad

- El acceso admin requiere login validado en el servidor; el token de sesión dura 6 h.
- Toda escritura exige token de administrador; 5 intentos fallidos bloquean ese usuario 15 min.
- Visitantes anónimos solo reciben nombre/inmueble/factores de las personas y el total de cada pago (necesario para la consulta pública de deuda). Teléfonos, emails, notas y usuarios no salen del servidor.
