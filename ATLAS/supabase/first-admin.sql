-- Atlas Press Argentina - primer administrador
-- Ejecutar despues de crear el usuario en Supabase Auth.
-- Este script crea el perfil si no existe y luego le da permisos completos.

insert into public.profiles (id, email, display_name, role, permissions, active)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)),
  'admin',
  array['stories', 'ads', 'impact', 'settings', 'users'],
  true
from auth.users
where email = 'tu-email@dominio.com'
on conflict (id) do nothing;

update public.profiles
set role = 'admin',
    permissions = array['stories', 'ads', 'impact', 'settings', 'users'],
    active = true,
    display_name = coalesce(nullif(display_name, ''), split_part(email, '@', 1))
where email = 'tu-email@dominio.com';

select id, email, display_name, role, permissions, active
from public.profiles
where email = 'tu-email@dominio.com';
