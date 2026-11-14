# WORKFLOW.md

## Reglas de funcionamiento (MVP · flujo individual)

**Estado:** aprobado.
**Qué contiene:** cómo se comporta la app en los momentos clave: iniciar, entrenar, guardar, recuperar, finalizar y comparar.
**Qué no contiene:** pantallas ni código. Son reglas; la interfaz solo las muestra.

---

## 1. Cómo empieza una sesión

Hay **dos únicas puertas de entrada**:

| Puerta | Qué se ve | Qué se puede iniciar |
|---|---|---|
| **Inicio** | Solo las rutinas planificadas para hoy | Una rutina de hoy |
| **Lista de rutinas** | Todas las rutinas activas | Cualquier rutina, esté o no planificada para hoy |

- El **calendario no inicia sesiones**. Es informativo.
- Si una rutina no está planificada para hoy y se entrena desde la lista, la sesión es válida y queda en el historial. En el calendario aparecerá como **entrada adicional del día**, con marca distinta de las planificadas.
- Al iniciar, la sesión copia dentro de sí la rutina: ejercicios, orden, objetivos por serie y datos visibles del ejercicio (nombre, músculo, icono). Es la "foto".

---

## 2. Estados de una sesión

```
   iniciar
      │
      ▼
 ┌──────────┐   finalizar   ┌────────────┐
 │ en_curso │ ────────────► │ finalizada │
 └──────────┘               └────────────┘
      │
      │ cancelar (con confirmación)
      ▼
 ┌───────────┐
 │ cancelada │
 └───────────┘
```

- `en_curso`: se puede registrar, saltar, omitir, consultar y recuperar tras cerrar la app.
- `finalizada`: pasa al historial con resumen. No se puede volver a editar.
- `cancelada`: descarta el entrenamiento. **No cuenta como completado** en el calendario.
- **Propuesta pendiente de aprobación:** permitir solo una sesión `en_curso` por usuario a la vez. Si se intenta abrir otra, la app ofrecería continuar la existente o cancelarla.

**Cancelar no es cerrar la app.** Cerrar la app no cambia el estado: la sesión sigue `en_curso` y se recupera al volver.

---

## 3. Estados de un ejercicio dentro de la sesión

| Estado | Significado | ¿Cuenta como pendiente? |
|---|---|---|
| `pendiente` | No empezado | Sí |
| `saltado` | Aparcado temporalmente | **Sí** (puede recuperarse) |
| `omitido` | Descartado definitivamente | No |
| `completado` | Todas sus series hechas | No |

Regla: **saltar no es omitir**. Saltar deja el ejercicio en la cola; omitir lo saca definitivamente.

---

## 4. Qué ejercicio toca a continuación

El motor aplica esta regla, en este orden:

1. Si hay un ejercicio `en_curso` con series pendientes, se continúa ese.
2. Si no, se elige el **primer ejercicio `pendiente` o `saltado` según el orden original** de la rutina.
3. Si no queda ninguno, la sesión puede finalizarse.

Ejemplo de PROJECT.md §6:

- Orden: Press banca → Aperturas → Fondos.
- Se salta Press banca y se hacen Aperturas.
- Al terminar Aperturas, la app propone **Press banca** (es el primero pendiente en el orden original).
- Al terminar Press banca, propone **Fondos**.

**Consecuencia:** el orden de la pantalla no es "el que llevas", sino "el primero que te falta".

---

## 5. Ciclo de una serie

```
pendiente ──completar──► completada
    │
    └──omitir──► omitida
```

- Al completar: se guardan los valores reales, la fecha y el identificador de operación.
- Solo se guardan las métricas configuradas en el objetivo (si un ejercicio solo tiene repeticiones, no se pide peso).
- Una serie omitida no cuenta como completada, pero queda registrada para el resumen.
- **Guardado inmediato:** el resultado se escribe en el móvil en el instante en que se confirma, antes de cualquier intento de red.

---

## 6. Temporizador de descanso

- Es un temporizador **de descanso**, independiente de los objetivos de tiempo de los ejercicios.
- Valor por defecto: 60 segundos. El valor elegido se recuerda entre sesiones.
- Estados: `detenido`, `corriendo`, `pausado`.
- Se guarda su estado y los segundos restantes. Si se cierra la app, al volver se restaura.
- Si el móvil estuvo apagado mientras corría, se recalcula por hora de finalización, no "a ciegas".

---

## 7. Recuperación tras un cierre inesperado

Al abrir la app, si existe una sesión `en_curso`:

1. Se avisa de que hay un entrenamiento sin terminar.
2. Se ofrece **continuar** (por defecto) o **cancelar** (con confirmación).
3. Al continuar se restauran: ejercicio actual, series registradas, ejercicios saltados y omitidos, temporizador y turno (en el MVP, el único participante).

