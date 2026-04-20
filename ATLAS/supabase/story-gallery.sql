-- Atlas Press - galeria de imagenes por publicacion
-- Ejecuta este archivo una vez en Supabase SQL editor si tu base ya existia.

alter table public.stories
add column if not exists gallery_images text[] not null default array[]::text[];
