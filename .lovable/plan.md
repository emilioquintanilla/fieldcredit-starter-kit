Ya está lista la Parte 1 (Asistente de campo). Continuamos con las Partes 2, 3 y 4, todas centradas en el **Copiloto del Comité de Crédito**.

## Parte 2 — Página `/comite` + infraestructura de decisión

**Objetivo:** reemplazar el placeholder de `/comite` con la bandeja real de expedientes por dictaminar, y preparar el store para guardar dictamen y decisión.

Archivos:
- `src/stores/expedientes.ts`
  - Añadir sub-objeto `comite?: { dictamenIA?: DictamenIA | null; decision?: DecisionComite | null; generadoEn?: string | null }` en `ExpedienteBorrador`.
  - Acciones: `guardarDictamenIA(id, dictamen)`, `registrarDecisionComite(id, { decision, observacion, timestamp })`, `marcarEnComite(id)`.
  - Al registrar decisión: cambiar `estado` del expediente a `aprobado` / `condicionado` / `rechazado`.
- `src/routes/comite.tsx` (reemplazar placeholder)
  - Suscribirse a expedientes con `estado === "en_comite"` (o los que tengan documentación mínima; muestra vacío-friendly).
  - Tarjeta `TarjetaComite`: nombre, código, monto, producto, badge del proveedor IA, botón **"Analizar con Copiloto IA"** que navega a `/comite/$id`.
  - Empty state cuando la lista está vacía.
- `src/components/Sidebar.tsx`
  - Badge numérico junto al item ⚖️ Comité con el conteo pendiente (suscrito al store).
- En el detalle `/expedientes/$id`: en el tab de Documentos añadir botón **"Enviar a comité"** que llama `marcarEnComite(id)` y navega a `/comite/$id`. (Cambio mínimo, no rediseño del tab.)

## Parte 3 — Dictamen IA en `/comite/$id`

**Objetivo:** generar el dictamen crediticio completo con IA y mostrarlo en pantalla.

Archivos nuevos:
- `src/services/ia/parsearDictamen.ts` — parseo robusto con fallback (limpia fences ```json).
- `src/services/ia/prompts.ts` (extender)
  - `SISTEMA_COPILOTO_COMITE(contexto, esAgroResilia)`.
  - `PROMPT_GENERAR_DICTAMEN(contexto)` — pide JSON estricto.
  - Tipos `DictamenIA`, `Bandera`, `RecomendacionIA`, `ScoreARS`.
- `src/routes/comite.$id.tsx` — página de dictamen:
  1. Cabecera con datos del solicitante.
  2. Estado `idle` → botón "Analizar expediente con el Copiloto IA".
  3. Estado `procesando` → log animado (10 pasos con `setTimeout` 500 ms) mientras la IA responde.
  4. Al terminar: parsea con `parsearDictamenIA`, guarda en store con `guardarDictamenIA`, entra a `listo`.
  5. Si ya hay `dictamenIA` guardado, salta directamente a `listo` (permite volver sin regenerar; botón "Regenerar" opcional).
- Componentes UI (bajo `src/components/comite/`):
  - `ScoreGauge.tsx` — gauge semicircular SVG 0–100 con color según semáforo.
  - `BanderasCumplimiento.tsx` — agrupa verde/amarillo/rojo con conteos.
  - `ScoreAgroResilia.tsx` — sólo si `dictamen.scoreARS` no es null (o si `producto === "AgroResilia"`).
  - `RecomendacionIA.tsx` — recomendación + condiciones + disclaimer "la IA no aprueba".
  - `DecisionComite.tsx` — tres botones (Aprobar / Con condición / Rechazar) + textarea + guardar en store.
  - `AnalisisFinanciero.tsx` — tabla compacta con las métricas devueltas por la IA.

## Parte 4 — Chat en vivo + protección de la API

**Objetivo:** permitir al oficial conversar con el Copiloto sobre el dictamen ya generado y proteger la API key contra abuso.

Archivos:
- `src/components/comite/ChatCopiloto.tsx`
  - Chat integrado dentro de `/comite/$id` (debajo del dictamen).
  - Mensaje inicial automático: "Dictamen generado para X. Score Y/100. Semáforo Z. ¿Qué quieres profundizar?".
  - 6 sugerencias rápidas (¿Por qué este score?, ¿Qué pasa si reduzco el monto?, etc.).
  - Envía a `llamarIA` con `SISTEMA_COPILOTO_COMITE` + historial. Reutiliza `Burbuja` y `BurbujaEscribiendo` (extraer de `AsistenteBarraCampo` a `src/components/ia/burbujas.tsx` para no duplicar).
- `src/components/ia/ProveedorBadge.tsx` — badge del proveedor activo (usar en header del chat y del dictamen). Extraído del helper que ya vive dentro de `adaptadorIA.ts`.
- `src/routes/api/ia/completar.ts` — añadir rate limiting server-side por IP (map en memoria del handler): máximo **10 llamadas/minuto**, responde 429 con mensaje claro cuando se supera. El cliente muestra el error en la burbuja.
- Manejo de errores end-to-end: si `llamarIA` lanza, la burbuja muestra "⚠️ Error de conexión con el Copiloto. Intenta de nuevo." (ya soportado en el adaptador actual).

## Notas técnicas

- **Rutas TanStack:** `src/routes/comite.$id.tsx` sigue la convención de rutas ya usada (`expedientes.$id.tsx`). Antes de linkear con `<Link to="/comite/$id">` hay que crear el archivo — la generación del `routeTree.gen.ts` la hace el plugin automáticamente al guardar.
- **Head metadata:** cada ruta nueva (`/comite`, `/comite/$id`) recibe su propio `head()` con `title`, `description`, `og:*` únicos.
- **Store persistente:** el middleware `persist` de Zustand ya está activo; los nuevos campos `comite.*` se guardan solos en `localStorage`.
- **Sin dependencias nuevas:** todo se hace con lo instalado (React, Zustand, Tailwind, TanStack Router, lucide-react). El SVG del gauge es inline; no se añade Recharts al comité.
- **Compatibilidad AgroResilia:** el campo `producto === "AgroResilia"` se detecta desde `exp.data.producto`; si el dictamen no trae `scoreARS`, la tarjeta no se renderiza.
- **Provider IA:** sigue Groq/Llama por defecto vía `VITE_IA_PROVEEDOR`; nada cambia en el adaptador ya existente.
- **No incluido en esta sesión** (según el prompt original): reportería ESG, integración .NET, modo offline nativo.

## Orden de ejecución sugerido

1. Parte 2 (store + `/comite` + sidebar badge + botón "Enviar a comité").
2. Parte 3 (prompts + parser + `/comite/$id` con dictamen).
3. Parte 4 (chat + rate limiter + badge proveedor).

Después de cada parte hago typecheck y verifico el flujo antes de pasar a la siguiente.