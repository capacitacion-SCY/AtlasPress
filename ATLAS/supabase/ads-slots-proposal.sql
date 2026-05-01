-- Propuesta (NO aplicada): modelo de slots para publicidad.
-- Objetivo: desacoplar orden global por created_at y permitir posiciones por columna/slot.

begin;

create table if not exists public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null default '',
  sort_order integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_slot_items (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.ad_slots(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  position integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_slot_items_position_positive check (position > 0),
  constraint ad_slot_items_unique_slot_position unique (slot_id, position),
  constraint ad_slot_items_unique_slot_ad unique (slot_id, ad_id)
);

create index if not exists ad_slot_items_slot_position_idx
  on public.ad_slot_items(slot_id, position);

create trigger ad_slots_touch_updated_at
before update on public.ad_slots
for each row execute function public.touch_updated_at();

create trigger ad_slot_items_touch_updated_at
before update on public.ad_slot_items
for each row execute function public.touch_updated_at();

insert into public.ad_slots (key, name, description, sort_order)
values
  ('homepage_left', 'Home izquierda', 'Slot lateral izquierdo de portada', 10),
  ('homepage_right', 'Home derecha', 'Slot lateral derecho de portada', 20),
  ('article_inline', 'Nota inline', 'Slot dentro del cuerpo de nota', 30)
on conflict (key) do nothing;

commit;
