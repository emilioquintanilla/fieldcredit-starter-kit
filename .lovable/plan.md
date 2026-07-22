## Fase 2 — Migración a Supabase de creación, solicitud y documentos

**Objetivo:** que el alta de expediente, el formulario completo de Solicitud (7 pasos) y los Documentos de Soporte queden persistidos en Supabase con guardado automático. El resto de módulos (flujo, EDR, SF, geo, fiador, garantías, comité) queda en la Fase 3.

### 1. Alta de expediente contra Supabase
- `src/routes/expedientes.nuevo.tsx`: al montar, crear el expediente en Supabase vía `useExpedientesRemote.crear({ asesorId, sucursalId })` con el usuario logueado; usar el `id` numérico devuelto para todo el resto del formulario.
- Se mantiene el store local (`useExpedientes`) como caché de los datos de secciones aún no migradas, pero indexado por el `id` de Supabase (no por el `codigo` local).
- Si falla la creación, mostrar error inline y bloquear el formulario.

### 2. Guardado automático de la Solicitud (7 pasos)
- Nuevo hook `src/hooks/useAutosaveSolicitud.ts`: debounce 800 ms sobre los cambios de `SolicitudData` → llama `guardarSolicitud(expedienteId, datos)` del servicio.
- Al terminar cada guardado, marcar `ultimoGuardado` en `useExpedientesRemote` para que el `IndicadorGuardado` del NavBar refleje el estado.
- En paso final (firma + envío): además de guardar, cambiar el estado del expediente a `en_revision` con `cambiarEstado(id, "en_revision")`.

### 3. Carga de solicitud existente
- Nuevo `obtenerSolicitud(expedienteId)` en `expedientesService.ts` (SELECT desde `solicitudes`).
- Al abrir `/expedientes/$id`, si viene de Supabase, hidratar el store local con los datos de la solicitud para que los tabs actuales sigan funcionando sin cambios.

### 4. Documentos de Soporte a Supabase
- `src/components/docs/DocsExpedientePage.tsx`: al subir un archivo, llamar `guardarDocumento(expedienteId, categoriaId, archivo)` (ya existe stub); al eliminar, `eliminarDocumento(documentoId)`.
- Nuevo `obtenerDocumentos(expedienteId)` para listar al abrir la pestaña. Se mantiene la UI actual (miniaturas, visor, toasts, confirmación).

### 5. Cambios menores
- `expedientesService.ts`: implementar `obtenerSolicitud` y `obtenerDocumentos` (los `guardar*` ya existen).
- `IndicadorGuardado` (NavBar): ya está conectado a `ultimoGuardado`; no cambia.

### No incluido (queda para Fase 3)
Flujo de efectivo, Estado de Resultados, Situación Financiera, Geolocalización, Fiador, Garantías, Comité (dictamen + decisión). Estos siguen en `localStorage` vía `useExpedientes` con `persist`.

### Riesgos
- El store local usa strings de `codigo` como id; hay que asegurar que el mapeo `id numérico Supabase ↔ codigo` quede consistente en `useExpedientes`. Propuesta: guardar `supabaseId` dentro del borrador local y usarlo como clave de sincronización.
- El campo `documentos.base64` puede ser grande; se mantiene tal cual porque el esquema ya lo contempla, pero se recomienda pasar a Storage en una fase posterior.

¿Procedo con esta fase 2 tal como está, o ajusto alcance (por ejemplo, dejar Documentos para más adelante o incluir también Flujo)?
