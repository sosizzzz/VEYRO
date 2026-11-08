-- ============================================================================
-- 001_profiles.sql
--
-- Crea la tabla de perfiles y su seguridad.
--
-- CÓMO SE EJECUTA
-- 1. Abre tu proyecto en supabase.com.
-- 2. Menú lateral > "SQL Editor".
-- 3. Pega TODO el contenido de este archivo y pulsa "Run".
--
-- Es idempotente: si lo ejecutas dos veces, no rompe nada.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABLA DE PERFILES
--
-- ¿Por qué una tabla aparte si Supabase ya guarda usuarios?
-- Porque `auth.users` pertenece al sistema de autenticación y no conviene
-- tocarla. `profiles` guarda lo que la app necesita mostrar: nombre, avatar...
--
-- La clave primaria es el mismo id que el usuario de autenticación, y si ese
-- usuario se elimina, su perfil desaparece con él (`on delete cascade`).
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),

  -- El nombre que se muestra debe tener entre 2 y 40 caracteres.
  -- La base de datos también lo comprueba, no solo la app.
  constraint profiles_display_name_length
    check (char_length(display_name) between 2 and 40)
);

comment on table public.profiles is
  'Datos visibles de cada usuario. Una fila por cuenta de autenticación.';


-- ----------------------------------------------------------------------------
-- 2. SEGURIDAD POR FILA (RLS)
--
-- RLS = Row Level Security. Significa que PostgreSQL aplica permisos fila a
-- fila, no solo por tabla. Aunque alguien tenga la clave pública de la app,
-- solo podrá ver las filas que las políticas permitan.
--
-- Empezamos cerrando la puerta: sin RLS activo, cualquier fila sería visible.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Cada usuario puede LEER su propio perfil. Nada más.
-- `to authenticated` = solo usuarios con sesión iniciada.
-- `(select auth.uid())` es la forma recomendada por Supabase: se evalúa una
-- vez por consulta en lugar de una vez por fila.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Cada usuario puede MODIFICAR su propio perfil, y solo el suyo.
-- `using` decide qué filas puede tocar; `with check` impide que, al editar,
-- cambie el `id` y la fila acabe perteneciendo a otra persona.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No hay políticas de INSERT ni DELETE a propósito:
-- - El perfil se crea solo, con el disparador de abajo.
-- - Un usuario no puede borrar su fila de perfil desde la app.

-- Permisos explícitos: el rol `anon` (sin sesión) no debe ver nada.
-- `authenticated` solo puede leer y actualizar; las políticas hacen el resto.
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;


-- ----------------------------------------------------------------------------
-- 3. CREAR EL PERFIL AUTOMÁTICAMENTE AL REGISTRARSE
--
-- Sin esto, tras el registro habría que crear el perfil desde la app.
-- Si el usuario cierra la app en ese instante, quedaría una cuenta sin perfil.
-- Con un disparador (trigger), la fila se crea en la misma transacción que el
-- usuario: o se crean los dos, o no se crea ninguno.
--
-- `security definer` hace que la función se ejecute con los permisos de quien
-- la creó (el administrador), no del usuario. Es necesario porque el usuario
-- recién registrado no tiene permiso para insertar en `profiles`.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- 1º intentamos el nombre que escribió en el formulario.
    -- 2º, si viene vacío, usamos la parte del correo anterior a la @.
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Se recrea siempre para poder ejecutar este archivo varias veces.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 4. RELLENAR PERFILES QUE YA EXISTAN
--
-- Si ya te habías registrado antes de ejecutar este archivo, este bloque crea
-- tu perfil. Si no hay usuarios, no hace nada.
-- ----------------------------------------------------------------------------
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(u.email, 'usuario'), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 5. COMPROBACIÓN
--
-- Ejecuta esto por separado para ver el resultado:
--
--   select id, display_name, created_at from public.profiles;
--
-- Y para confirmar que RLS está activo (`rowsecurity` debe ser true):
--
--   select relname, relrowsecurity from pg_class where relname = 'profiles';
-- ----------------------------------------------------------------------------
