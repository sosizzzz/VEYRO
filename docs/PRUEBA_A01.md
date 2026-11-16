# Prueba A-01 · Aislamiento entre dos cuentas (RLS)

**Objetivo:** comprobar que un usuario **no puede ver** los ejercicios, rutinas ni sesiones de otro usuario.

La buena noticia: **no hacen falta dos móviles**. Con uno basta con entrar con la cuenta A, crear datos, cerrar sesión y entrar con la cuenta B. Si B no ve nada de A (y A no ve nada de B), el aislamiento funciona.

> Importante: las consultas hechas en el **SQL Editor de Supabase** se ejecutan como administrador y pueden saltarse RLS. Para probar de verdad hay que usar la app (o simular el usuario, como se explica al final).

---

## 1. Preparar la segunda cuenta

Tienes tres opciones, de más fácil a más controlada:

| Opción | Cómo | Cuándo usarla |
|---|---|---|
| **Alias de Gmail** | Crea la cuenta B con `adrian.skorski.garcia+veyro.prueba@gmail.com`. Gmail ignora el `+` y te llega el correo al mismo buzón. | Si el registro está abierto en Supabase. |
| **Otro correo real** | Cualquier correo que tengas (puede ser de prueba). | Si el alias no funciona. |
| **Panel de Supabase** | *Authentication → Users → Add user*, email + contraseña, y marca confirmado si hace falta. | Si el registro está cerrado o no llega el correo. |

Anota las dos cuentas:

- **Cuenta A** (tu cuenta actual): `adrian.skorski.garcia@gmail.com`
- **Cuenta B** (prueba): `______________________________`

Si Supabase pide confirmar el correo, confirma B antes de seguir.

---

## 2. Con la cuenta A: crear datos muy reconocibles

Entra en la app con la **cuenta A** y crea:

1. **Gestión → Ejercicios → Nuevo**
   - Nombre: `A01 - Ejercicio de Adrián`
   - Marca 1 músculo (por ejemplo, Pecho).
   - Guarda.

2. **Gestión → Rutinas → Nueva**
   - Nombre: `A01 - Rutina de Adrián`
   - Añade el ejercicio anterior.
   - Pon 1 serie con objetivo de 20 kg y 10 repeticiones.
   - Guarda.

3. **Inicia un entrenamiento** desde esa rutina y completa la primera serie.
   - Puedes cerrar la app a mitad: el guardado local (A-06) debe ofrecerte retomarla al volver.
   - No hace falta finalizarla para la prueba.

> Usa nombres con `A01` para localizarlos rápido en la búsqueda.

---

## 3. Cambiar a la cuenta B

En la app: **Gestión → Cuenta → Cerrar sesión**. Inicia sesión con la **cuenta B**.

Comprueba esto **con B**:

| Dónde | Qué debe pasar |
|---|---|
| Gestión → Ejercicios | No aparece `A01 - Ejercicio de Adrián`, tampoco al buscar `A01`. |
| Gestión → Rutinas | No aparece `A01 - Rutina de Adrián`. |
| Gestión → Rutinas → Ver archivadas | Tampoco aparece. |
| Inicio | No ofrece retomar la sesión de Adrián. |

Ahora crea con B un ejercicio `A01 - Ejercicio de María` y una rutina `A01 - Rutina de María` (para probar los dos sentidos).

---

## 4. Volver a la cuenta A

Cierra sesión de B y entra de nuevo con A.

| Dónde | Qué debe pasar |
|---|---|
| Gestión → Ejercicios | Aparece `A01 - Ejercicio de Adrián`, **no** el de María. |
| Gestión → Rutinas | Aparece `A01 - Rutina de Adrián`, **no** la de María. |
| Inicio | Vuelve a ofrecer retomar **tu** sesión en curso. |

Si todo coincide: **A-01 está superada**. Marca la tarea como `Hecho` en `docs/TRABAJO_PARALELO.md` y la Fase 4 como completada en `ROADMAP.md`.

---

## 5. Si algo falla

| Síntoma | Causa probable | Acción |
|---|---|---|
| B ve los datos de A | Falta una política RLS o está mal el `owner_id`. | Revisa las migraciones 001, 002, 004 y 008. |
| B no ve **sus propios** datos | Falta el `grant` a `authenticated` o la política de insert. | Revisa el final de la 008. |
| B ve datos de A solo en sesiones | Falta RLS en `workout_sessions` o en `session_*`. | Revisa la 006 y la 008. |
| Al buscar con B aparece el nombre de A | La consulta no filtra por dueño (además de RLS, el servicio debe filtrar). | Revisa `exerciseService.ts` y `routineService.ts`. |

---

## 6. Comprobación extra (opcional, más técnica)

Esto se hace en **Supabase → SQL Editor**. Demuestra que RLS funciona incluso si alguien intenta consultar directamente.

**Paso 1:** saca los IDs de las dos cuentas:

```sql
select id, email from auth.users
where email in (
  'adrian.skorski.garcia@gmail.com',
  'adrian.skorski.garcia+veyro.prueba@gmail.com'
);
```

**Paso 2:** simula ser la cuenta B y consulta. Sustituye `<ID_DE_B>` por el UUID del paso 1:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims =
    '{"sub":"<ID_DE_B>","role":"authenticated","aud":"authenticated"}';

  -- Solo deben salir los datos creados por B.
  select id, name from public.exercises where name like 'A01%';
  select id, name from public.routines where name like 'A01%';
  select id, status from public.workout_sessions;
rollback;
```

**Resultado esperado:** aparecen solo `A01 - Ejercicio de María` y `A01 - Rutina de María`. Si intentas consultar por el ID exacto del ejercicio de A, debe devolver **0 filas** (no un error).

> `begin` / `rollback` hacen que el cambio de "usuario" solo dure durante la consulta. No modifiques datos aquí.

---

## Resumen para el jefe de proyecto

- Un móvil es suficiente: cambias de cuenta y comparas.
- La prueba fuerte es en los dos sentidos: B no ve A **y** A no ve B.
- Si pasa, Fase 4 queda cerrada y seguimos con A-07 (cola de sincronización).
