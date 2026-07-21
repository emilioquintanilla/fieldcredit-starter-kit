## Problema 1 — Campos "bloqueados" en Datos personales

**Causa raíz (verificada en el código):**
En `src/routes/expedientes.nuevo.tsx` el componente lee el expediente así:

```ts
const getExpediente = useExpedientes((s) => s.getExpediente);
const exp = expedienteId ? getExpediente(expedienteId) : undefined;
```

`getExpediente` es una función estable del store, por lo que el selector nunca notifica cambios. Cuando el usuario teclea → `actualizarBorrador` actualiza el store → pero el componente **no se re-renderiza** → el `value` del input controlado nunca cambia → parece que el campo no acepta escritura. El mismo síntoma aplica a todos los inputs controlados de S2–S7 (nombres, cédula, teléfono, dirección, etc.).

**Fix:** suscribirse directamente al expediente:

```ts
const exp = useExpedientes((s) =>
  expedienteId ? s.expedientes[expedienteId] : undefined
);
```

(Igual patrón que ya usa `expedientes.$id.tsx`, que sí funciona.) Se elimina la dependencia de `getExpediente` en ese archivo.

## Problema 2 — Migrar OCR a Tesseract.js (sin Google Cloud Vision)

Motivo: evitar depender de una API externa / clave. Tesseract.js corre 100 % en el navegador (WASM + modelo `spa`), sin backend ni secretos.

### Cambios

1. **Instalar dependencia:** `bun add tesseract.js`.
2. **Nuevo módulo cliente** `src/lib/ocr-cedula.ts`:
   - Función `reconocerCedula(base64, lado, onProgress)` que:
     - Usa `Tesseract.recognize(image, "spa", { logger })` para extraer texto.
     - Reporta progreso (0–100) al `CedulaScanner`.
     - Aplica el mismo parser regex que ya vive en `api/ocr/cedula.ts` (`parsearCedulaNicaragua`) — se traslada tal cual al cliente.
   - Devuelve `{ exito, campos, textoDetectado }` con la misma forma que la API actual, para no romper el contrato con `CedulaScanner`.
3. **Actualizar `src/components/CedulaScanner.tsx`:**
   - Reemplazar el `fetch("/api/ocr/cedula", …)` por `reconocerCedula(base64, lado, setProgreso)`.
   - Mostrar % de progreso en el estado "procesando" (Tesseract tarda 5–15 s la primera vez mientras baja el modelo `spa`).
   - Añadir mensaje: *"Descargando modelo de reconocimiento… (primera vez)"* mientras `progress < 0.3`.
4. **Eliminar el endpoint server-side:** borrar `src/routes/api/ocr/cedula.ts` (ya no se llama). El secreto `GOOGLE_CLOUD_VISION_KEY` queda huérfano; se puede borrar manualmente desde Ajustes → Secretos (no lo tocamos automáticamente).
5. **Verificación:** navegar a `/expedientes/nuevo`, comprobar que se puede escribir manualmente en todos los campos de S2 y que el escáner de cédula reconoce texto sin requerir clave del servidor.

### Notas técnicas

- Tesseract.js pesa ~2 MB (JS + WASM) + ~10 MB del language pack `spa`. Se descarga bajo demanda al primer uso; luego queda en cache del navegador.
- El parser regex existente para cédula nicaragüense (`000-000000-0000X`, fecha, sexo, nombres, dirección, departamento) se mantiene íntegro — es lo mismo que hoy vive en el servidor.
- Precisión: Tesseract sobre foto de cédula suele acertar cédula y fechas; nombres pueden requerir edición (los badges Auto/Editado ya cubren ese caso).
- Nada en Fiador, Garantías, ni el resto del expediente cambia — solo el flujo OCR y el fix del selector.

## Archivos afectados

- `package.json` — dependencia nueva.
- `src/lib/ocr-cedula.ts` — **nuevo**.
- `src/components/CedulaScanner.tsx` — reemplazo del fetch por Tesseract + UI de progreso.
- `src/routes/expedientes.nuevo.tsx` — corregir selector del store.
- `src/routes/api/ocr/cedula.ts` — **eliminar**.