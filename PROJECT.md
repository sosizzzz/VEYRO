# PROJECT.md

# Aplicación móvil de seguimiento de entrenamientos

**Versión:** 0.3
**Estado:** Definición funcional en desarrollo
**Metodología:** Desarrollo incremental, modular y supervisado.

---

## Cómo leer este documento

Este documento describe **qué** debe hacer la aplicación. No describe todavía cómo se construye: la arquitectura, el modelo de datos y el plan por fases se proponen y se aprueban más adelante (ver sección 18).

Cada funcionalidad tiene un estado de alcance:

| Etiqueta | Significado |
|---|---|
| **MVP** | Se implementa en la primera versión (flujo individual). |
| **Definido, posterior al MVP** | La especificación está aprobada, pero se implementa en una fase posterior. |
| **Pendiente de aprobación** | Hay una pregunta abierta. No debe darse por decidida. |

Definir una funcionalidad no significa que esté implementada.

---

# 1. Visión del proyecto

Desarrollar una aplicación móvil para gestionar y registrar entrenamientos físicos.

La aplicación permitirá crear ejercicios, diseñar rutinas, planificar entrenamientos, registrar resultados y consultar la evolución del rendimiento.

Su característica principal será permitir entrenar individualmente o compartir una misma sesión con otras personas, manteniendo siempre el progreso individual de cada participante.

La aplicación debe sustituir el registro manual mediante papel o notas del móvil.

## 1.1. Modalidades de entrenamiento

- Individual.
- Pareja.
- Grupo.

En los entrenamientos compartidos, todos los participantes pueden realizar una misma rutina, pero cada uno tiene sus propios objetivos y resultados.

## 1.2. Alcance por fases

- **Primero se desarrolla el flujo individual (MVP).** El modelo de datos se prepara desde el principio para admitir varios participantes.
- **Las sesiones compartidas se implementan después**, en fases independientes y verificables: invitaciones, amistades, incorporación de ejercicios personalizados y alternancia de participantes.
- La primera versión de sesión compartida utilizará **un único dispositivo como controlador** de la sesión. No se requiere comunicación en tiempo real entre varios dispositivos.
- Los resultados deben poder asociarse a las cuentas individuales de los participantes mediante Supabase.
- La arquitectura debe permitir ampliar esta funcionalidad posteriormente.

---

# 2. Stack tecnológico

## Principal

- TypeScript.
- React Native.
- Expo.
- Expo Router.
- Supabase.
- PostgreSQL.
- Expo EAS.

## Herramientas

- IntelliJ IDEA.
- OpenCode.
- Node.js.
- npm.
- Git.
- Expo Go.

## Requisitos técnicos

- TypeScript estricto.
- Componentes reutilizables.
- Arquitectura modular.
- Separación entre interfaz y lógica de negocio.
- Gestión centralizada de datos.
- Variables de entorno.
- Políticas RLS en Supabase.
- Persistencia local de sesiones en curso.

---

# 3. Modelo conceptual

La aplicación debe separar cinco conceptos.

## 3.1. Ejercicio

Plantilla reutilizable que contiene:

- Identificador.
- Nombre.
- Descripción.
- Icono.
- Músculo principal.
- Fecha de creación.

No contiene objetivos personales de entrenamiento.

## 3.2. Rutina

Plantilla compuesta por ejercicios ordenados.

Contiene:

- Nombre.
- Descripción.
- Ejercicios.
- Orden.
- Días de planificación.

Cada ejercicio dentro de una rutina dispone de una configuración específica.

La configuración puede incluir objetivos individuales para cada serie:

- Repeticiones.
- Peso.
- Tiempo.

Los campos son independientes y opcionales.

## 3.3. Configuración personal de rutina

Representa los objetivos particulares de una persona para una rutina.

En entrenamientos compartidos, dos participantes pueden utilizar la misma estructura de rutina, pero tener objetivos diferentes.

Modificar la configuración personal de un participante no debe afectar a otros.

## 3.4. Sesión

