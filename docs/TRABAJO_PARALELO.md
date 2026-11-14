# Trabajo en paralelo · Adrián y María

**Estado:** activo (versión 2, alcance completo del MVP).
**Para quién:** Adrián y María, las dos personas que desarrollan VEYRO con OpenCode.
**Objetivo:** avanzar el doble de rápido repartiendo el trabajo de forma que **casi nunca** dependamos la una del otro.

---

## 1. La idea en una frase

> No repartimos pantallas: repartimos **carpetas** y congelamos **contratos**.

- **Carpeta propia:** cada zona del código tiene un único dueño. Solo esa persona la edita.
- **Contrato:** los tipos de datos y las funciones que una parte usa de la otra se acuerdan **antes** de programar. Así cada uno trabaja con datos falsos mientras el otro termina su parte.

Si no hay contrato, cada persona inventa una forma distinta del mismo dato y luego hay que reescribirlo. Ese es el error que este documento evita.

---

## 2. Las cuatro reglas

1. **Solo se toca lo propio.** Si necesitas un cambio en la zona del otro, se lo pides; no lo haces tú.
2. **Primero el contrato, después el código.** Ninguna tarea que dependa de otra empieza sin el contrato escrito.
3. **Una tarea = una rama = un Pull Request (PR).** Nunca se trabaja directamente en `main` (ver `docs/GIT_WORKFLOW.md`).
4. **Avisar antes de tocar algo compartido.** Los archivos compartidos los integra Adrián.

---

## 3. Reparto de propiedad

### Adrián · Entrenamiento y datos

| Zona | Qué contiene |
|---|---|
| `src/domain/workout-engine/` | Motor de la sesión: estados, eventos y transiciones |
| `src/modules/workouts/` | Casos de uso del entrenamiento (registrar serie, saltar, omitir) |
| `src/data/local/` | Guardado en el móvil y cola de sincronización |
| `src/data/supabase/sessionRepository.ts` | Lectura y escritura de sesiones en Supabase |
| `app/sesion/[sessionId].tsx` | Pantalla de entrenamiento en curso |
| `supabase/migrations/006, 008, 010, 012…` | Migraciones SQL de numeración par |

### María · Planificación, historial y diseño

| Zona | Qué contiene |
|---|---|
| `src/domain/performance/` | Comparación de rendimiento (reglas puras + tests) |
| `src/domain/planning/` | Rutinas de hoy y estados del calendario |
| `src/modules/dashboard/`, `calendar/`, `history/` | Casos de uso de Inicio, calendario e historial |
| `src/ui/` | Componentes visuales reutilizables y tema |
| `app/(tabs)/index.tsx` y `app/(tabs)/calendario.tsx` | Pantallas de Inicio y Calendario |
| `app/sesion/resumen/` y `app/sesion/historial/` | Resumen e historial |
| `supabase/migrations/007, 009, 011, 013…` | Migraciones SQL de numeración impar |

### Compartido (lo toca solo Adrián como integrador)

| Zona | Regla |
|---|---|
| `src/types/` | Contratos. Cambiarlos requiere aviso a la otra persona. |
| `src/data/supabase/client.ts` | Cliente de Supabase. No se toca sin motivo. |
| `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/gestion/_layout.tsx` | Navegación. Los cambios se avisan. |
| `package.json`, `app.json`, `.env.example` | Configuración. Solo Adrián. |
| `src/modules/auth/`, `exercises/`, `routines/` | Ya están hechos. Cambios pequeños y avisados. |
| `ROADMAP.md`, `DATABASE.md`, `DECISIONS.md`, `PROJECT.md` | Adrián cierra cada fase y actualiza el estado. María puede proponer cambios en su PR. |

**Por qué Adrián integra:** aplica las migraciones, revisa las políticas de seguridad y autoriza las fusiones.

---

## 4. Contratos

Un **contrato** es un archivo pequeño (tipos de TypeScript) que dice *qué forma tienen los datos* y *qué funciones existen*. Se escribe en una rama `docs/…` o junto a la primera tarea, y el otro lo revisa.

| ID | Contrato | Escribe | Lo usa | Necesario antes de |
|---|---|---|---|---|
| CT-01 | Sesión: `WorkoutSession`, `SessionExercise`, `SessionSet`, estados + SQL `006` | Adrián | ambos | Oleada 1 |
| CT-02 | Comparación: niveles, colores y resultado por serie | María | Adrián (A-09), María (M-10) | Oleada 1 |
| CT-03 | Planificación: `TodayPlan`, `CalendarDay` | María | María (M-05, M-06) | Oleada 2 |
| CT-04 | Sincronización: `SyncOperation`, `SyncState` | Adrián | María (M-08) | Oleada 3 |
| CT-05 | Resumen e historial: `SessionSummary` | Adrián | María (M-07, M-09) | Oleada 3 |
| CT-06 | Props de los componentes de sesión (`SetRow`, `RestTimer`…) | María | Adrián (A-05) | Oleada 2 |

