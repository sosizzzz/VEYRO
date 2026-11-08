# DECISIONS.md

## Registro de decisiones aprobadas

**Regla:** aquí solo entran decisiones aprobadas. Lo pendiente se queda en PROJECT.md, WORKFLOW.md o DATABASE.md marcado como tal.

Formato de cada decisión:

- **Contexto:** qué problema había.
- **Decisión:** qué se hace.
- **Por qué:** la razón.
- **Consecuencias:** qué implica, incluido lo que se deja fuera.

---

## Flujo individual (MVP)

### IN-001 · Acceso con correo y contraseña

- **Contexto:** PROJECT.md §16 exige autenticación y RLS, pero no fija el método.
- **Decisión:** registro e inicio de sesión con correo electrónico y contraseña.
- **Por qué:** es el método más predecible en Expo Go. No depende de enlaces profundos ni de que el correo llegue a tiempo, dos fuentes habituales de fallos al empezar.
- **Consecuencias:** hay que implementar recuperación de contraseña y verificación de correo. No habrá acceso con Google ni enlace mágico en el MVP.

### IN-002 · Los ejercicios se archivan, no se borran

- **Contexto:** PROJECT.md §4 pide preservar la integridad si hay rutinas o historial asociados, sin elegir estrategia.
- **Decisión:** archivar. El ejercicio desaparece del listado general, se conserva en rutinas e historial y puede recuperarse desde una vista de archivados.
- **Por qué:** borrarlo rompería el historial o dejaría rutinas con huecos.
- **Consecuencias:** existe una pantalla de archivados. Un ejercicio archivado sigue siendo entrenable dentro de una rutina y se muestra marcado. La eliminación permanente queda fuera del MVP.

### IN-003 · Comparación contra la última sesión, tolerancia 0

- **Contexto:** PROJECT.md §9 exigía aprobar los criterios exactos; estaban pendientes.
- **Decisión:** se compara con la última sesión del mismo ejercicio del mismo participante, con tolerancia 0 en peso, repeticiones y tiempo.
- **Por qué:** comparar con la sesión inmediatamente anterior es fácil de explicar al usuario y no diluye el progreso mezclando momentos distintos. La tolerancia 0 evita que una mejora real se muestre como "similar".
- **Consecuencias:** "similar" solo ocurre con valores exactamente iguales. Queda pendiente el color del indicador agregado cuando unas métricas mejoran y otras empeoran.

### IN-004 · Dos puertas de entrada y calendario informativo

- **Contexto:** PROJECT.md §10 y §12 describían el inicio y el calendario, pero no decían desde dónde se lanza una sesión.
- **Decisión:** una sesión se inicia desde el inicio (solo rutinas de hoy) o desde la lista de rutinas (cualquiera). El calendario no inicia nada.
- **Por qué:** el inicio responde a "qué toca hoy" y la lista responde a "qué quiero entrenar". Mezclarlos crea dudas y sesiones accidentales.
- **Consecuencias:** el inicio nunca muestra rutinas que no toquen hoy. El calendario es solo consulta.

### IN-005 · Sesiones no planificadas visibles en el calendario

- **Contexto:** si se entrena una rutina que no tocaba hoy, ¿desaparece del calendario?
- **Decisión:** aparece como **entrada adicional del día**, visualmente diferenciada.
- **Por qué:** un entrenamiento real no debe ocultarse. Ocultarlo daría una imagen falsa de la semana.
- **Consecuencias:** el calendario distingue dos tipos de entrada: planificada y adicional. Las adicionales no alteran el estado de las planificadas.

### IN-006 · Cancelar exige confirmación

- **Contexto:** PROJECT.md §6 pedía que cancelar fuera una acción independiente, sin especificar protección.
- **Decisión:** cancelar siempre pide confirmación y nunca se confunde con cerrar la app ni con finalizar.
- **Por qué:** cancelar descarta un entrenamiento en curso; un toque accidental no debe costar la sesión.
- **Consecuencias:** hay un diálogo de confirmación. Cerrar la app no cancela nada.

### PR-001 · Código comentado en lenguaje sencillo