Representa la ejecución real de una rutina.

Puede ser:

- Individual.
- Compartida por dos personas.
- Compartida por varias personas.

Una sesión compartida tiene un dispositivo controlador y varios participantes.

Cada participante mantiene su propio progreso.

## 3.5. Registro de series

Cada serie debe guardar los resultados reales de un participante.

Según los campos configurados:

- Peso utilizado.
- Repeticiones realizadas.
- Tiempo realizado.

Los resultados siempre deben estar asociados a la persona que realizó la serie.

---

# 4. Gestión de ejercicios · MVP

## Listado

Mostrar todos los ejercicios creados.

Cada elemento incluye:

- Icono.
- Nombre.
- Músculo principal.
- Acceso a configuración.

## Creación

Botón flotante `+` en la parte inferior derecha.

Campos:

- Nombre.
- Descripción breve.
- Músculo principal.
- Icono.

## Edición

Permitir modificar los campos del ejercicio.

## Eliminación

Solicitar confirmación.

En el MVP un ejercicio no se borra de forma definitiva: se **archiva**.

- Desaparece del listado general de ejercicios.
- Se conserva en las rutinas que ya lo contienen y en el historial y el calendario.
- Dentro de una rutina se muestra con la marca **archivado** y sigue siendo entrenable.
- Existe una vista específica de **ejercicios archivados**, desde la que se puede recuperar uno. Al recuperarlo vuelve al listado general.

La eliminación permanente de un ejercicio no se contempla en el MVP.

---

# 5. Gestión de rutinas · MVP

## Listado

Mostrar todas las rutinas disponibles.

Cada rutina incluye:

- Nombre.
- Descripción.
- Número de ejercicios.
- Días asignados.

## Creación

Permitir:

1. Introducir nombre.
2. Introducir descripción.
3. Seleccionar ejercicios existentes.
4. Crear nuevos ejercicios desde el mismo proceso.
5. Configurar los objetivos de cada ejercicio.
6. Configurar individualmente cada serie.
7. Reordenar ejercicios.
8. Asignar días de la semana.

## Objetivos

Cada serie puede disponer de:

- Peso objetivo.
- Repeticiones objetivo.
- Tiempo objetivo.

Mostrar únicamente los campos configurados.

Los objetivos pueden variar entre participantes.

## Edición

Permitir modificar la rutina sin alterar las sesiones históricas.

---

# 6. Ejecución de entrenamientos · MVP (flujo individual)

## Inicio individual

Crear una sesión nueva y mostrar el primer ejercicio según el orden de la rutina.

## Registro de series

Mostrar el objetivo correspondiente a la persona que está entrenando.

Al terminar una serie, registrar los valores reales.

Después de confirmar, guardar automáticamente el resultado.

Cada serie debe quedar asociada al participante correcto.

## Gestión de ejercicios durante la sesión

Permitir:

- Completar una serie.
- Saltar temporalmente un ejercicio.
- Omitir definitivamente un ejercicio.

No implementar sustituciones de ejercicios en la primera versión.

Los ejercicios saltados deben permanecer pendientes y poder recuperarse posteriormente.

## Orden dinámico

Ejemplo:

Orden inicial:

1. Press banca.
2. Aperturas.
3. Fondos.

Si el usuario salta Press banca y realiza Aperturas:

- Al terminar Aperturas, recomendar Press banca.
- Al terminar Press banca, recomendar Fondos.

La lógica debe priorizar ejercicios pendientes antes de finalizar.

## Temporizador

Incorporar un temporizador de descanso configurable.

- Valor inicial recomendado: 60 segundos.
- Configuración persistente.
- Posibilidad de modificarlo.
- En modo compartido, representación compacta.

El temporizador de descanso es independiente de los objetivos de tiempo de los ejercicios.

## Cancelación y recuperación

Guardar automáticamente el estado de la sesión.

Persistir:

- Inicio.
- Ejercicio actual.
- Participante actual.
- Series registradas.
- Ejercicios pendientes.
- Temporizador y estado de pausa cuando corresponda.

