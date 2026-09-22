-- ============================================================
-- 부름이 Pro
-- Supabase Security v2
-- ============================================================
-- 권한 구조
--
-- MASTER
--   users              전체
--   drivers            전체
--   driver_locations   전체 GPS
--   orders             전체
--   order_routes       전체
--   order_photos       전체
--   order_assignments  전체
--   order_history      전체
--   notifications      전체
--
-- SUBMASTER
--   users              필요한 사용자 정보
--   drivers            기사 기본정보
--   driver_locations   접근 금지
--   orders             접근 가능 오더
--   order_routes       접근 가능 오더
--   order_photos       접근 가능 오더
--   order_assignments  접근 가능 오더
--   order_history      접근 가능 오더
--   notifications      자기 알림
--
-- DRIVER
--   users              자기 정보
--   drivers            자기 정보
--   driver_locations   자기 GPS
--   orders             자신에게 배정된 오더
--   order_routes       자신에게 배정된 오더
--   order_photos       자신에게 배정된 오더
--   order_assignments  자신의 배차
--   order_history      자신에게 관련된 오더
--   notifications      자기 알림
--
-- 중요:
-- PostgreSQL RLS는 행 단위 보안이므로
-- GPS를 별도 driver_locations 테이블로 분리하여
-- SUBMASTER가 GPS 컬럼 자체에 접근할 수 없도록 구성한다.
-- ============================================================


-- ============================================================
-- 1. PRIVATE SCHEMA
-- ============================================================

create schema if not exists private;


-- ============================================================
-- 2. 현재 로그인 사용자 ID
-- ============================================================

create or replace function private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
    select id
    from public.users
    where auth_user_id = auth.uid()
      and is_active = true
    limit 1;
$$;


-- ============================================================
-- 3. 현재 로그인 사용자 ROLE
-- ============================================================

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
    select role
    from public.users
    where auth_user_id = auth.uid()
      and is_active = true
    limit 1;
$$;


-- ============================================================
-- 4. MASTER 여부
-- ============================================================

create or replace function private.is_master()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
    select coalesce(
        private.current_user_role() = 'master',
        false
    );
$$;


-- ============================================================
-- 5. SUBMASTER 여부
-- ============================================================

create or replace function private.is_submaster()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
    select coalesce(
        private.current_user_role() = 'submaster',
        false
    );
$$;


-- ============================================================
-- 6. CONTROL USER
-- MASTER + SUBMASTER
-- ============================================================

create or replace function private.is_control_user()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
    select coalesce(
        private.current_user_role() in ('master', 'submaster'),
        false
    );
$$;


-- ============================================================
-- 7. 현재 로그인 DRIVER ID
-- ============================================================

create or replace function private.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
    select id
    from public.drivers
    where user_id = private.current_user_id()
    limit 1;
$$;


-- ============================================================
-- 8. FUNCTION 권한
-- ============================================================

grant usage on schema private to authenticated;

grant execute on function private.current_user_id()
to authenticated;

grant execute on function private.current_user_role()
to authenticated;

grant execute on function private.is_master()
to authenticated;

grant execute on function private.is_submaster()
to authenticated;

grant execute on function private.is_control_user()
to authenticated;

grant execute on function private.current_driver_id()
to authenticated;


-- ============================================================
-- 9. RLS 활성화
-- ============================================================

alter table public.users enable row level security;

alter table public.drivers enable row level security;

alter table public.driver_locations enable row level security;

alter table public.orders enable row level security;

alter table public.order_routes enable row level security;

alter table public.order_photos enable row level security;

alter table public.order_assignments enable row level security;

alter table public.order_history enable row level security;

alter table public.notifications enable row level security;


-- ============================================================
-- 10. 기존 정책 제거
-- ============================================================

-- USERS
drop policy if exists users_select_policy
on public.users;

drop policy if exists users_insert_policy
on public.users;

drop policy if exists users_update_policy
on public.users;

drop policy if exists users_delete_policy
on public.users;


-- DRIVERS
drop policy if exists drivers_select_policy
on public.drivers;

drop policy if exists drivers_insert_policy
on public.drivers;

drop policy if exists drivers_update_policy
on public.drivers;

drop policy if exists drivers_delete_policy
on public.drivers;


-- DRIVER LOCATIONS
drop policy if exists driver_locations_select_policy
on public.driver_locations;

drop policy if exists driver_locations_insert_policy
on public.driver_locations;

drop policy if exists driver_locations_update_policy
on public.driver_locations;

drop policy if exists driver_locations_delete_policy
on public.driver_locations;


-- ORDERS
drop policy if exists orders_select_policy
on public.orders;

drop policy if exists orders_insert_policy
on public.orders;