**Regla de cambio:** un contrato congelado no se cambia en silencio. Se avisa con este formato y se actualizan las dos partes el mismo día.

```
Contrato: CT-05 SessionSummary
Qué cambio: añado el campo canceled_at
Por qué: lo necesita el historial para separar canceladas
Riesgo: bajo, campo opcional
```

### 4.1. Decisiones pendientes que pueden bloquear

| Decisión | Bloquea | Cuándo hay que decidirla |
|---|---|---|
| Cómo comparar cuando cambia el número de series (Fase 9) | M-03, M-10 | Antes de la oleada 1 |
| Diseño visual definitivo (PROJECT.md §13) | M-12 | Antes de la oleada 5 |
| Enlaces profundos: Expo Go o app de desarrollo (Fase 1B) | M-11 | Antes de la oleada 1 |

Si una decisión no está tomada, la tarea no empieza: se cambia por otra y se avisa.

---

## 5. Bloque 0 · Contrato de sesiones (juntos, antes de separarse)

| ID | Tarea | Dueño | Depende de | Tamaño | Estado |
|---|---|---|---|---|---|
| C-01 | Tipos de sesión en `src/types/workout.ts` | Adrián | — | S | Hecho |
| C-02 | Migración `006_sessions.sql`: 4 tablas, RLS e índices (`DATABASE.md` §2.7–2.10) | Adrián | C-01 | M | En revisión (SQL listo; falta aplicarlo) |
| C-03 | Datos falsos en `src/data/fixtures/` para pintar sin base de datos | María | C-01 | S | Hecho |
| C-04 | Revisión cruzada: María revisa C-01/C-02; Adrián revisa C-03 | ambos | C-01…C-03 | S | Pendiente |

**Corrección pendiente:** `DATABASE.md` dice `session_exercises.primary_muscle` (singular), pero los ejercicios ya usan `primary_muscles` (lista de 1 a 3). En `006` la copia será `primary_muscles text[]` y se actualiza el documento en el mismo PR.

**Criterio de salida de la oleada 0:** migración aplicada, `npm run typecheck` limpio y datos falsos disponibles.

---

## 6. Tablero completo por oleadas

Estados: `Pendiente` → `En curso` → `En revisión` → `Hecho`.
Tamaño: `S` = menos de una sesión; `M` = una o dos; `L` = más de dos (hay que dividirla).
Una tarea no pasa a `Hecho` sin typecheck, tests y prueba manual (ver §10).

### Oleada 1 · Cimientos (en paralelo, sin dependencias entre sí)

| ID | Tarea | Fase | Depende de | Tamaño | Estado |
|---|---|---|---|---|---|
| A-01 | Verificar aislamiento entre 2 cuentas (ejercicios y rutinas) | 4 | — | S | Pendiente |
| A-02 | Motor: estados y transiciones + tests | 5 | C-01 | M | Pendiente |
| M-01 | Biblioteca UI base: botones, campos, tarjetas, chips, mensajes | 11 | — | M | Pendiente |
| M-03 | Dominio `performance` + tests de los 4 niveles | 9 | CT-02 | M | Pendiente |
| M-11 | Enlaces de recuperación de contraseña (Fase 1B) | 1B | — | M | Pendiente |

**Criterio de salida:** tests del motor en verde, UI base usable y `performance` probado con datos falsos.

### Oleada 2 · Sesión y planificación

| ID | Tarea | Fase | Depende de | Tamaño | Estado |
|---|---|---|---|---|---|
| A-03 | Motor: temporizador, saltar/omitir y finalización + tests | 5 | A-02 | M | Pendiente |
| A-04 | Servicios de sesión: iniciar desde rutina, guardar la “foto”, finalizar y cancelar | 6 | C-02 | M | Pendiente |
| M-02 | Componentes de sesión: fila de serie, progreso del ejercicio, temporizador visual | 6 | M-01, CT-06 | M | Pendiente |
| M-04 | Dominio `planning`: qué rutinas tocan hoy | 10 | CT-03 | S | Pendiente |
| M-05 | Pantalla de Inicio: saludo, rutinas de hoy, inicio directo | 10 | M-04, M-01 | M | Pendiente |
| M-14 | Creación rápida de ejercicio desde la rutina (pendiente de Fase 3) | 3 | — | S | Pendiente |

**Criterio de salida:** desde Inicio se puede iniciar una sesión (aunque la pantalla de entrenamiento aún sea provisional) y el motor pasa todos los tests.