La aplicación debe poder recuperar una sesión después de un cierre inesperado.

La cancelación explícita debe ser una acción independiente y **requiere confirmación** antes de ejecutarse. Cancelar no es lo mismo que finalizar: una sesión cancelada no se contabiliza como entrenamiento completado.

No confundir cerrar la aplicación con cancelar el entrenamiento.

---

# 7. Sesiones compartidas · Definido, posterior al MVP

Esta sección recoge decisiones aprobadas (ver Anexo A). Define el comportamiento objetivo, pero **no debe implementarse en el MVP**. Sí debe tenerse en cuenta desde el principio en el diseño del modelo de datos.

## 7.1. Inicio de una sesión compartida

El usuario controlador selecciona a los participantes.

Cada participante debe tener una cuenta vinculable a sus registros individuales.

La sesión comparte:

- Rutina.
- Orden general de ejercicios.
- Estado de ejecución.

Cada participante mantiene:

- Configuración personal.
- Objetivos.
- Resultados.
- Historial.

## 7.2. Aceptar una rutina compartida (SH-001)

Cuando un usuario acepta unirse a una rutina compartida por otra persona:

- Se crea una **copia de la rutina en su biblioteca personal**.
- La copia puede reutilizarse posteriormente como cualquier otra rutina propia.
- La copia **no mantiene una dependencia editable** con la rutina original.
- Los cambios posteriores del propietario original no modifican las copias existentes.
- La copia conserva la estructura de ejercicios, el orden y la organización de la rutina.
- **Los objetivos no se copian** desde la configuración del anfitrión: cada usuario configura sus propios objetivos por ejercicio y por serie.
- La copia mantiene una **referencia de procedencia** para poder identificar de qué rutina compartida procede. Esa referencia no implica sincronización automática con la original.

## 7.3. Ejercicios personalizados compartidos (SH-003)

Se permite compartir rutinas que contengan ejercicios personalizados.

Cuando un participante recibe un ejercicio que todavía no existe en su biblioteca:

1. Se muestra la información del ejercicio compartido.
2. Se solicita confirmación para incorporarlo a su biblioteca personal.
3. Si acepta, se crea una copia personal del ejercicio.
4. Si rechaza, el ejercicio sigue disponible como referencia dentro de esa rutina compartida, pero no se incorpora a su biblioteca personal.

Además:

- La decisión de incorporar o no el ejercicio **no impide** que el participante configure sus objetivos personales para usarlo en la sesión.
- Los ejercicios incorporados mantienen una referencia de procedencia, sin quedar vinculados de forma editable al original.
- Si el ejercicio ya existe en la biblioteca del participante, debe evitarse crear duplicados automáticamente. *(La forma de identificar equivalencias está pendiente: ver 7.7.)*
- La incorporación es siempre una **operación explícita del usuario**. La interfaz no debe hacerla de forma silenciosa.

## 7.4. Alternancia de participantes (SH-002)

La ejecución compartida utiliza **turnos alternos por serie**.

Ejemplo con tres participantes:

1. Participante A completa su serie.
2. Participante B completa su serie.
3. Participante C completa su serie.
4. Se vuelve a A y comienza la siguiente ronda.

Reglas:

- El orden de participantes se establece al iniciar la sesión y se mantiene durante su ejecución.
- Cada participante conserva sus propios objetivos y resultados. Compartir el ejercicio y la estructura de series no implica compartir pesos, repeticiones ni tiempos.
- El sistema debe distinguir entre:
  - Serie pendiente.
  - Serie completada.
  - Serie omitida.
  - Participante que tiene el turno actual.
- Los turnos deben poder recuperarse después de cerrar accidentalmente la aplicación.

## 7.5. Reglas de independencia de datos

