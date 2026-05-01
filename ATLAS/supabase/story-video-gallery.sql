alter table public.stories
add column if not exists gallery_videos text[] not null default array[]::text[];