drop policy if exists orders_update_policy
on public.orders;

drop policy if exists orders_delete_policy
on public.orders;


-- ORDER ROUTES
drop policy if exists order_routes_select_policy
on public.order_routes;

drop policy if exists order_routes_insert_policy
on public.order_routes;

drop policy if exists order_routes_update_policy
on public.order_routes;

drop policy if exists order_routes_delete_policy
on public.order_routes;


-- ORDER PHOTOS
drop policy if exists order_photos_select_policy
on public.order_photos;

drop policy if exists order_photos_insert_policy
on public.order_photos;

drop policy if exists order_photos_update_policy
on public.order_photos;

drop policy if exists order_photos_delete_policy
on public.order_photos;


-- ORDER ASSIGNMENTS
drop policy if exists order_assignments_select_policy
on public.order_assignments;

drop policy if exists order_assignments_insert_policy
on public.order_assignments;

drop policy if exists order_assignments_update_policy
on public.order_assignments;

drop policy if exists order_assignments_delete_policy
on public.order_assignments;


-- ORDER HISTORY
drop policy if exists order_history_select_policy
on public.order_history;

drop policy if exists order_history_insert_policy
on public.order_history;


-- NOTIFICATIONS
drop policy if exists notifications_select_policy
on public.notifications;

drop policy if exists notifications_insert_policy
on public.notifications;

drop policy if exists notifications_update_policy
on public.notifications;

drop policy if exists notifications_delete_policy
on public.notifications;


-- ============================================================
-- 11. USERS
-- ============================================================

create policy users_select_policy
on public.users
for select
to authenticated
using (
    private.is_master()
    or id = private.current_user_id()
);

create policy users_insert_policy
on public.users
for insert
to authenticated
with check (
    private.is_master()
);

create policy users_update_policy
on public.users
for update
to authenticated
using (
    private.is_master()
    or id = private.current_user_id()
)
with check (
    private.is_master()
    or id = private.current_user_id()
);

create policy users_delete_policy
on public.users
for delete
to authenticated
using (
    private.is_master()
);


-- ============================================================
-- 12. DRIVERS
-- ============================================================
-- MASTER: 전체
-- SUBMASTER: 전체 기사 기본정보
-- DRIVER: 자기 정보
--
-- GPS 컬럼이 없기 때문에
-- SUBMASTER가 이 테이블을 조회해도 GPS 노출 없음.
-- ============================================================

create policy drivers_select_policy
on public.drivers
for select
to authenticated
using (
    private.is_master()
    or private.is_submaster()
    or user_id = private.current_user_id()
);

create policy drivers_insert_policy
on public.drivers
for insert
to authenticated
with check (
    private.is_master()
);

create policy drivers_update_policy
on public.drivers
for update
to authenticated
using (
    private.is_master()
    or user_id = private.current_user_id()
)
with check (
    private.is_master()
    or user_id = private.current_user_id()
);

create policy drivers_delete_policy
on public.drivers
for delete
to authenticated
using (
    private.is_master()
);


-- ============================================================
-- 13. DRIVER LOCATIONS
-- ============================================================
-- MASTER: 전체 GPS
-- DRIVER: 자기 GPS
-- SUBMASTER: 완전 차단
-- ============================================================

create policy driver_locations_select_policy
on public.driver_locations
for select
to authenticated
using (
    private.is_master()
    or driver_id = private.current_driver_id()
);

create policy driver_locations_insert_policy
on public.driver_locations
for insert
to authenticated
with check (
    private.is_master()
    or driver_id = private.current_driver_id()
);

create policy driver_locations_update_policy
on public.driver_locations
for update
to authenticated
using (
    private.is_master()
    or driver_id = private.current_driver_id()
)
with check (
    private.is_master()
    or driver_id = private.current_driver_id()
);

create policy driver_locations_delete_policy
on public.driver_locations
for delete
to authenticated
using (
    private.is_master()
);


-- ============================================================
-- 14. ORDERS
-- ============================================================
-- MASTER + SUBMASTER:
-- 전체 오더 관리
--
-- DRIVER:
-- 자신에게 배정된 오더만
-- ============================================================

create policy orders_select_policy
on public.orders
for select
to authenticated
using (
    private.is_control_user()
    or assigned_driver_id = private.current_driver_id()
);

create policy orders_insert_policy
on public.orders
for insert
to authenticated
with check (
    private.is_control_user()
);

create policy orders_update_policy
on public.orders
for update
to authenticated
using (
    private.is_control_user()
    or assigned_driver_id = private.current_driver_id()
)
with check (
    private.is_control_user()
    or assigned_driver_id = private.current_driver_id()
);