- La rutina original pertenece a su propietario.
- Cada participante tiene su propia copia de la rutina.
- Cada participante configura sus propios objetivos.
- Cada participante tiene sus propios resultados.
- Los resultados de una sesión compartida se asocian a la cuenta del participante correspondiente.
- Ningún participante puede modificar los objetivos o resultados de otro mediante permisos ordinarios.
- La sesión compartida conserva la estructura común utilizada durante su ejecución.
- Los cambios posteriores en las rutinas personales no modifican sesiones históricas.

## 7.6. Resultados al finalizar

En sesiones compartidas, se generan resultados individuales para cada participante. Cada usuario los consulta en su propio historial (ver sección 8).

## 7.7. Cuestiones pendientes de aprobación

No deben darse por decididas sin una aprobación posterior:

- Qué ocurre con el turno de un participante que abandona o se desconecta durante una sesión.
- Cómo se gestionan los participantes que omiten una serie.
- Si el anfitrión puede modificar el orden de participantes durante la sesión.
- Cómo se identifican ejercicios equivalentes para evitar duplicados.
- Qué sucede si un participante rechaza incorporar un ejercicio personalizado y posteriormente quiere guardarlo.
- Cómo se resuelven los conflictos de sincronización si dos dispositivos intentan modificar a la vez el estado de una sesión.

---

# 8. Finalización e historial · MVP

Al finalizar una sesión, mostrar:

- Duración.
- Ejercicios completados.
- Ejercicios omitidos.
- Resultados de las series.
- Comparación de rendimiento.

El historial permite abrir una sesión y consultar sus ejercicios y series detalladamente.

Cada usuario debe poder consultar sus entrenamientos en su propio historial.

---

# 9. Comparación de rendimiento · MVP

Comparar cada ejercicio con registros anteriores del mismo ejercicio y del mismo participante.

Tener en cuenta todas las métricas aplicables:

- Repeticiones.
- Peso.
- Tiempo.

## Base de comparación (aprobada)

Cada ejercicio se compara con la **última sesión registrada del mismo ejercicio por el mismo participante**. Si no existe una sesión anterior, no se muestra comparación.

## Tolerancias (aprobadas)

La comparación es **sensible al 100 %**: no hay margen de tolerancia en ninguna métrica.

- Peso: cualquier diferencia cuenta como mejora o empeoramiento.
- Repeticiones: cualquier diferencia cuenta como mejora o empeoramiento.
- Tiempo: cualquier diferencia cuenta como mejora o empeoramiento.

Con tolerancia 0, un resultado solo es "similar" cuando el valor es exactamente igual.

## Niveles de comparación (aprobados)

Cada métrica se clasifica en uno de cuatro niveles. **El peso tiene un nivel propio, por encima de la mejora normal:**

| Nivel | Cuándo | Color |
|---|---|---|
| Peso mejorado | El peso sube, aunque otras métricas bajen | Amarillo |
| Mejora | Suben las repeticiones o el tiempo | Verde |
| Igual | El valor es exactamente el mismo | Gris |
| Empeoramiento | Baja cualquier métrica | Rojo |

Reglas:

- Si sube el peso, esa métrica se marca **amarillo siempre**. Aunque también suban las repeticiones, el peso no se cuenta como verde: es un nivel superior.
- Si sube el peso y bajan las repeticiones, el resumen muestra un amarillo y un rojo. Los niveles no se compensan entre sí.
- Cada métrica cuenta por separado. No hay suma, resta ni nota final.

## Resumen visual (aprobado)

No se muestra un valor único que lo resuma todo: ni puntuación, ni porcentaje, ni color dominante.

Se muestran **cantidades con su punto de color**, en orden fijo: amarillo, verde, gris y rojo. Solo aparecen los niveles que tengan al menos una métrica.

Ejemplo con 3 métricas:

> `1 ●` amarillo · `1 ●` verde · `0 ●` gris · `1 ●` rojo

Significa: subió el peso, mejoró una métrica de repeticiones o tiempo, ninguna se quedó igual y una empeoró.

Al desplegar el resumen se muestra el detalle: qué métrica está en cada nivel y sus valores (anterior → actual).

La lógica de comparación debe estar separada de la interfaz.

---

