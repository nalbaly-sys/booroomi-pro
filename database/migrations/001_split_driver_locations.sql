-- ============================================================
-- 遺由꾩씠 Pro
-- Migration 001
-- drivers GPS ?뺣낫 遺꾨━
-- v2 ??v3
-- ============================================================

begin;


-- ============================================================
-- 1. GPS ?꾩슜 ?뚯씠釉??앹꽦
-- ============================================================

create table if not exists public.driver_locations (
    id uuid primary key default gen_random_uuid(),

    driver_id uuid not null unique
        references public.drivers(id)
        on delete cascade,

    latitude numeric(10,7),
    longitude numeric(10,7),

    location_updated_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. 湲곗〈 drivers??GPS ?곗씠?곕? driver_locations濡?蹂듭궗
-- ============================================================

insert into public.driver_locations (
    driver_id,
    latitude,
    longitude,
    location_updated_at
)
select
    id,
    latitude,
    longitude,
    location_updated_at
from public.drivers
where
    latitude is not null
    or longitude is not null
    or location_updated_at is not null
on conflict (driver_id)
do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    location_updated_at = excluded.location_updated_at,
    updated_at = now();


-- ============================================================
-- 3. driver_locations updated_at ?먮룞 媛깆떊
-- ============================================================

drop trigger if exists trg_driver_locations_updated_at
on public.driver_locations;

create trigger trg_driver_locations_updated_at
before update on public.driver_locations
for each row
execute function public.set_updated_at();


-- ============================================================
-- 4. GPS 而щ읆??drivers?먯꽌 ?쒓굅
-- ============================================================

alter table public.drivers
drop column if exists latitude;

alter table public.drivers
drop column if exists longitude;

alter table public.drivers
drop column if exists location_updated_at;


-- ============================================================
-- 5. ?몃뜳??
-- ============================================================

create index if not exists idx_driver_locations_driver_id
on public.driver_locations(driver_id);

create index if not exists idx_driver_locations_updated
on public.driver_locations(location_updated_at);


-- ============================================================
-- 6. ?ㅻ챸
-- ============================================================

comment on table public.driver_locations is
'湲곗궗 GPS ?꾩튂?뺣낫. Master? ?대떦 Driver留??묎렐 媛??;

comment on column public.driver_locations.latitude is
'湲곗궗 ?꾩옱 ?꾨룄';

comment on column public.driver_locations.longitude is
'湲곗궗 ?꾩옱 寃쎈룄';

comment on column public.driver_locations.location_updated_at is
'湲곗궗 GPS 留덉?留?媛깆떊?쒓컙';


-- ============================================================
-- ?꾨즺
-- ============================================================

commit;