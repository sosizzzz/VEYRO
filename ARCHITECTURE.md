# ARCHITECTURE.md

## Arquitectura de la aplicación (MVP · flujo individual)

**Estado:** aprobada.
**Alcance:** flujo individual. Las sesiones compartidas están definidas en PROJECT.md, pero no se implementan todavía.
**Regla de oro:** este documento describe lo aprobado, no lo implementado.

---

## 1. Objetivo de la arquitectura

Que la app se pueda construir y ampliar sin reescribirla. Para eso se separa en capas con una única regla:

> **Cada capa solo conoce a la capa que tiene justo debajo. Nunca al revés.**

Esto significa que la lógica de negocio no sabe que existe una pantalla, y que una pantalla no sabe que existe Supabase. Si mañana cambia la base de datos, las pantallas no se tocan.

---

## 2. Las cinco capas

De dentro hacia fuera:

```
┌─────────────────────────────────────────────┐
│ 5. Rutas y pantallas (app/)                 │  Pinta y recoge datos del usuario
├─────────────────────────────────────────────┤
│ 4. Casos de uso (services)                  │  "Iniciar sesión de hoy", "sincronizar"
├─────────────────────────────────────────────┤
│ 3. Repositorios (repositories)              │  Traducen a Supabase / almacenamiento local
├─────────────────────────────────────────────┤
│ 2. Dominio (domain/)                        │  Reglas puras: motor, comparación, calendario
├─────────────────────────────────────────────┤
│ 1. Tipos y validaciones (types/, schemas)   │  La forma de los datos y qué es válido
└─────────────────────────────────────────────┘
```

### Capa 1 · Tipos y validaciones

- **Qué es:** los "moldes" de los datos (`Exercise`, `Routine`, `WorkoutSession`…) y las reglas de validación de formularios (por ejemplo, "el nombre no puede estar vacío").
- **Herramienta propuesta:** TypeScript estricto para los tipos y **Zod** para las validaciones en tiempo de ejecución.
- **Por qué Zod:** TypeScript comprueba los tipos mientras programas, pero no cuando llegan datos de fuera (formularios, Supabase, almacenamiento). Zod comprueba también en ese momento.
- **No puede:** importar React Native, Expo ni Supabase.

### Capa 2 · Dominio

- **Qué es:** el cerebro. Vive en `src/domain/` y es **TypeScript puro**: funciones que reciben datos y devuelven datos.
- **Contenido:**
  - `workout-engine/`: el motor de estados de una sesión (ver WORKFLOW.md).
  - `performance/`: la comparación de rendimiento.
  - `planning/`: qué rutinas tocan hoy y los colores del calendario.
- **Por qué separado:** es la parte con más reglas y la más fácil de romper. Al ser puro se puede probar con tests automáticos en milisegundos, sin móvil ni red.
- **No puede:** importar React, React Native, Expo, Supabase ni AsyncStorage.
- **Truco para comprobarlo:** si un archivo de `domain/` tiene un `import` que empieza por `react` o `@supabase`, está mal colocado.

### Capa 3 · Repositorios

- **Qué es:** la única puerta de entrada y salida de datos.
- **Contenido:**
  - `supabase/`: consultas a la base de datos remota.
  - `local/`: almacenamiento en el móvil (sesión en curso y cola de sincronización).
- **Por qué:** AGENTS.md prohíbe mezclar consultas a Supabase con componentes visuales. Aquí se cumple.
- **Contrato:** cada repositorio expone funciones con nombres del negocio (`getExercises`, `saveSet`, `archiveExercise`), no con nombres de SQL.

### Capa 4 · Casos de uso (`services`)

- **Qué es:** el pegamento. Combina dominio + repositorios para completar una acción del usuario.
- **Ejemplo:** "registrar una serie" = validar los datos → pedir al motor el nuevo estado → guardar en local → encolar la sincronización → devolver el estado a la pantalla.
- **Por qué existe:** evita repetir ese orden en cada pantalla y deja un único sitio donde cambiarlo.

### Capa 5 · Rutas y pantallas

- **Qué es:** `app/` con Expo Router. Cada archivo es una ruta (una pantalla).
- **Regla:** las pantallas son **delgadas**. Recogen datos, llaman a un caso de uso y pintan. No calculan reglas de negocio.
- **Componentes reutilizables:** viven en `src/ui/` y no saben de dónde vienen los datos. Reciben propiedades y emiten eventos.

---

## 3. Estructura de carpetas

```
app/                              Rutas (Expo Router). Solo pantallas y navegación.
  _layout.tsx                     Layout raíz: sesión de usuario, fuentes, tema.
  (auth)/
    inicio-sesion.tsx             Acceso con correo + contraseña.
    registro.tsx                  Crear cuenta.
  (tabs)/
    _layout.tsx                   Menú inferior de tres apartados.
    index.tsx                     Inicio: rutina(s) de hoy.
    calendario.tsx                Calendario semanal y mensual.
    gestion/
      index.tsx                   Accesos a Rutinas y Ejercicios.
      rutinas/
        index.tsx                 Lista de rutinas.
        nueva.tsx                 Crear rutina.
        [routineId].tsx           Editar rutina.
      ejercicios/
        index.tsx                 Lista de ejercicios.
        archivados.tsx            Ejercicios archivados y recuperación.
        nuevo.tsx                 Crear ejercicio.
        [exerciseId].tsx          Editar ejercicio.
  sesion/
    [sessionId].tsx               Ejecución en curso.
    resumen/[sessionId].tsx       Resumen al finalizar.
    historial/
      index.tsx                   Historial de sesiones.
      [sessionId].tsx             Detalle de una sesión pasada.

src/
  domain/                         TypeScript puro. Sin React ni Supabase.
    workout-engine/               Motor de ejecución de la sesión.
    performance/                  Comparación de rendimiento.
    planning/                     Rutinas del día y estados del calendario.
  data/
    supabase/                     Cliente y repositorios remotos.
    local/                        Almacenamiento local y cola de sincronización.
  modules/                        Un módulo por dominio funcional.
    auth/                         Componentes, hooks y casos de uso de acceso.
    exercises/
    routines/
    workouts/
    history/
    dashboard/
    calendar/
  ui/                             Componentes visuales reutilizables y tema.
  types/                          Tipos compartidos.
  config/                         Variables de entorno y constantes.

supabase/
  migrations/                     Migraciones SQL (se crean al aprobar DATABASE.md).
```