# 10. Pantalla principal · MVP

## Saludo

Buenos días, tardes o noches, acompañado del nombre del usuario.

## Rutinas del día

Mostrar las rutinas programadas para la fecha actual.

Si no hay rutinas creadas, sugerir la creación de una.

Cada rutina debe permitir:

- Visualización resumida.
- Despliegue de ejercicios.
- Consulta de objetivos.
- Inicio directo del entrenamiento.

Solo aparecen aquí las rutinas planificadas para hoy. Las rutinas no programadas para hoy no se muestran en el inicio: se inician desde la lista de rutinas (ver sección 5).

El calendario no inicia entrenamientos.

---

# 11. Navegación · MVP

Menú inferior con tres apartados:

- Izquierda: calendario.
- Centro: inicio.
- Derecha: gestión de rutinas y ejercicios.

La sección de gestión muestra dos accesos principales:

- Rutinas.
- Ejercicios.

---

# 12. Calendario · MVP

Permitir:

- Vista semanal.
- Vista mensual.
- Número de semana.

Cada rutina programada tendrá un estado individual:

- Verde: completada.
- Azul: pendiente futura o actual.
- Rojo: pendiente pasada.

Los días con múltiples rutinas deben mostrar un indicador agregado de sus estados.

El calendario debe obtener sus estados de la planificación y de las sesiones reales.

El calendario es informativo: **no inicia entrenamientos**.

Las sesiones de rutinas no planificadas para el día también aparecen en el calendario como una entrada adicional del día, visualmente diferenciada de las rutinas planificadas.

---

# 13. Diseño y experiencia de usuario

Interfaz moderna, minimalista y consistente.

Priorizar:

- Pocos toques para registrar series.
- Acciones claramente diferenciadas.
- Buena legibilidad.
- Controles accesibles durante el entrenamiento.
- Información individual claramente identificada en sesiones compartidas.

**Pendiente de aprobación:** el diseño visual definitivo se definirá y aprobará por separado.

---

# 14. Arquitectura (requisitos)

Organizar el proyecto por dominios:

- Authentication.
- Users.
- Exercises.
- Routines.
- Workouts.
- Calendar.
- Dashboard.
- History.
- Shared Sessions.

Separar:

- Interfaz.
- Componentes.
- Tipos.
- Servicios.
- Repositorios.
- Lógica de negocio.
- Validaciones.

Reglas generales:

- La ejecución de entrenamientos debe disponer de un **motor de estados independiente**.
- La gestión de sesiones compartidas debe estar separada de la gestión de resultados individuales.
- No mezclar consultas a Supabase con componentes visuales.

## 14.1. Requisitos para sesiones compartidas

- **Plantilla compartida y datos personales separados.** La rutina compartida es una estructura de referencia. Cada participante tiene su copia personal y su configuración individual. Los objetivos personales no deben depender de los del anfitrión.
- **Entidades mínimas de la sesión compartida:**
  - Una entidad de sesión compartida.
  - Una colección ordenada de participantes.
  - Un identificador del participante al que corresponde cada resultado.
  - Un estado de turno actual.
  - Un mecanismo para determinar el siguiente participante.
  - El estado individual de las series de cada participante.
- **La lógica de alternancia** reside en una capa de dominio independiente de React Native y de la interfaz.
- **La incorporación de ejercicios personalizados** es una operación explícita del usuario, con copia personal independiente del original.

---

# 15. Datos, persistencia y sincronización

## 15.1. Principios generales · MVP

Supabase y PostgreSQL serán la fuente de persistencia remota.

La aplicación debe disponer de almacenamiento local para las sesiones en curso.

Los resultados deben guardarse localmente inmediatamente después de cada operación relevante y sincronizarse después con Supabase.

La sincronización debe contemplar:

- Identidad del participante.
- Sesión compartida.
- Identificadores únicos de operaciones.
- Prevención de registros duplicados.
- Recuperación de errores de sincronización.
- Integridad de los datos.

No considerar completada una sincronización hasta confirmar que los datos remotos se han guardado correctamente.

