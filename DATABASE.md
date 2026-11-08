# DATABASE.md

## Modelo de datos (MVP · flujo individual)

**Estado:** entidades y relaciones aprobadas. El detalle exacto de columnas se revisa antes de escribir la primera migración (PROJECT.md §15.3).
**Alcance:** flujo individual. Preparado, sin implementar, para varios participantes.
**Base:** PostgreSQL en Supabase.

---

## 1. Reglas generales del modelo

1. **Todo pertenece a un usuario.** Ninguna tabla queda sin dueño o sin cadena de propiedad.
2. **Identificadores UUID.** Se generan en el móvil, no en el servidor. Así la app puede guardar sin conexión y sincronizar después sin esperar respuesta.
3. **Fechas en UTC** (`timestamptz`). La app las muestra en la zona horaria del móvil.
4. **Nada se borra de verdad en el MVP.** Los ejercicios se archivan (`archived_at`). El historial no se destruye.
5. **Seguridad en el servidor.** RLS activo en todas las tablas. El `user_id` que envía el cliente nunca es la garantía de autorización.
6. **La sesión es una foto.** Al empezar se copian nombre, músculo, icono, orden y objetivos dentro de la sesión. Editar después la rutina o el ejercicio no reescribe el pasado.

---

## 2. Entidades

### 2.1. `profiles` · perfil del usuario

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | Coincide con el usuario de autenticación de Supabase |
| `display_name` | text, obligatorio | Nombre que aparece en el saludo del inicio |
| `avatar_url` | text, opcional | Imagen de perfil |
| `created_at` | timestamptz | |

**Por qué existe:** Supabase guarda el acceso; esta tabla guarda lo que la app necesita mostrar.

### 2.2. `exercises` · ejercicios

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `owner_id` | uuid, FK → `profiles.id` | Dueño del ejercicio |
| `name` | text, obligatorio | |
| `description` | text, opcional | |
| `icon` | text, opcional | Identificador del icono |
| `primary_muscle` | text, obligatorio | Catálogo pendiente de definir (ver §7) |
| `archived_at` | timestamptz, opcional | `NULL` = activo; con fecha = archivado |
| `source_exercise_id` | uuid, opcional | Procedencia de una copia (futuro). Referencia informativa, no sincronización |
| `created_at` | timestamptz | |

**Archivar no es borrar:** el ejercicio desaparece del listado general, pero sigue existiendo para rutinas e historial. Se recupera poniendo `archived_at` a `NULL`.

### 2.3. `routines` · rutinas

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `owner_id` | uuid, FK → `profiles.id` | |
| `name` | text, obligatorio | |
| `description` | text, opcional | |
| `source_routine_id` | uuid, opcional | Procedencia de una copia (futuro) |
| `created_at` | timestamptz | |

> El borrado de rutinas no está especificado en PROJECT.md. No se añade columna hasta que se apruebe (ver §7).

### 2.4. `routine_exercises` · ejercicios dentro de una rutina

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `routine_id` | uuid, FK → `routines.id` | Si se borra la rutina, se borran sus filas |
| `exercise_id` | uuid, FK → `exercises.id` | Se conserva aunque el ejercicio esté archivado |
| `position` | integer, obligatorio | Orden: 1, 2, 3… |

**Restricción:** `UNIQUE (routine_id, position)` para que no haya dos ejercicios en la misma posición.

### 2.5. `routine_set_targets` · objetivos por serie

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `routine_exercise_id` | uuid, FK → `routine_exercises.id` | |
| `set_number` | integer, obligatorio | Serie 1, 2, 3… |
| `target_weight` | numeric, opcional | Peso objetivo |
| `target_reps` | integer, opcional | Repeticiones objetivo |
| `target_time_seconds` | integer, opcional | Tiempo objetivo |

**Restricción:** `UNIQUE (routine_exercise_id, set_number)`.
Los tres objetivos son independientes y opcionales (PROJECT.md §3.2). La interfaz muestra solo los que tienen valor.

### 2.6. `routine_schedule_days` · días de la semana

| Campo | Tipo | Notas |
|---|---|---|
| `routine_id` | uuid, FK → `routines.id` | |
| `weekday` | smallint, obligatorio | 1 = lunes … 7 = domingo (ISO) |

**Clave primaria compuesta:** `(routine_id, weekday)`.

**Por qué una tabla y no una lista de texto:** permite consultar "qué rutinas toca hoy" con una sola condición y sin interpretar textos.

### 2.7. `workout_sessions` · sesiones

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | Generado en el móvil al iniciar |
| `owner_id` | uuid, FK → `profiles.id` | Quien creó la sesión (futuro: dispositivo controlador) |
| `routine_id` | uuid, FK → `routines.id` | Rutina de origen |
| `mode` | text | `individual` (único valor en el MVP) |
| `status` | text | `en_curso`, `finalizada`, `cancelada` |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz, opcional | |
| `current_participant_id` | uuid, opcional | Turno actual. En el MVP apunta al único participante |
| `rest_timer_seconds` | integer | Valor configurado. Por defecto 60 |
| `rest_timer_state` | text | `detenido`, `corriendo`, `pausado` |
| `rest_timer_remaining` | integer | Segundos restantes al guardar |

**Por qué `mode` y `current_participant_id` ya en el MVP:** PROJECT.md §14.1 los exige para el futuro. Añadirlos ahora cuesta dos columnas; añadirlos después cuesta migrar datos y reescribir el motor.