### Oleada 3 · Pantalla, guardado e historial

| ID | Tarea | Fase | Depende de | Tamaño | Estado |
|---|---|---|---|---|---|
| A-05 | Pantalla de entrenamiento: cablear motor, objetivos y acciones | 6 | A-03, A-04, M-02, CT-06 | L | Pendiente |
| A-06 | Guardado local inmediato y recuperación al reabrir la app | 6 | A-05 | M | Pendiente |
| M-06 | Calendario semanal y mensual con colores y número de semana | 10 | M-04, M-01, C-03 | M | Pendiente |
| M-07 | Historial y detalle de sesión pasada | 8 | CT-05, C-03 | M | Pendiente |
| M-08 | Indicador de sincronización (pendiente / sincronizado) | 7 | CT-04, M-01 | S | Pendiente |

**Criterio de salida:** entrenar, cerrar la app a mitad y recuperar la sesión; el historial y el calendario pintan datos falsos o reales.

### Oleada 4 · Sincronización y cierre del ciclo

| ID | Tarea | Fase | Depende de | Tamaño | Estado |
|---|---|---|---|---|---|
| A-07 | Cola de sincronización: reintentos, idempotencia y estado | 7 | A-06, CT-04 | L | Pendiente |
| A-08 | Resumen: cálculo de totales (duración, completados, omitidos, series) | 8 | A-05, CT-05 | S | Pendiente |
| A-09 | Integrar la comparación de rendimiento en la sesión | 9 | M-03, A-05 | M | Pendiente |
| M-09 | Pantalla de resumen al finalizar | 8 | CT-05, M-01 | M | Pendiente |
| M-10 | Comparación de rendimiento en resumen e historial | 9 | M-03, M-09 | S | Pendiente |

**Criterio de salida:** sesión con red y sin red; el resumen y el historial muestran los cuatro colores de comparación.

### Oleada 5 · Pulido y entrega

| ID | Tarea | Fase | Depende de | Tamaño | Estado |
|---|---|---|---|---|---|
| A-10 | Rendimiento en móvil real y prueba de estrés (muchas series) | 11 | Oleada 4 | M | Pendiente |
| A-11 | Prueba de extremo a extremo y cierre de ROADMAP/README | 11 | todas | S | Pendiente |
| M-12 | Revisión visual completa y accesibilidad (tamaños, contraste) | 11 | todas | M | Pendiente |
| M-13 | Repaso de textos y mensajes de error | 11 | todas | S | Pendiente |

**Criterio de salida:** registro → rutina → entrenamiento → historial funciona seguido, en un móvil real, sin mensajes técnicos.

---

## 7. Por qué así se avanza el doble

En cada oleada hay **una tarea de Adrián y una o dos de María que no comparten archivos**. Los únicos puntos de espera son los contratos, que son pequeños y se resuelven en una sesión.

```
Oleada 1:  Adrián → motor            María → UI + rendimiento + contraseña
Oleada 2:  Adrián → sesión/servicios María → componentes + Inicio
Oleada 3:  Adrián → pantalla/guardado María → calendario + historial + sync UI
Oleada 4:  Adrián → cola/resumen      María → resumen UI + comparación UI
Oleada 5:  Adrián → rendimiento       María → visual + textos
```

**Regla de desbloqueo:** si una tarea lleva más de un día esperando algo del otro, se cambia a una tarea que no dependa de nadie (M-11, M-14, M-01) y se avisa. Nunca se queda alguien parado.

**Regla de no adelantarse:** no se empieza una tarea de la oleada siguiente si depende de un contrato que aún no está congelado. Adelantarse sin contrato genera retrabajo.

---

## 8. Cómo se usa Git

Se aplica `docs/GIT_WORKFLOW.md` sin excepciones.

| Paso | Regla |
|---|---|
| Antes de empezar | `git pull origin main` y rama nueva desde `main` |
| Nombre de rama | `feat/…`, `fix/…`, `docs/…` o `refactor/…` |
| Commits | Conventional Commits: `feat(sesion): añadir motor de estados` |
| Antes de subir | `npm run typecheck`, `npm test` y prueba manual |
| Subir | `git push -u origin <rama>` y abrir PR hacia `main` |
| Revisión | La revisa la otra persona. La fusión la autoriza Adrián |
| Prohibido | Trabajar en `main`, `force push`, borrar ramas ajenas, fusionar sin autorización |

**Nunca se ejecuta `npm run format` sobre todo el repositorio.** Prettier reescribe archivos que no has tocado y provoca conflictos. Se formatea solo el archivo editado.

**Si hay conflicto:** no se resuelve “a ciegas”. Se para, se avisa y se decide juntos qué versión vale.