## 15.2. Requisitos adicionales para sesiones compartidas

La ejecución compartida mantiene el enfoque local-first:

- Guardar localmente cada operación relevante.
- Persistir el turno actual y el estado de las series.
- Sincronizar operaciones con Supabase cuando haya conexión.
- Usar identificadores idempotentes para evitar duplicados.
- Reintentar operaciones pendientes al recuperar la conexión o al abrir la aplicación.
- No considerar una operación sincronizada hasta recibir confirmación del servidor.

## 15.3. Modelo de datos: relaciones que debe poder representar

El modelo debe poder representar:

- Rutina original y sus copias personales.
- Ejercicio original y sus copias personales.
- Sesión compartida y sus participantes.
- Configuración individual de cada participante.
- Resultados individuales por serie.
- Turno actual de la sesión.

Se recomienda contemplar campos de procedencia:

- `source_routine_id`: rutina de la que procede una copia.
- `source_exercise_id`: ejercicio del que procede una copia.

Son referencias de procedencia, **no** relaciones de sincronización editable.

Las tablas de participantes y resultados deben permitir asociar cada registro a su propietario real.

La estructura concreta de tablas, claves foráneas, restricciones e índices se diseña y se aprueba **antes** de crear las migraciones.

---

# 16. Seguridad y autorización

- Activar políticas RLS en Supabase.
- Las políticas deben impedir que un usuario lea o modifique datos personales ajenos, salvo los permisos expresamente concedidos por una sesión compartida.
- La autorización para registrar resultados en nombre de otros participantes se valida **en el servidor**.
- Pertenecer a una sesión compartida no debe permitir escrituras arbitrarias sobre cualquier cuenta.
- No se debe confiar en el `user_id` enviado por el cliente como única garantía de autorización.

---

# 17. Metodología de desarrollo

El desarrollo es incremental. No se implementa toda la aplicación mediante un único prompt.

Antes de implementar:

1. Analizar los requisitos.
2. Revisar el código existente.
3. Identificar módulos afectados.
4. Proponer una solución.
5. Identificar riesgos.
6. Solicitar aprobación cuando existan decisiones importantes pendientes.

Durante el desarrollo:

1. Trabajar en tareas pequeñas.
2. Mantener el alcance limitado.
3. Probar cada funcionalidad.
4. Documentar cambios.
5. Mantener Git actualizado.

No realizar reescrituras generales por cambios pequeños.

Tampoco introducir parches superficiales que deterioren la arquitectura.

---

# 18. Documentación del proyecto

## Documentos actuales

- **PROJECT.md** (este archivo): visión y requisitos funcionales.
- **AGENTS.md**: reglas de trabajo para OpenCode.

## Documentos que se crearán después

Se crean cuando existan propuestas aprobadas, no antes:

- **ARCHITECTURE.md**: arquitectura y responsabilidades.
- **DATABASE.md**: esquema de datos y relaciones.
- **WORKFLOW.md**: ejecución de entrenamientos y reglas de negocio.
- **DECISIONS.md**: decisiones aprobadas y sus justificaciones.
- **ROADMAP.md**: fases, tareas y progreso.

Los documentos deben reflejar el estado real del proyecto.

No se documentan como decididas cuestiones que todavía no han sido aprobadas.

No se marca ninguna tarea como implementada por el mero hecho de haber aprobado su especificación.

---

# 19. Estado del proyecto

La especificación funcional del **flujo individual (MVP)** está aprobada.

La propuesta requerida por esta sección (análisis de requisitos, ambigüedades, arquitectura, modelo de datos, flujo de sesión, estructura de carpetas y plan por fases) está elaborada, aprobada y documentada en:

- **ARCHITECTURE.md**: capas, responsabilidades y estructura de carpetas.
- **DATABASE.md**: entidades, campos, relaciones y reglas de seguridad.
- **WORKFLOW.md**: reglas de ejecución, sincronización, comparación y calendario.
- **DECISIONS.md**: decisiones aprobadas con su justificación.
- **ROADMAP.md**: fases, entregables y criterios de aceptación.

