# Trabajo en paralelo · dos personas

**Estado:** activo (versión 1).
**Para quién:** las dos personas que desarrollan VEYRO con OpenCode.
**Objetivo:** que cada persona pueda avanzar sin esperar a la otra y sin pisar su trabajo.

---

## 1. La idea en una frase

> No repartimos pantallas: repartimos **carpetas** y congelamos **contratos**.

- **Carpeta propia:** cada zona del código tiene un único dueño. Solo esa persona la edita.
- **Contrato:** los tipos de datos y las funciones que una parte usa de la otra se acuerdan **antes** de programar. Así cada uno puede trabajar con datos falsos mientras el otro termina su parte.

Si no hay contrato, dos personas inventan dos formas distintas del mismo dato y luego hay que reescribir. Ese es el error que este documento evita.

---

## 2. Las cuatro reglas

1. **Solo se toca lo propio.** Si necesitas un cambio en la zona de la otra persona, se lo pides; no lo haces tú.
2. **Primero el contrato, después el código.** Ninguna parte empieza una tarea que dependa de otra sin que el contrato esté escrito y aprobado.
3. **Una tarea = una rama = un Pull Request (PR).** Nunca se trabaja directamente en `main` (ver `docs/GIT_WORKFLOW.md`).
4. **Avisar antes de tocar algo compartido.** Los archivos compartidos tienen un solo integrador (Persona A).

---

## 3. Reparto de propiedad

### Persona A · Entrenamiento y datos

| Zona | Qué contiene |
|---|---|
| `src/domain/workout-engine/` | Motor de la sesión: estados, eventos, transiciones |
| `src/modules/workouts/` | Casos de uso del entrenamiento (registrar serie, saltar, omitir) |
| `src/data/local/` | Guardado en el móvil y cola de sincronización |
| `src/data/supabase/sessionRepository.ts` | Lectura y escritura de sesiones en Supabase |
| `app/sesion/[sessionId].tsx` y `app/sesion/resumen/` | Pantalla de entrenamiento y resumen |
| `supabase/migrations/006, 008, 010, 012…` | Migraciones SQL de numeración par |

### Persona B · Planificación, historial y diseño

| Zona | Qué contiene |
|---|---|
| `src/domain/performance/` | Comparación de rendimiento (reglas puras + tests) |
| `src/domain/planning/` | Rutinas de hoy y estados del calendario |
| `src/modules/dashboard/`, `calendar/`, `history/` | Casos de uso de Inicio, calendario e historial |
| `src/ui/` | Componentes visuales reutilizables y tema |
| `app/(tabs)/index.tsx` y `app/(tabs)/calendario.tsx` | Pantallas de Inicio y Calendario |
| `app/sesion/historial/` | Historial y detalle de sesiones pasadas |
| `supabase/migrations/007, 009, 011, 013…` | Migraciones SQL de numeración impar |

### Compartido (lo toca solo la Persona A como integradora)

| Zona | Regla |
|---|---|
| `src/types/` | Contratos. Cambiarlos requiere aviso a la otra persona. |
| `src/data/supabase/client.ts` | Cliente de Supabase. No se toca sin motivo. |
| `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/gestion/_layout.tsx` | Navegación. Los cambios se avisan. |
| `package.json`, `app.json`, `.env.example` | Configuración. Solo A. |
| `src/modules/auth/`, `exercises/`, `routines/` | Ya están hechos. Cambios pequeños y avisados. |
| `ROADMAP.md`, `DATABASE.md`, `DECISIONS.md`, `PROJECT.md` | A cierra cada fase y actualiza el estado. B puede proponer cambios en su PR. |

**Por qué A es integradora:** es quien dirige el proyecto, aplica las migraciones y decide qué se fusiona.

---

## 4. Bloque 0 · Contrato de sesiones (se hace entre las dos personas)

Antes de separarse, hay que acordar la base de todo lo que viene. Sin esto, las fases 5 a 10 se pisan.

| ID | Tarea | Dueño | Depende de | Tamaño |
|---|---|---|---|---|
| C-01 | Tipos de sesión en `src/types/workout.ts` (`WorkoutSession`, `SessionExercise`, `SessionSet`, estados) | A | — | S |
| C-02 | Migración `006_sessions.sql`: 4 tablas de sesión, RLS e índices (ver `DATABASE.md` §2.7–2.10) | A | C-01 | M |
| C-03 | Datos falsos de sesión en `src/data/fixtures/` para que B pueda pintar sin base de datos | B | C-01 | S |
| C-04 | Revisión cruzada: B revisa C-01/C-02; A revisa C-03 | ambos | C-01…C-03 | S |