---

## 9. Migraciones y entorno

Solo hay **un proyecto de Supabase** compartido.

1. **Solo Adrián aplica migraciones** en Supabase → SQL Editor.
2. Numeración: Adrián usa pares (006, 008…), María impares (007, 009…).
3. Una migración aplicada **no se edita nunca**. Si hay un error, se crea otra que lo corrija.
4. Adrián anota la fecha de aplicación.

| Nº | Archivo | Aplicada | Fecha |
|---|---|---|---|
| 001 | `001_profiles.sql` | Sí | — |
| 002 | `002_exercises.sql` | Sí | — |
| 003 | `003_exercises_primary_muscles.sql` | Sí | — |
| 004 | `004_routines.sql` | Sí | — |
| 005 | `005_routines_archive.sql` | Sí | — |
| 006 | `006_sessions.sql` | No | — |

**María necesita `.env.local`** (claves de Supabase). Se comparte por un canal privado, nunca por Git.

---

## 10. Cuándo una tarea está terminada

1. `npm run typecheck` sin errores.
2. `npm test` en verde.
3. Prueba manual descrita en el PR (qué se hizo y qué se esperaba).
4. Sin `console.log` de depuración ni código comentado.
5. Documentación actualizada si cambió algo aprobado.
6. PR revisado por la otra persona.

---

## 11. Comunicación

| Momento | Mensaje |
|---|---|
| Al empezar | `Empiezo A-02 (motor). Rama feat/workout-engine. No toco nada más.` |
| Al terminar | `A-02 lista. PR #12. Toca src/domain/workout-engine y sus tests.` |
| Al bloquearse | `M-05 bloqueada: necesito CT-03. ¿Puedes revisarlo hoy?` |
| Contrato cambiado | El formato de §4 |

**Sincronización semanal (15 minutos):** revisar el tablero, mover tareas y decidir el orden de la semana siguiente.

---

## 12. Cómo arrancar OpenCode cada día

Cada persona pega este mensaje al abrir OpenCode (cambiando el nombre):

```
Lee AGENTS.md, PROJECT.md y docs/TRABAJO_PARALELO.md.
Soy María / soy Adrián.
Antes de tocar nada:
1. Ejecuta git status y git pull origin main.
2. Dime qué tareas me tocan, cuáles están bloqueadas y qué archivos voy a tocar.
3. No edites carpetas de la otra persona ni archivos compartidos sin avisar.
4. No apliques migraciones, no hagas push a main y no ejecutes npm run format.
Al terminar: typecheck, tests y propuesta de rama + mensaje de commit.
```

**Reglas para el agente de OpenCode:**

- Trabaja una tarea cada vez y en su rama.
- Antes de crear un archivo, comprueba si ya existe algo parecido en `src/ui/` o `src/modules/`.
- No inventa contratos: si falta un tipo o una función, se para y pregunta.
- No aplica SQL en Supabase (solo Adrián, y a mano).
- No fusiona PRs.

---

## 13. Riesgos y cómo los evitamos

| Riesgo | Qué pasaría | Cómo se evita |
|---|---|---|
| Dos versiones del mismo tipo | Errores raros y reescrituras | Contratos CT-01…CT-06 y aviso de cambios |
| Los dos tocan un `_layout.tsx` | Conflicto en Git | Solo Adrián toca navegación |
| Dos botones distintos | Interfaz incoherente | María es dueña de `src/ui/`; Adrián la usa |
| Migraciones desordenadas | La base no coincide con el código | Numeración por persona y solo Adrián aplica |
| María espera a Adrián | Tiempo perdido | Datos falsos + tareas M-11 y M-14 |
| Se fusiona código roto | La app deja de arrancar | Typecheck, tests y PR revisado |
| Una tarea `L` se eterniza | Se pierde el ritmo | Se divide antes de empezar |

---

## 14. Cómo añadir una tarea nueva

1. ¿Depende de algo que aún no existe? Si sí, primero se crea el contrato.
2. ¿En qué carpeta vive? Se asigna a su dueño.
3. ¿Toca un archivo compartido? Se avisa.
4. Se añade al tablero con ID, fase, dependencia y tamaño.
5. Se trabaja en rama y PR, como el resto.

---

## 15. Mantenimiento de este documento

- Se actualiza el **estado** del tablero al empezar y al terminar cada tarea.
- Los cambios de reparto se acuerdan entre los dos y se escriben aquí.
- Adrián cierra cada fase en `ROADMAP.md` cuando sus tareas están en `Hecho`.
- Este documento describe **cómo trabajamos**, no qué está implementado. Para eso están `ROADMAP.md` y `PROJECT.md`.