**Estado actual:** fase 0 pendiente de inicio.

Reglas de avance:

- La implementación avanza una fase cada vez, siguiendo ROADMAP.md.
- Ninguna fase se da por terminada sin probarla.
- No se empieza una fase sin aprobación de la anterior.
- Las sesiones compartidas siguen fuera de alcance hasta que se apruebe esa fase.
- El modelo de datos se mantiene preparado para varios participantes.

---

# Anexo A. Decisiones aprobadas

| ID | Decisión | Estado |
|---|---|---|
| SH-001 | Al aceptar una rutina compartida se crea una copia personal reutilizable. | Aprobada |
| SH-002 | Los participantes alternan automáticamente por serie. | Aprobada |
| SH-003 | Los ejercicios personalizados se pueden compartir, pero requieren confirmación para incorporarse a la biblioteca. | Aprobada |
| IN-001 | El acceso se realiza con correo electrónico y contraseña. | Aprobada |
| IN-002 | Los ejercicios se archivan: desaparecen del listado general, siguen disponibles en rutinas e historial y pueden recuperarse desde una vista de archivados. | Aprobada |
| IN-003 | La comparación de rendimiento se hace contra la última sesión del mismo ejercicio del mismo participante, con tolerancia 0 en peso, repeticiones y tiempo. | Aprobada |
| IN-004 | Las sesiones se inician solo desde el inicio (rutina de hoy) o desde la lista de rutinas. El calendario no inicia sesiones. | Aprobada |
| IN-005 | Las sesiones de rutinas no planificadas para el día aparecen en el calendario como entrada adicional diferenciada. | Aprobada |
| IN-006 | Cancelar una sesión en curso requiere confirmación explícita. | Aprobada |
| IN-009 | El resumen de comparación muestra cantidades por nivel (amarillo, verde, gris, rojo), sin valor único. El peso mejorado se marca amarillo. | Aprobada |
| PR-001 | Todo el código se comenta en lenguaje sencillo y cada entrega incluye explicación de archivos y pruebas. | Aprobada |
| AR-001 | Arquitectura de cinco capas, estructura `app/` + `src/` y desarrollo por fases verificables. | Aprobada |

**Justificaciones**

- **SH-001:** evita dependencias inesperadas entre bibliotecas personales y permite reutilizar rutinas sin alterar la original.
- **SH-002:** mantiene una ejecución coordinada y evita que un participante complete todas sus series antes de que intervengan los demás.
- **SH-003:** permite compartir rutinas completas sin obligar a los participantes a incorporar ejercicios que no desean conservar.
- **IN-001:** es el método más predecible en Expo Go y no depende de enlaces profundos ni de la entrega de correos para iniciar sesión.
- **IN-002:** archivar conserva la integridad del historial sin obligar al usuario a conservar ejercicios que ya no usa.
- **IN-003:** comparar contra la última sesión del mismo ejercicio es comprensible para el usuario y no mezcla progresos de momentos distintos; la tolerancia 0 evita que una mejora real se oculte.
- **IN-004:** el inicio responde a "qué toca hoy" y la lista de rutinas responde a "qué quiero entrenar"; separar ambas evita ambigüedad.
- **IN-005:** un entrenamiento real no debe desaparecer del calendario solo porque no estaba planificado.
- **IN-006:** cancelar descarta una sesión en curso y no debe ocurrir por un toque accidental.
- **IN-009:** un color dominante mentiría: bajar repeticiones no se compensa con subir peso. Mostrar cantidades por nivel informa sin ocultar nada, y el amarillo reconoce que subir peso es un salto de nivel distinto.
- **PR-001:** el objetivo del proyecto incluye comprender el código, no solo que funcione.
- **AR-001:** permite probar la lógica sin móvil, cambiar la base de datos sin tocar pantallas y aprender por partes.

Estas decisiones están desarrolladas y justificadas en DECISIONS.md.
