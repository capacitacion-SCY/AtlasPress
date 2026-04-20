-- Atlas Press Argentina - productive Supabase schema
-- Run this in the Supabase SQL editor before launching the Next.js app.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null default '',
  role text not null default 'redactor' check (role in ('admin', 'editor', 'redactor', 'publicidad', 'revisor')),
  permissions text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'Atlas Press Argentina',
  tagline text not null default '',
  impact_background_image text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'Redacción',
  image_url text not null default '',
  gallery_images text[] not null default array[]::text[],
  video_url text not null default '',
  featured boolean not null default false,
  editors_pick boolean not null default false,
  featured_order integer,
  featured_text_position text not null default 'auto' check (featured_text_position in ('auto', 'left', 'right')),
  source_label text not null default '',
  source_url text not null default '',
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Publicidad',
  title text not null,
  description text not null default '',
  image_url text not null default '',
  url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.impact_cards (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  title text not null default '',
  body text not null default '',
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger site_settings_touch_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();

create trigger stories_touch_updated_at
before update on public.stories
for each row execute function public.touch_updated_at();

create trigger ads_touch_updated_at
before update on public.ads
for each row execute function public.touch_updated_at();

create trigger impact_cards_touch_updated_at
before update on public.impact_cards
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, permissions)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'redactor'),
    coalesce(
      string_to_array(new.raw_user_meta_data ->> 'permissions', ','),
      array['stories']
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
      and (
        role = 'admin'
        or permission = any(permissions)
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.stories enable row level security;
alter table public.ads enable row level security;
alter table public.impact_cards enable row level security;

create policy "Public can read active content"
on public.stories for select
using (status = 'published');

create policy "Editors can manage stories"
on public.stories for all
using (public.has_permission('stories'))
with check (public.has_permission('stories'));

create policy "Public can read categories"
on public.categories for select
using (true);

create policy "Editors can manage categories"
on public.categories for all
using (public.has_permission('settings'))
with check (public.has_permission('settings'));

create policy "Public can read site settings"
on public.site_settings for select
using (true);

create policy "Editors can manage site settings"
on public.site_settings for all
using (public.has_permission('settings'))
with check (public.has_permission('settings'));

create policy "Public can read active ads"
on public.ads for select
using (active = true);

create policy "Ad managers can manage ads"
on public.ads for all
using (public.has_permission('ads'))
with check (public.has_permission('ads'));

create policy "Public can read impact cards"
on public.impact_cards for select
using (true);

create policy "Editors can manage impact cards"
on public.impact_cards for all
using (public.has_permission('impact'))
with check (public.has_permission('impact'));

create policy "Users can read own profile"
on public.profiles for select
using (id = auth.uid() or public.has_permission('users'));

create policy "Admins can manage profiles"
on public.profiles for all
using (public.has_permission('users'))
with check (public.has_permission('users'));

insert into public.site_settings (site_name, tagline)
select 'Atlas Press Argentina', 'Buenas noticias, campañas humanitarias y encuentros interreligiosos con foco en Scientology Argentina.'
where not exists (select 1 from public.site_settings);

insert into public.categories (name, slug, sort_order)
values
  ('Interreligioso', 'interreligioso', 10),
  ('Comunidad', 'comunidad', 20),
  ('Libertad Religiosa', 'libertad-religiosa', 30),
  ('Historias', 'historias', 40),
  ('Prevención', 'prevencion', 50),
  ('Jóvenes por los Derechos Humanos', 'jovenes-por-los-derechos-humanos', 60),
  ('Voces para la Humanidad', 'voces-para-la-humanidad', 70),
  ('Mundo Libre de drogas', 'mundo-libre-de-drogas', 80),
  ('Ministros Voluntarios', 'ministros-voluntarios', 90),
  ('El Camino a la Felicidad', 'el-camino-a-la-felicidad', 100),
  ('CCHR', 'cchr', 110),
  ('Narconon', 'narconon', 120),
  ('Unidos por los Derechos Humanos', 'unidos-por-los-derechos-humanos', 130),
  ('Librería', 'libreria', 140)
on conflict (slug) do nothing;

insert into public.impact_cards (label, title, body, sort_order)
values
  ('Prevención', '3.000 folletos', 'Distribuidos en Plaza Moreno, La Plata, en una acción educativa comunitaria.', 1),
  ('Derechos', '30 derechos', 'Material educativo sobre derechos humanos para escuelas, talleres y comunidades.', 2),
  ('Diálogo', 'Buenos Aires 2024', 'Encuentros interreligiosos y acciones positivas con foco en comunidad.', 3)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('atlas-media', 'atlas-media', true)
on conflict (id) do nothing;

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