**Por qué dos carpetas (`app/` y `src/`):** Expo Router exige que las rutas estén en `app/`. Todo lo demás vive en `src/` para que las rutas queden limpias y se vea a simple vista qué es pantalla y qué es lógica.

---

## 4. Decisiones técnicas clave

### 4.1. La sesión guarda una "foto" de la rutina

Al empezar una sesión se copian dentro de la sesión la estructura, el orden y los objetivos de la rutina.

- **Motivo:** PROJECT.md exige que editar una rutina no altere sesiones históricas. Si la sesión leyera la rutina en vivo, editar la rutina reescribiría el pasado.
- **Ventaja extra:** el motor funciona sin red y sin leer rutinas a mitad de entrenamiento.
- **Coste:** se duplican datos. Es aceptable: son pocos y se guardan una sola vez por sesión.

### 4.2. Siempre existe un participante, aunque sea uno

Toda sesión tiene filas en `session_participants` y cada serie apunta a un participante.

- **Motivo:** en el MVP habrá una fila por sesión. En sesiones compartidas habrá varias.
- **Beneficio:** el cambio futuro no requiere migrar datos ni reescribir consultas. Solo añadir filas.

### 4.3. Guardado local primero, sincronización después

Cada operación relevante se escribe en el móvil al instante y entra en una cola.

- **Motivo:** PROJECT.md §15.1. El usuario no puede perder una serie por falta de cobertura.
- **Regla:** una operación no se considera sincronizada hasta que el servidor confirma.

### 4.4. Motor de estados puro

El motor recibe un estado y un evento, y devuelve un estado nuevo.

- **Motivo:** PROJECT.md §14 exige un motor independiente. Además se puede probar sin interfaz.
- **Consecuencia:** la pantalla no decide "qué ejercicio toca"; solo muestra lo que el motor devuelve.

### 4.5. Identificadores generados en el móvil

Cada operación lleva un identificador único creado en el dispositivo.

- **Motivo:** si la sincronización se reintenta, el servidor reconoce la operación y no la duplica (idempotencia).

---

## 5. Ejemplo de recorrido completo: registrar una serie

Sirve para ver cómo colaboran las capas.

1. **Pantalla** (`app/sesion/[sessionId].tsx`): el usuario pulsa "Serie completada" con peso 80 y 10 repeticiones.
2. **Caso de uso** (`workouts/services/registerSet.ts`): valida los datos con Zod.
3. **Dominio** (`workout-engine`): recibe el estado actual + el evento "serie completada" y devuelve el estado nuevo (qué serie sigue, qué ejercicio toca, si la sesión termina).
4. **Repositorio local**: guarda el estado nuevo y añade la operación a la cola de sincronización, con su identificador único.
5. **Pantalla**: se repinta con el estado que devolvió el motor.
6. **Más tarde, con red**: un proceso de sincronización envía la operación a Supabase; si el servidor confirma, se marca como sincronizada. Si falla, se reintenta.

Ningún paso salta capas y ninguna pantalla habla con Supabase.

---

## 6. Configuración y secretos

- Variables de entorno en `.env.local`, nunca en el código.
- Prefijo `EXPO_PUBLIC_` solo para lo que puede ver el usuario (URL y clave pública de Supabase). Esas claves son públicas por diseño; la protección real son las políticas RLS.
- La clave de servicio de Supabase (`service_role`) **nunca** entra en la app.
- `.env.local` no se sube a Git.

---

## 7. Manejo de errores

- **Errores esperables** (sin conexión, datos inválidos): se muestran al usuario en lenguaje claro y se reintentan cuando tenga sentido.
- **Errores inesperados:** se registran y se muestra un mensaje genérico.
- **Nunca** se muestra un error técnico crudo al usuario.
- Las operaciones locales pendientes **no se borran** por un fallo de red.

---

## 8. Pruebas

| Qué se prueba | Cómo | Cuándo |
|---|---|---|
| Dominio (motor, comparación, calendario) | Tests automáticos de TypeScript, rápidos y sin móvil | En cada fase que toque dominio |
| Repositorios | Tests con datos falsos (mocks) | Al crear cada repositorio |
| Pantallas y flujo completo | Prueba manual en Expo Go, incluido modo avión | Al cerrar cada fase |
| Sincronización | Manual: registrar series sin red, cerrar la app, abrir con red | Fase 7 |

---

## 9. Lo que esta arquitectura NO incluye

- Sesiones compartidas, turnos, invitaciones ni amistades.
- Notificaciones push.
- Comunicación en tiempo real entre dispositivos.
- Borrado permanente de ejercicios.
- Uso sin conexión de rutinas y ejercicios ya guardados (solo se garantiza offline la sesión en curso; ver DECISIONS.md).

Se añadirán cuando se aprueben sus fases.