**Corrección pendiente en el contrato:** `DATABASE.md` describe `session_exercises.primary_muscle` (singular), pero los ejercicios ya usan `primary_muscles` (lista de 1 a 3). En `006_sessions.sql` la copia será `primary_muscles text[]`. Hay que actualizar `DATABASE.md` en el mismo PR.

**Resultado del Bloque 0:** existen los tipos, la migración aplicada y datos falsos. A y B ya pueden trabajar por separado.

---

## 5. Tablero de tareas

Estados: `Pendiente` → `En curso` → `En revisión` → `Hecho`.
Una tarea no se marca `Hecho` sin typecheck, tests y prueba manual (ver §9).

### Persona A

| ID | Tarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| A-01 | Verificar aislamiento entre 2 cuentas (ejercicios y rutinas) | 4 | — | Pendiente |
| A-02 | Motor `workout-engine` + tests de todos los casos | 5 | C-01 | Pendiente |
| A-03 | Servicios de sesión: iniciar desde rutina y guardar la “foto” | 6 | C-02 | Pendiente |
| A-04 | Pantalla de entrenamiento (registrar series, saltar, omitir, temporizador) | 6 | A-02, A-03 | Pendiente |
| A-05 | Guardado local inmediato y recuperación al reabrir la app | 6 | A-04 | Pendiente |
| A-06 | Cola de sincronización, reintentos e idempotencia | 7 | A-05 | Pendiente |
| A-07 | Pantalla de resumen al finalizar | 8 | A-04 | Pendiente |

### Persona B

| ID | Tarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| B-01 | Biblioteca de componentes UI (tarjetas, chips, campos, botones) | 11 | — | Pendiente |
| B-02 | `domain/performance` + tests de los 4 niveles | 9 | C-01 | Pendiente |
| B-03 | `domain/planning`: qué rutinas tocan hoy | 10 | — | Pendiente |
| B-04 | Pantalla de Inicio: saludo, rutinas de hoy, inicio directo | 10 | B-03, C-03 | Pendiente |
| B-05 | Calendario semanal y mensual con colores y número de semana | 10 | B-03, C-03 | Pendiente |
| B-06 | Historial y detalle de sesión pasada | 8 | C-03 | Pendiente |
| B-07 | Enlaces profundos de recuperación de contraseña (Fase 1B) | 1B | — | Pendiente |

**B-07 es la tarea “relleno”:** si B se queda bloqueada esperando a A, hace esta. No depende de nada.

### Orden recomendado

1. **Juntos:** C-01 → C-02 → C-03 → C-04.
2. **En paralelo:** A-01 + B-01. Después A-02 + B-02. Después A-03/A-04 + B-03/B-04.
3. **Cuando A-06 esté en verde:** B-05 y B-06 con datos reales.
4. **Al final:** A-07, B-01 aplicado a todas las pantallas y la Fase 11.

---

## 6. Cómo se usa Git

Se aplica `docs/GIT_WORKFLOW.md` sin excepciones. Resumen:

| Paso | Regla |
|---|---|
| Antes de empezar | `git pull origin main` y rama nueva desde `main` |
| Nombre de rama | `feat/…`, `fix/…`, `docs/…` o `refactor/…` |
| Commits | Conventional Commits: `feat(sesion): añadir motor de estados` |
| Antes de subir | `npm run typecheck`, `npm test` y prueba manual |
| Subir | `git push -u origin <rama>` y abrir PR hacia `main` |
| Revisión | La revisa la otra persona. La fusión la autoriza la Persona A |
| Prohibido | Trabajar en `main`, `force push`, borrar ramas ajenas, fusionar sin autorización |

**Nunca se ejecuta `npm run format` sobre todo el repositorio.** Prettier reescribe archivos que no has tocado y provoca conflictos. Se formatea solo el archivo editado.

---

## 7. Migraciones SQL

Solo hay **un proyecto de Supabase** compartido. Para que no se desincronice:

1. **Solo la Persona A aplica migraciones** en Supabase → SQL Editor.
2. Cada migración lleva número único: A usa pares (006, 008…), B impares (007, 009…).
3. Una migración aplicada **no se edita nunca**. Si hay un error, se crea otra que lo corrija.
4. A anota en la tabla de abajo la fecha en que la aplicó.

| Nº | Archivo | Aplicada | Fecha |
|---|---|---|---|
| 001 | `001_profiles.sql` | Sí | — |
| 002 | `002_exercises.sql` | Sí | — |
| 003 | `003_exercises_primary_muscles.sql` | Sí | — |
| 004 | `004_routines.sql` | Sí | — |
| 005 | `005_routines_archive.sql` | Sí | — |
| 006 | `006_sessions.sql` | No | — |