### 2.8. `session_participants` · participantes de una sesión

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `session_id` | uuid, FK → `workout_sessions.id` | |
| `user_id` | uuid, FK → `profiles.id` | Dueño real de los resultados |
| `position` | integer | Orden de turno (futuro) |

**Restricción:** `UNIQUE (session_id, position)`.

En el MVP cada sesión tiene **exactamente una fila**. Es la pieza que permite pasar a sesiones compartidas sin migrar nada.

### 2.9. `session_exercises` · ejercicios dentro de una sesión (la foto)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `session_id` | uuid, FK → `workout_sessions.id` | |
| `exercise_id` | uuid, FK → `exercises.id` | Referencia al original |
| `exercise_name` | text | Copia del nombre en el momento de empezar |
| `primary_muscle` | text | Copia |
| `icon` | text, opcional | Copia |
| `position` | integer | Orden original |
| `status` | text | `pendiente`, `saltado`, `omitido`, `completado` |

**Restricción:** `UNIQUE (session_id, position)`.

**Por qué se copian nombre, músculo e icono:** si el ejercicio se archiva o se renombra, el historial sigue explicando qué se entrenó aquel día.

### 2.10. `session_sets` · series y resultados

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `session_exercise_id` | uuid, FK → `session_exercises.id` | |
| `participant_id` | uuid, FK → `session_participants.id` | **Quién** hizo la serie |
| `set_number` | integer | Serie 1, 2, 3… |
| `target_weight` | numeric, opcional | Objetivo copiado |
| `target_reps` | integer, opcional | Objetivo copiado |
| `target_time_seconds` | integer, opcional | Objetivo copiado |
| `actual_weight` | numeric, opcional | Resultado real |
| `actual_reps` | integer, opcional | Resultado real |
| `actual_time_seconds` | integer, opcional | Resultado real |
| `status` | text | `pendiente`, `completada`, `omitida` |
| `completed_at` | timestamptz, opcional | |
| `client_operation_id` | uuid, obligatorio y único | Antiduplicados |

**Restricciones:**

- `UNIQUE (session_exercise_id, participant_id, set_number)`
- `UNIQUE (client_operation_id)`

**Por qué `participant_id` y no `user_id`:** una sesión compartida tendrá varios participantes. Si la serie apuntara al dueño de la sesión, habría que reescribir toda la app. En el MVP ambos valores son la misma persona.

**Por qué `client_operation_id`:** si el móvil reintenta un guardado, el servidor rechaza el duplicado en lugar de crear dos series.

---

## 3. Relaciones, en una frase

```
profiles ─┬─ exercises ──────────────┐
          ├─ routines ─┬─ routine_exercises ─┬─ routine_set_targets
          │            └─ routine_schedule_days
          └─ workout_sessions ─┬─ session_participants
                               └─ session_exercises ──── session_sets
```

- Un usuario tiene muchos ejercicios y rutinas.
- Una rutina tiene muchos ejercicios ordenados, cada uno con sus objetivos por serie y sus días de la semana.
- Una sesión copia una rutina: tiene participantes, ejercicios ordenados y series.
- Cada serie pertenece a un participante.

---

## 4. Seguridad (RLS)

- RLS (Row Level Security, "seguridad por fila") activo en todas las tablas.
- Regla base: un usuario solo lee y escribe filas cuyo `owner_id` es su `auth.uid()`.
- En tablas sin `owner_id` (`session_exercises`, `session_sets`, `session_participants`, `routine_*`) la comprobación sube por la cadena hasta la sesión o rutina propietaria.
- El cliente nunca decide permisos. Si intenta escribir fuera de su propiedad, PostgreSQL lo rechaza.
- Las escrituras "en nombre de otro participante" se validarán en el servidor cuando existan sesiones compartidas. **No en el cliente.**

---

## 5. Cola de sincronización (local, no en Supabase)

Tabla local en el móvil: `pending_operations`.

| Campo | Uso |
|---|---|
| `id` | Identificador de la operación (`client_operation_id`) |
| `entity` | Qué se está guardando (`session_set`, `session`, …) |
| `operation` | `insert`, `update`, … |
| `payload` | Datos completos de la operación |
| `created_at` | Para respetar el orden |
| `attempts` | Número de intentos |
| `last_error` | Último error, para diagnóstico |
| `synced_at` | Se rellena **solo** cuando el servidor confirma |

Si `synced_at` está vacío, la operación no está sincronizada, diga lo que diga la interfaz.

---

## 6. Índices previstos

- `exercises (owner_id, archived_at)`
- `routines (owner_id)`
- `routine_exercises (routine_id, position)`
- `routine_schedule_days (weekday)`
- `workout_sessions (owner_id, started_at desc)`
- `session_exercises (session_id, position)`
- `session_sets (session_exercise_id, participant_id)`
- `session_sets (client_operation_id)` único

---

## 7. Preguntas abiertas

Nada de esto se implementa hasta que se apruebe:

1. **Catálogo de músculos.** PROJECT.md pide "músculo principal" pero no define la lista de valores.
2. **Borrado de rutinas.** No está especificado si se archivan, se borran o no se pueden borrar.
3. **Borrado permanente de ejercicios.** El MVP solo archiva.
4. **Campos del perfil.** Solo se aprueba nombre visible y avatar opcional.
5. **Indicador agregado de comparación** cuando unas métricas mejoran y otras empeoran (afecta a cálculos, no al esquema).
6. **Modelo de sesiones compartidas.** Se diseña al aprobar esa fase; lo actual solo deja el hueco preparado.