- **Contexto:** quien dirige el proyecto está aprendiendo a programar y necesita entender el código, no solo que funcione.
- **Decisión:** comentar mucho, explicar el porqué de cada bloque, evitar abreviaturas crípticas y acompañar cada entrega de una explicación de qué se tocó y cómo probarlo. Es una regla universal, recogida en AGENTS.md.
- **Por qué:** el objetivo incluye aprender. Un código que funciona pero no se entiende genera dependencia y errores difíciles de corregir.
- **Consecuencias:** el código será algo más largo. Se acepta ese coste.

### AR-001 · Arquitectura en capas y plan por fases

- **Contexto:** PROJECT.md §19 exigía una propuesta antes de implementar.
- **Decisión:** arquitectura de cinco capas (tipos, dominio, repositorios, casos de uso, pantallas), estructura `app/` + `src/`, y desarrollo en fases verificables.
- **Por qué:** permite probar la lógica sin móvil, cambiar la base de datos sin tocar pantallas y aprender por partes.
- **Consecuencias:** documentado en ARCHITECTURE.md y ROADMAP.md.

---

## Sesiones compartidas (definidas, no implementadas)

### SH-001 · Copia personal de la rutina compartida

- **Contexto:** al aceptar una rutina de otra persona había que decidir si se comparte o se copia.
- **Decisión:** se crea una copia reutilizable en la biblioteca personal, sin dependencia editable con la original y con referencia de procedencia.
- **Por qué:** evita que los cambios del anfitrión alteren rutinas ajenas y permite reutilizarla como propia.
- **Consecuencias:** los objetivos no se copian; cada participante configura los suyos.

### SH-002 · Alternancia por serie

- **Contexto:** en una sesión compartida había que decidir el orden de intervención.
- **Decisión:** los participantes alternan por serie, en un orden fijado al iniciar.
- **Por qué:** mantiene la sesión coordinada y evita que alguien termine todo antes de que intervengan los demás.
- **Consecuencias:** el motor debe distinguir serie pendiente, completada y omitida, y guardar el turno actual.

### SH-003 · Ejercicios personalizados compartidos con confirmación

- **Contexto:** una rutina compartida puede contener ejercicios que el receptor no tiene.
- **Decisión:** se muestra el ejercicio y se pide confirmación para incorporarlo a su biblioteca; si rechaza, sigue disponible como referencia en esa rutina.
- **Por qué:** permite compartir rutinas completas sin obligar a nadie a llenar su biblioteca con ejercicios que no quiere.
- **Consecuencias:** la incorporación es siempre explícita. Los ejercicios incorporados conservan referencia de procedencia.

---

## Decisiones técnicas aprobadas dentro de la arquitectura

| ID | Decisión | Motivo |
|---|---|---|
| T-001 | TypeScript estricto en todo el proyecto | Obliga a declarar los tipos y evita errores silenciosos |
| T-002 | Zod para validar datos de formularios y de red | TypeScript no valida lo que llega en tiempo de ejecución |
| T-003 | El dominio no importa React ni Supabase | Permite probar la lógica sin móvil y sin red |
| T-004 | La sesión guarda una foto de la rutina | Editar una rutina no puede reescribir el historial |
| T-005 | Toda sesión tiene fila de participante desde el MVP | Evita migrar datos al implementar sesiones compartidas |
| T-006 | Identificadores UUID generados en el móvil | Permite guardar sin conexión y evita duplicados al reintentar |
| T-007 | Guardado local primero, sincronización después | Una serie no puede perderse por falta de cobertura |
| T-008 | Variables de entorno con prefijo `EXPO_PUBLIC_` solo para datos públicos | La protección real son las políticas RLS |
| T-009 | Estructura `app/` (rutas) + `src/` (lógica) | Expo Router exige las rutas en `app/`; el resto queda separado |

---

## Pendiente de aprobación (no decidido)

1. Comparación serie con serie frente a mejor serie cuando cambia el número de series.
2. Indicador agregado cuando hay métricas en direcciones opuestas.
3. Si "más tiempo" es mejora o empeoramiento según el ejercicio.
4. Catálogo de músculos.
5. Borrado de rutinas.
6. Método de recuperación de contraseña y verificación de correo (forma concreta).
7. Uso sin conexión de rutinas y ejercicios ya guardados (solo la sesión en curso está garantizada).
8. Todo lo listado en PROJECT.md §7.7 para sesiones compartidas.
