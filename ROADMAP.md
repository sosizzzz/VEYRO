# ROADMAP.md

## Plan de desarrollo por fases

**Regla:** una fase cada vez. No se empieza la siguiente sin aprobar y probar la anterior.
**Estado global:** fase 0 pendiente de inicio. Nada implementado todavía.

| Estado | Significado |
|---|---|
| Pendiente | No empezada |
| En curso | Se está trabajando |
| Hecho | Probada y aprobada |

---

## Fase 0 · Base del proyecto

**Objetivo:** que la app arranque en blanco, ordenada y con reglas de calidad activas.

**Entregables**

- Proyecto Expo + Expo Router creado y funcionando en Expo Go.
- TypeScript en modo estricto (sin `any` implícitos).
- Estructura de carpetas de ARCHITECTURE.md creada (vacíos permitidos).
- Tema base: colores, espaciados y tipografía centralizados.
- Formateador y linter configurados.
- Ejecutor de tests configurado y un test de ejemplo.
- `.env.example` con las variables necesarias (sin valores reales).
- Repositorio Git inicializado y primer commit.

**Cómo se prueba:** `npm start` abre la app en el móvil; `npm test` pasa; `npx tsc --noEmit` sin errores.

**Riesgos:** elegir versiones incompatibles entre Expo y React Native. Se fija una versión estable y no se actualiza a mitad del MVP.

---

## Fase 1 · Acceso y perfil

**Objetivo:** entrar en la app con correo y contraseña y ver tu nombre.

**Entregables**

- Registro, inicio y cierre de sesión.
- Pantalla de verificación de correo y recuperación de contraseña.
- Tabla `profiles` y creación automática del perfil al registrarse.
- RLS activo.
- Ruta protegida: sin sesión, solo se ven las pantallas de acceso.

**Cómo se prueba:** registro real con un correo, verificación, cierre, reintento con contraseña incorrecta y recuperación.

**Riesgos:** RLS mal configurado deja datos expuestos o bloquea al propio usuario. Se prueba con dos cuentas distintas.

---

## Fase 2 · Ejercicios

**Objetivo:** gestionar tu biblioteca de ejercicios.

**Entregables**

- Listado con icono, nombre, músculo y acceso a edición.
- Creación con botón flotante `+`.
- Edición.
- Archivado con confirmación.
- Vista de archivados con opción de recuperar.
- Primera migración SQL de `profiles` y `exercises` aplicada en Supabase.
- Repositorio de ejercicios contra Supabase.

**Cómo se prueba:** crear, editar, archivar, comprobar que desaparece del listado, recuperarlo desde archivados y verificar que reaparece.

**Riesgos:** el catálogo de músculos no está definido (ver DECISIONS.md). **Bloquea el inicio de esta fase.**

---

## Fase 3 · Rutinas

**Objetivo:** diseñar rutinas completas.

**Entregables**

- Listado con nombre, descripción, número de ejercicios y días.
- Creación paso a paso: nombre, descripción, selección de ejercicios (incluida creación rápida), objetivos por ejercicio y por serie, reordenación y días de la semana.
- Edición sin alterar sesiones históricas.

**Cómo se prueba:** crear una rutina de 3 ejercicios con 3 series cada uno, reordenar, cambiar objetivos y comprobar que se guarda todo.

**Riesgos:** la pantalla de creación acumula mucha lógica. Se separa en componentes pequeños y validaciones con Zod.

---

## Fase 4 · Datos y seguridad

**Objetivo:** que todo lo anterior sea seguro y esté bien modelado en la base de datos.

**Entregables**

- Migraciones completas (rutinas, días, objetivos).
- RLS y políticas de todas las tablas.
- Índices previstos en DATABASE.md.
- Revisión de errores y mensajes de fallo.
- Aislamiento comprobado entre usuarios.

**Cómo se prueba:** dos cuentas. Ninguna ve ni puede modificar ejercicios o rutinas de la otra, ni siquiera llamando directamente a la API.

**Riesgos:** es la fase con más superficie de seguridad. Se revisa política por política y se prueba el acceso directo, no solo desde la interfaz.

---

## Fase 5 · Motor de sesión (sin pantalla)

**Objetivo:** que el cerebro del entrenamiento funcione y esté probado.

**Entregables**

- `domain/workout-engine`: estados, eventos y transiciones de WORKFLOW.md.
- Regla del siguiente ejercicio (primero pendiente en orden original).
- Saltar frente a omitir.
- Temporizador como parte del estado.
- Tests de todos los casos: sesión normal, saltos, omisiones, recuperación, finalización.

**Cómo se prueba:** suite de tests. Sin esta fase en verde no se construye la pantalla de entrenamiento.