**La Persona B necesita el archivo `.env.local`** (claves de Supabase). Se comparte por un canal privado, nunca por Git ni por el chat del repositorio.

---

## 8. Archivos compartidos

Antes de editar uno de estos, se avisa y se espera confirmación:

- `src/types/` y `src/data/supabase/client.ts`
- Los `_layout.tsx` (navegación)
- `package.json`, `app.json`, `.env.example`
- `src/modules/auth/`, `exercises/`, `routines/`
- `README.md` y los documentos de la raíz

**Formato del aviso:**

```
Compartido: src/types/workout.ts
Qué cambio: añado el campo rest_timer_state
Por qué: lo necesita el motor (A-02)
Riesgo: bajo, solo añade un campo opcional
```

Si el cambio rompe el contrato (renombrar o quitar un campo), se avisa **antes** de programar y se actualizan las dos partes en el mismo día.

---

## 9. Cuándo una tarea está terminada

Una tarea solo pasa a `Hecho` si cumple **todo**:

1. `npm run typecheck` sin errores.
2. `npm test` en verde.
3. Prueba manual descrita en el PR (qué se hizo y qué se esperaba).
4. Sin `console.log` de depuración ni código comentado.
5. Documentación actualizada si cambió algo aprobado.
6. PR revisado por la otra persona.

---

## 10. Comunicación entre las dos personas

No hace falta reunirse a diario. Basta con avisos cortos y claros:

| Momento | Mensaje |
|---|---|
| Al empezar | `Empiezo A-02 (motor). Rama feat/workout-engine. No toco nada más.` |
| Al terminar | `A-02 lista. PR #12. Toca src/domain/workout-engine y sus tests.` |
| Al bloquearse | `B-04 bloqueada: necesito C-03 (datos falsos). ¿Puedes priorizarlo?` |
| Contrato cambiado | El formato de §8 |

**Sincronización semanal (15 minutos):** revisar el tablero, mover tareas y decidir el orden de la semana siguiente.

---

## 11. Cómo arrancar OpenCode cada día

Cada persona pega este mensaje al abrir OpenCode (cambiando `A` por `B`):

```
Lee AGENTS.md, PROJECT.md y docs/TRABAJO_PARALELO.md.
Soy la Persona A.
Antes de tocar nada:
1. Ejecuta git status y git pull origin main.
2. Dime qué tareas me tocan, cuáles están bloqueadas y qué archivos voy a tocar.
3. No edites carpetas de la Persona B ni archivos compartidos sin avisarme.
4. No apliques migraciones, no hagas push a main y no ejecutes npm run format.
Al terminar: typecheck, tests y propuesta de rama + mensaje de commit.
```

**Reglas para el agente de OpenCode:**

- Trabaja una tarea cada vez y en su rama.
- Antes de crear un archivo nuevo, comprueba si ya existe algo parecido en `src/ui/` o `src/modules/`.
- No inventa contratos: si falta un tipo o una función, se para y pregunta.
- No aplica SQL en Supabase (solo A, y a mano).
- No fusiona PRs.

---

## 12. Riesgos y cómo los evitamos

| Riesgo | Qué pasaría | Cómo se evita |
|---|---|---|
| Dos versiones del mismo tipo | Errores raros y reescrituras | Contrato primero (Bloque 0) y aviso de cambios |
| Los dos tocan un `_layout.tsx` | Conflicto en Git | Solo A toca navegación |
| Los dos crean un botón distinto | Interfaz incoherente | B es dueña de `src/ui/`; A la usa |
| Migraciones desordenadas | La base de datos no coincide con el código | Numeración por persona y solo A aplica |
| B espera a A | Tiempo perdido | Datos falsos + tarea relleno (B-07) |
| Se fusiona código roto | La app deja de arrancar | Typecheck, tests y PR revisado |

---

## 13. Cómo añadir una tarea nueva

1. ¿Depende de algo que aún no existe? Si sí, primero se crea el contrato.
2. ¿En qué carpeta vive? Se asigna a su dueño.
3. ¿Toca un archivo compartido? Se avisa.
4. Se añade al tablero con ID, fase, dependencia y tamaño.
5. Se trabaja en rama y PR, como el resto.

**Tamaño orientativo:** `S` = menos de una sesión; `M` = una o dos sesiones; `L` = más de dos, hay que dividirla.

---

## 14. Mantenimiento de este documento

- Se actualiza el **estado** del tablero al empezar y al terminar cada tarea.
- Los cambios de reparto se acuerdan entre las dos personas y se escriben aquí.
- La Persona A cierra cada fase en `ROADMAP.md` cuando las tareas de esa fase están en `Hecho`.
- Este documento describe **cómo trabajamos**, no qué está implementado. Para eso están `ROADMAP.md` y `PROJECT.md`.