create policy orders_delete_policy
on public.orders
for delete
to authenticated
using (
    private.is_master()
);


-- ============================================================
-- 15. ORDER ROUTES
-- ============================================================

create policy order_routes_select_policy
on public.order_routes
for select
to authenticated
using (
    private.is_control_user()
    or exists (
        select 1
        from public.orders o
        where o.id = order_routes.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);

create policy order_routes_insert_policy
on public.order_routes
for insert
to authenticated
with check (
    private.is_control_user()
    or exists (
        select 1
        from public.orders o
        where o.id = order_routes.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);

create policy order_routes_update_policy
on public.order_routes
for update
to authenticated
using (
    private.is_control_user()
    or exists (
        select 1
        from public.orders o
        where o.id = order_routes.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
)
with check (
    private.is_control_user()
    or exists (
        select 1
        from public.orders o
        where o.id = order_routes.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);

create policy order_routes_delete_policy
on public.order_routes
for delete
to authenticated
using (
    private.is_control_user()
);


-- ============================================================
-- 16. ORDER PHOTOS
-- ============================================================

create policy order_photos_select_policy
on public.order_photos
for select
to authenticated
using (
    private.is_control_user()
    or exists (
        select 1
        from public.orders o
        where o.id = order_photos.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);

create policy order_photos_insert_policy
on public.order_photos
for insert
to authenticated
with check (
    private.is_control_user()
    or exists (
        select 1
        from public.orders o
        where o.id = order_photos.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);

create policy order_photos_update_policy
on public.order_photos
for update
to authenticated
using (
    private.is_control_user()
)
with check (
    private.is_control_user()
);

create policy order_photos_delete_policy
on public.order_photos
for delete
to authenticated
using (
    private.is_control_user()
);


-- ============================================================
-- 17. ORDER ASSIGNMENTS
-- ============================================================

create policy order_assignments_select_policy
on public.order_assignments
for select
to authenticated
using (
    private.is_control_user()
    or driver_id = private.current_driver_id()
);

create policy order_assignments_insert_policy
on public.order_assignments
for insert
to authenticated
with check (
    private.is_control_user()
);

create policy order_assignments_update_policy
on public.order_assignments
for update
to authenticated
using (
    private.is_control_user()
    or driver_id = private.current_driver_id()
)
with check (
    private.is_control_user()
    or driver_id = private.current_driver_id()
);

create policy order_assignments_delete_policy
on public.order_assignments
for delete
to authenticated
using (
    private.is_master()
);


-- ============================================================
-- 18. ORDER HISTORY
-- ============================================================

create policy order_history_select_policy
on public.order_history
for select
to authenticated
using (
    private.is_control_user()
    or exists (
        select 1
        from public.orders o
        where o.id = order_history.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);

create policy order_history_insert_policy
on public.order_history
for insert
to authenticated
with check (
    private.is_control_user()
    or actor_user_id = private.current_user_id()
);


-- ============================================================
-- 19. NOTIFICATIONS
-- ============================================================

create policy notifications_select_policy
on public.notifications
for select
to authenticated
using (
    user_id = private.current_user_id()
    or private.is_master()
);

create policy notifications_insert_policy
on public.notifications
for insert
to authenticated
with check (
    private.is_control_user()
    or user_id = private.current_user_id()
);

create policy notifications_update_policy
on public.notifications
for update
to authenticated
using (
    user_id = private.current_user_id()
    or private.is_master()
)
with check (
    user_id = private.current_user_id()
    or private.is_master()
);

create policy notifications_delete_policy
on public.notifications
for delete
to authenticated
using (
    private.is_master()
);


-- ============================================================
-- 20. TABLE 권한
-- ============================================================

revoke all on public.users from anon;
revoke all on public.drivers from anon;
revoke all on public.driver_locations from anon;
revoke all on public.orders from anon;
revoke all on public.order_routes from anon;
revoke all on public.order_photos from anon;
revoke all on public.order_assignments from anon;
revoke all on public.order_history from anon;
revoke all on public.notifications from anon;


grant select, insert, update, delete
on public.users
to authenticated;

grant select, insert, update, delete
on public.drivers
to authenticated;

grant select, insert, update, delete
on public.driver_locations
to authenticated;

grant select, insert, update, delete
on public.orders
to authenticated;

grant select, insert, update, delete
on public.order_routes
to authenticated;

grant select, insert, update, delete
on public.order_photos
to authenticated;

grant select, insert, update, delete
on public.order_assignments
to authenticated;

grant select, insert
on public.order_history
to authenticated;

grant select, insert, update, delete
on public.notifications
to authenticated;


-- ============================================================
-- END
-- ============================================================