**Riesgos:** querer "arreglar" el motor desde la interfaz. La pantalla nunca decide; solo muestra.

---

## Fase 6 · Pantalla de entrenamiento

**Objetivo:** entrenar de verdad con el móvil en la mano.

**Entregables**

- Inicio de sesión desde el inicio y desde la lista de rutinas.
- Registro de series con pocos toques.
- Visualización de objetivos configurados.
- Saltar y omitir.
- Temporizador de descanso.
- Guardado local inmediato.
- Recuperación al reabrir la app.
- Cancelar con confirmación.

**Cómo se prueba:** entrenamiento completo en el móvil; cerrar la app a mitad y recuperar; cancelar y comprobar que pide confirmación.

**Riesgos:** que la interfaz se vuelva lenta. El motor trabaja en memoria y solo se guarda al confirmar operaciones.

---

## Fase 7 · Sincronización y resiliencia

**Objetivo:** que no se pierda nada y no se duplique nada.

**Entregables**

- Cola local de operaciones con identificadores únicos.
- Sincronización al recuperar conexión y al abrir la app.
- Reintentos con control de errores.
- Estado visible: pendiente de sincronizar o sincronizado.
- Pruebas en modo avión.

**Cómo se prueba:** modo avión, registrar varias series, cerrar la app, activar red, abrir: todo aparece una sola vez en Supabase.

**Riesgos:** la fase más delicada del MVP. No se da por buena sin pruebas de duplicados y de cortes a mitad.

---

## Fase 8 · Finalización e historial

**Objetivo:** cerrar el ciclo del entrenamiento.

**Entregables**

- Pantalla de resumen: duración, completados, omitidos, series.
- Historial de sesiones.
- Detalle de sesión pasada desde la foto guardada.
- Sesiones canceladas diferenciadas.

**Cómo se prueba:** finalizar una sesión, verla en el historial y comprobar que editar la rutina después no cambia el detalle.

---

## Fase 9 · Comparación de rendimiento

**Objetivo:** saber si mejoras.

**Entregables**

- `domain/performance` con tolerancia 0.
- Comparación contra la última sesión del mismo ejercicio.
- Clasificación por niveles: amarillo (peso mejorado), verde, gris, rojo.
- Resumen por cantidades con puntos de color y detalle por métrica.
- Tests de los cuatro niveles y del caso peso arriba / repeticiones abajo.

**Cómo se prueba:** repetir un ejercicio subiendo peso, subiendo solo repeticiones, dejando todo igual y bajando algo. Deben aparecer los cuatro colores y las cantidades correctas.

**Riesgos:** queda pendiente cómo comparar cuando cambia el número de series. **Bloquea el inicio de esta fase.**

---

## Fase 10 · Inicio y calendario

**Objetivo:** ver qué toca hoy y cómo va la semana.

**Entregables**

- Saludo según la hora y el nombre.
- Rutinas de hoy con despliegue de ejercicios, objetivos e inicio directo.
- Sugerencia de crear rutina si no hay ninguna.
- Calendario semanal y mensual con número de semana.
- Colores verde, azul y rojo.
- Entradas adicionales para sesiones no planificadas.
- Indicador agregado en días con varias rutinas.

**Cómo se prueba:** una semana con rutina completada, pendiente futura, pendiente pasada y una sesión extra.

---

## Fase 11 · Pulido y pruebas en dispositivo

**Objetivo:** que la app se sienta terminada.

**Entregables**

- Revisión visual completa según el diseño aprobado.
- Accesibilidad: tamaños táctiles, contraste, textos legibles.
- Rendimiento en un móvil real.
- Repaso de textos y mensajes de error.
- Prueba de extremo a extremo: registro → rutina → entrenamiento → historial.

**Riesgos:** el diseño visual definitivo sigue pendiente (PROJECT.md §13). **Bloquea esta fase.**

---

## Después del MVP (no aprobado)

- Sesiones compartidas: invitaciones, amistades, turnos, ejercicios personalizados compartidos.
- Resolución de las preguntas de PROJECT.md §7.7.
- Eliminación permanente de ejercicios, si se aprueba.

---

## Orden y dependencias

```
0 ──► 1 ──► 2 ──► 3 ──► 4 ──► 5 ──► 6 ──► 7 ──► 8 ──► 9 ──► 10 ──► 11
                    │           │
                    └─ datos ───┘
```

- 2 y 3 necesitan 1 (hay que tener usuario).
- 6 necesita 5 (no se pinta un motor que no existe).
- 7 necesita 6 (no se sincroniza lo que no se guarda).
- 8, 9 y 10 necesitan 7 (leen datos ya sincronizados).
- 11 va al final y depende del diseño visual.