Guardado local obligatorio de: inicio, ejercicio actual, participante actual, series, pendientes y temporizador.

---

## 8. Finalizar y cancelar

| Acción | Qué hace | ¿Pide confirmación? | ¿Va al historial? |
|---|---|---|---|
| **Finalizar** | Cierra la sesión y genera el resumen | Sí | Sí, como completada |
| **Cancelar** | Descarta la sesión | **Sí, siempre** | Sí, como cancelada |
| **Cerrar la app** | Nada | No | No; sigue en curso |

El resumen muestra: duración, ejercicios completados, ejercicios omitidos, series con sus resultados y comparación de rendimiento.

---

## 9. Historial

- Lista de sesiones finalizadas y canceladas, ordenadas de más reciente a más antigua.
- Una sesión pasada se puede abrir y consultar en detalle.
- El detalle se lee de la "foto" guardada: no cambia si después se edita la rutina o se archiva el ejercicio.
- Las sesiones canceladas se muestran diferenciadas y no cuentan como entrenamiento completado.

---

## 10. Comparación de rendimiento

**Base de comparación:** la **última sesión registrada del mismo ejercicio por el mismo participante**.

- Si no hay sesión anterior de ese ejercicio: no se muestra comparación.
- Se comparan las métricas que existan en ambas sesiones.
- Se compara serie con serie cuando el número de series coincide; si no coincide, se compara el mejor resultado de cada sesión. *(Regla concreta a confirmar antes de la fase 9.)*

**Tolerancia: 0 en todo** (sensible al 100 %).

| Métrica | Mejora | Empeoramiento | Similar |
|---|---|---|---|
| Peso | mayor | menor | igual |
| Repeticiones | mayor | menor | igual |
| Tiempo | mayor | menor | igual |

> Nota: más tiempo es mejor solo si el objetivo es de resistencia/duración. Se aplica la misma regla a las tres métricas hasta que se apruebe lo contrario (ver §13).

**Indicadores por métrica:**

| Nivel | Cuándo | Color |
|---|---|---|
| Peso mejorado | El peso sube, aunque otra métrica baje | Amarillo |
| Mejora | Suben repeticiones o tiempo | Verde |
| Igual | El valor es exactamente el mismo | Gris |
| Empeoramiento | Baja cualquier métrica | Rojo |

**Resumen por ejercicio:** cantidades por nivel, en orden fijo (amarillo, verde, gris, rojo). Sin puntuación, sin porcentaje y sin color dominante.

Ejemplo: `1 ●` amarillo · `1 ●` verde · `0 ●` gris · `1 ●` rojo.

- Subir peso es siempre amarillo, aunque también suban las repeticiones.
- Subir peso y bajar repeticiones da amarillo + rojo a la vez. Los niveles nunca se compensan.
- Solo se muestran los niveles que tengan al menos una métrica.
- Al desplegar el resumen se muestra cada métrica con sus valores (anterior → actual).

La lógica vive en `src/domain/performance/` y no en la interfaz.

---

## 11. Calendario

- Vistas semanal y mensual, con número de semana.
- Estados por rutina planificada:
  - **Verde:** completada.
  - **Azul:** pendiente futura o de hoy.
  - **Rojo:** pendiente pasada.
- Día con varias rutinas: indicador agregado.
- Sesiones de rutinas **no planificadas** ese día: entrada adicional, con marca propia y sin alterar el estado de las planificadas.
- Sesiones canceladas: no cuentan como completadas.
- El calendario **no inicia entrenamientos**.

---

## 12. Ejercicios archivados

- No aparecen en el listado general ni al elegir ejercicios para una rutina nueva.
- Siguen apareciendo y siendo entrenables dentro de las rutinas que ya los contienen, con la marca **archivado**.
- Se conservan en el historial y en el calendario.
- Existe una vista de **archivados** con la opción de recuperar; al recuperar, vuelven al listado general.

---

## 13. Invariantes (cosas que nunca deben ocurrir)

1. Una serie guardada nunca se pierde por falta de red.
2. Una operación nunca se duplica al reintentar.
3. Una sesión nunca tiene dos participantes con la misma posición (en el MVP, nunca más de uno).
4. Una serie nunca queda sin participante.
5. Editar una rutina nunca altera una sesión pasada.
6. Archivar un ejercicio nunca rompe una rutina ni un historial.
7. Una sincronización no se marca como hecha sin confirmación del servidor.
8. Ningún usuario puede leer ni escribir datos de otro.

---

## 14. Pendiente de aprobación

1. Comparación serie con serie vs mejor serie cuando el número de series cambia.
2. Significado de "tiempo": ¿más segundos es mejor o peor? Depende del tipo de ejercicio.
3. Si se permite más de una sesión en curso a la vez.
