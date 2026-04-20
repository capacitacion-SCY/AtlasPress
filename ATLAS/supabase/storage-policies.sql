-- Atlas Press Argentina - actualizar permisos del bucket atlas-media
-- Ejecutar si `schema.sql` ya fue cargado antes de agregar subida de imágenes.

insert into storage.buckets (id, name, public)
values ('atlas-media', 'atlas-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read atlas media" on storage.objects;
drop policy if exists "Editors can upload atlas media" on storage.objects;
drop policy if exists "Editors can update atlas media" on storage.objects;
drop policy if exists "Editors can delete atlas media" on storage.objects;

create policy "Public can read atlas media"
on storage.objects for select
using (bucket_id = 'atlas-media');

create policy "Editors can upload atlas media"
on storage.objects for insert
with check (
  bucket_id = 'atlas-media'
  and (
    public.has_permission('stories')
    or public.has_permission('ads')
    or public.has_permission('settings')
  )
);

create policy "Editors can update atlas media"
on storage.objects for update
using (
  bucket_id = 'atlas-media'
  and (
    public.has_permission('stories')
    or public.has_permission('ads')
    or public.has_permission('settings')
  )
)
with check (
  bucket_id = 'atlas-media'
  and (
    public.has_permission('stories')
    or public.has_permission('ads')
    or public.has_permission('settings')
  )
);

create policy "Editors can delete atlas media"
on storage.objects for delete
using (
  bucket_id = 'atlas-media'
  and (
    public.has_permission('stories')
    or public.has_permission('ads')
    or public.has_permission('settings')
  )
);
