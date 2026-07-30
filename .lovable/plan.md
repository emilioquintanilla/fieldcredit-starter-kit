## Qué encontré

Consulté la tabla `usuarios` del proyecto `bdxtdhkb…` con la llave pública: los 6 usuarios existen, están activos y **todos tienen `auth_user_id` enlazado** (por ejemplo `admin` → `771aab25-…`, `equintanilla` → `59e659c0-…`).

Es decir: el enlace perfil ↔ cuenta de autenticación está bien. El error `invalid_credentials` que devuelve el servidor viene de la capa de autenticación, y solo puede deberse a una de dos cosas:

1. La contraseña no es la que estás escribiendo (`Admin2024` no coincide con la almacenada).
2. El correo con el que se creó la cuenta no es `admin@fieldcredit.local` (la app convierte el usuario `admin` en ese correo automáticamente).

No puedo leer los correos ni las contraseñas de las cuentas de autenticación desde aquí (por diseño, no son legibles), así que ese dato hay que confirmarlo desde el panel, al que ya dijiste que tenés acceso.

## Paso 1 — Confirmar y restablecer (lo hacés vos, 2 minutos)

En el panel del proyecto `bdxtdhkb…`, sección **Authentication → Users**:

1. Buscá el usuario con ID `771aab25-60d5-45e2-8ebe-27176ee52d66` (es el perfil `admin`).
2. Anotá el **correo exacto** que aparece. Si NO es `admin@fieldcredit.local`, decímelo: ajusto la app para que use el dominio correcto (o cambio el correo de la cuenta para que calce).
3. Verificá que aparezca como confirmado. Si no lo está, confirmalo.
4. Usá la opción de restablecer contraseña y ponéle una nueva (por ejemplo `Admin2024`).

Con eso el login debería entrar. Si el correo era distinto, seguimos con el ajuste del paso 2.

## Paso 2 — Mejoras en la app para que esto no vuelva a pasar a ciegas

Independientemente del resultado, dejo el login más informativo y robusto:

- **Mensajes de error diferenciados**: hoy cualquier fallo muestra "usuario o contraseña incorrectos". Voy a distinguir credenciales inválidas, correo sin confirmar, perfil inexistente/inactivo y error de red.
- **Aceptar correo completo**: si escribís `equintanilla@otrodominio.com` la app ya lo respeta; lo dejo documentado en el placeholder del campo ("usuario o correo").
- **Diagnóstico visible**: registro en consola del código de error real devuelto por el servidor, para futuros reportes.
- **Pantalla de recuperación de contraseña** (opcional, decime si la querés): enlace "¿Olvidaste tu contraseña?" en `/login` más una ruta `/reset-password` que permita fijar una nueva sin entrar al panel. Requiere que el envío de correos esté activo en ese proyecto.

## Detalles técnicos

- `src/stores/app.ts` construye el correo como `` `${usuario}@fieldcredit.local` `` cuando el campo no contiene `@`; ahí se decide contra qué correo se autentica.
- El perfil se resuelve luego por `auth_user_id` en `usuarios` con `activo = true`; ese paso ya está verificado como correcto.
- Cambios previstos: `src/stores/app.ts` (devolver el motivo del fallo en lugar de `null`) y `src/routes/login.tsx` (mostrar ese motivo). Sin cambios de base de datos.
