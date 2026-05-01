alter table public.site_settings
add column if not exists auto_rotation_seconds integer not null default 45;

alter table public.site_settings
add column if not exists center_image_rotation_seconds integer not null default 5;

alter table public.site_settings
add column if not exists right_image_rotation_seconds integer not null default 5;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_auto_rotation_seconds_check'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_auto_rotation_seconds_check
      check (auto_rotation_seconds between 10 and 3600);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_center_image_rotation_seconds_check'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_center_image_rotation_seconds_check
      check (center_image_rotation_seconds between 2 and 120);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_right_image_rotation_seconds_check'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_right_image_rotation_seconds_check
      check (right_image_rotation_seconds between 2 and 120);
  end if;
end
$$;
