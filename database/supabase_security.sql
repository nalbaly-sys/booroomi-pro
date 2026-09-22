-- =========================================================
-- 부름이 Pro Supabase Security v1
-- =========================================================
--
-- 권한 구조
--
-- MASTER
--   - 전체 오더 조회/생성/수정/관리
--   - SUBMASTER에게 오더 전달
--   - 기사 배차/재배차
--   - 전체 기사 위치 조회
--
-- SUBMASTER
--   - MASTER와 동일한 오더/배차 관리
--   - SUBMASTER에게 오더 전달 불가
--   - 전체 기사 위치 조회 불가
--
-- DRIVER
--   - 본인 관련 업무만 접근
--   - 본인 배차 오더 조회
--   - 본인 GPS 위치 갱신
--   - 다른 기사 정보 접근 불가
--
-- 중요:
-- 화면에서 숨기는 것이 아니라 PostgreSQL RLS로 실제 차단한다.
-- =========================================================


-- =========================================================
-- 1. PRIVATE SCHEMA
-- =========================================================

create schema if not exists private;


-- =========================================================
-- 2. 현재 로그인 사용자 ID 조회
-- =========================================================

create or replace function private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
    select u.id
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.is_active = true
    limit 1;
$$;


-- =========================================================
-- 3. 현재 사용자 ROLE 조회
-- =========================================================

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
    select u.role
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.is_active = true
    limit 1;
$$;


-- =========================================================
-- 4. MASTER 여부
-- =========================================================

create or replace function private.is_master()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
    select coalesce(private.current_user_role() = 'MASTER', false);
$$;


-- =========================================================
-- 5. SUBMASTER 여부
-- =========================================================

create or replace function private.is_submaster()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
    select coalesce(private.current_user_role() = 'SUBMASTER', false);
$$;


-- =========================================================
-- 6. MASTER / SUBMASTER 여부
-- =========================================================

create or replace function private.is_control_user()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
    select private.current_user_role() in ('MASTER', 'SUBMASTER');
$$;


-- =========================================================
-- 7. DRIVER 자신의 driver ID 조회
-- =========================================================

create or replace function private.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
    select d.id
    from public.drivers d
    join public.users u
      on u.id = d.user_id
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and u.role = 'DRIVER'
    limit 1;
$$;


-- =========================================================
-- 8. 함수 실행 권한
-- =========================================================

revoke all on function private.current_user_id() from public;
revoke all on function private.current_user_role() from public;
revoke all on function private.is_master() from public;
revoke all on function private.is_submaster() from public;
revoke all on function private.is_control_user() from public;
revoke all on function private.current_driver_id() from public;

grant execute on function private.current_user_id() to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_master() to authenticated;
grant execute on function private.is_submaster() to authenticated;
grant execute on function private.is_control_user() to authenticated;
grant execute on function private.current_driver_id() to authenticated;


-- =========================================================
-- 9. RLS 활성화
-- =========================================================

alter table public.users enable row level security;
alter table public.drivers enable row level security;
alter table public.orders enable row level security;
alter table public.order_routes enable row level security;
alter table public.order_photos enable row level security;
alter table public.order_assignments enable row level security;
alter table public.order_history enable row level security;
alter table public.notifications enable row level security;


-- =========================================================
-- 10. USERS
-- =========================================================

drop policy if exists users_select_self on public.users;

create policy users_select_self
on public.users
for select
to authenticated
using (
    id = private.current_user_id()
);


drop policy if exists users_select_control on public.users;

create policy users_select_control
on public.users
for select
to authenticated
using (
    private.is_control_user()
);


drop policy if exists users_update_self on public.users;

create policy users_update_self
on public.users
for update
to authenticated
using (
    id = private.current_user_id()
)
with check (
    id = private.current_user_id()
);


-- =========================================================
-- 11. DRIVERS
-- =========================================================
--
-- MASTER
--   전체 기사 조회 가능
--
-- SUBMASTER
--   기사 기본정보/배차 대상 정보는 필요하지만
--   GPS 위치는 조회할 수 없음
--
-- DRIVER
--   자기 자신의 driver row만 접근
-- =========================================================

drop policy if exists drivers_select_master on public.drivers;

create policy drivers_select_master
on public.drivers
for select
to authenticated
using (
    private.is_master()
);


drop policy if exists drivers_select_submaster on public.drivers;

create policy drivers_select_submaster
on public.drivers
for select
to authenticated
using (
    private.is_submaster()
);


drop policy if exists drivers_select_self on public.drivers;

create policy drivers_select_self
on public.drivers
for select
to authenticated
using (
    user_id = private.current_user_id()
);


drop policy if exists drivers_update_self on public.drivers;

create policy drivers_update_self
on public.drivers
for update
to authenticated
using (
    user_id = private.current_user_id()
)
with check (
    user_id = private.current_user_id()
);


-- =========================================================
-- 12. ORDERS
-- =========================================================
--
-- MASTER / SUBMASTER
--   관제 가능한 모든 오더
--
-- DRIVER
--   자신에게 현재 배차된 오더
-- =========================================================

drop policy if exists orders_select_control on public.orders;

create policy orders_select_control
on public.orders
for select
to authenticated
using (
    private.is_control_user()
);


drop policy if exists orders_select_driver on public.orders;

create policy orders_select_driver
on public.orders
for select
to authenticated
using (
    assigned_driver_id = private.current_driver_id()
);


drop policy if exists orders_insert_control on public.orders;

create policy orders_insert_control
on public.orders
for insert
to authenticated
with check (
    private.is_control_user()
    and registered_by = private.current_user_id()
);


drop policy if exists orders_update_control on public.orders;

create policy orders_update_control
on public.orders
for update
to authenticated
using (
    private.is_control_user()
)
with check (
    private.is_control_user()
);


-- =========================================================
-- 13. ORDER ROUTES
-- =========================================================

drop policy if exists order_routes_select_control on public.order_routes;

create policy order_routes_select_control
on public.order_routes
for select
to authenticated
using (
    private.is_control_user()
);


drop policy if exists order_routes_select_driver on public.order_routes;

create policy order_routes_select_driver
on public.order_routes
for select
to authenticated
using (
    exists (
        select 1
        from public.orders o
        where o.id = order_routes.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);


drop policy if exists order_routes_insert_control on public.order_routes;

create policy order_routes_insert_control
on public.order_routes
for insert
to authenticated
with check (
    private.is_control_user()
);


drop policy if exists order_routes_update_control on public.order_routes;

create policy order_routes_update_control
on public.order_routes
for update
to authenticated
using (
    private.is_control_user()
)
with check (
    private.is_control_user()
);


drop policy if exists order_routes_update_driver on public.order_routes;

create policy order_routes_update_driver
on public.order_routes
for update
to authenticated
using (
    exists (
        select 1
        from public.orders o
        where o.id = order_routes.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
)
with check (
    exists (
        select 1
        from public.orders o
        where o.id = order_routes.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);


-- =========================================================
-- 14. ORDER PHOTOS
-- =========================================================

drop policy if exists order_photos_select_control on public.order_photos;

create policy order_photos_select_control
on public.order_photos
for select
to authenticated
using (
    private.is_control_user()
);


drop policy if exists order_photos_select_driver on public.order_photos;

create policy order_photos_select_driver
on public.order_photos
for select
to authenticated
using (
    exists (
        select 1
        from public.orders o
        where o.id = order_photos.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);


drop policy if exists order_photos_insert_control on public.order_photos;

create policy order_photos_insert_control
on public.order_photos
for insert
to authenticated
with check (
    private.is_control_user()
);


drop policy if exists order_photos_insert_driver on public.order_photos;

create policy order_photos_insert_driver
on public.order_photos
for insert
to authenticated
with check (
    created_by = private.current_user_id()
    and exists (
        select 1
        from public.orders o
        where o.id = order_photos.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);


-- =========================================================
-- 15. ORDER ASSIGNMENTS
-- =========================================================
--
-- MASTER / SUBMASTER
--   배차 이력 전체 조회
--
-- DRIVER
--   자기에게 배차된 이력만 조회
-- =========================================================

drop policy if exists order_assignments_select_control
on public.order_assignments;

create policy order_assignments_select_control
on public.order_assignments
for select
to authenticated
using (
    private.is_control_user()
);


drop policy if exists order_assignments_select_driver
on public.order_assignments;

create policy order_assignments_select_driver
on public.order_assignments
for select
to authenticated
using (
    driver_id = private.current_driver_id()
);


drop policy if exists order_assignments_insert_control
on public.order_assignments;

create policy order_assignments_insert_control
on public.order_assignments
for insert
to authenticated
with check (
    private.is_control_user()
    and assigned_by = private.current_user_id()
);


drop policy if exists order_assignments_update_control
on public.order_assignments;

create policy order_assignments_update_control
on public.order_assignments
for update
to authenticated
using (
    private.is_control_user()
)
with check (
    private.is_control_user()
);


drop policy if exists order_assignments_update_driver
on public.order_assignments;

create policy order_assignments_update_driver
on public.order_assignments
for update
to authenticated
using (
    driver_id = private.current_driver_id()
)
with check (
    driver_id = private.current_driver_id()
);


-- =========================================================
-- 16. ORDER HISTORY
-- =========================================================

drop policy if exists order_history_select_control
on public.order_history;

create policy order_history_select_control
on public.order_history
for select
to authenticated
using (
    private.is_control_user()
);


drop policy if exists order_history_select_driver
on public.order_history;

create policy order_history_select_driver
on public.order_history
for select
to authenticated
using (
    exists (
        select 1
        from public.orders o
        where o.id = order_history.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);


drop policy if exists order_history_insert_control
on public.order_history;

create policy order_history_insert_control
on public.order_history
for insert
to authenticated
with check (
    private.is_control_user()
    and user_id = private.current_user_id()
);


drop policy if exists order_history_insert_driver
on public.order_history;

create policy order_history_insert_driver
on public.order_history
for insert
to authenticated
with check (
    user_id = private.current_user_id()
    and exists (
        select 1
        from public.orders o
        where o.id = order_history.order_id
          and o.assigned_driver_id = private.current_driver_id()
    )
);


-- =========================================================
-- 17. NOTIFICATIONS
-- =========================================================

drop policy if exists notifications_select_self
on public.notifications;

create policy notifications_select_self
on public.notifications
for select
to authenticated
using (
    user_id = private.current_user_id()
);


drop policy if exists notifications_update_self
on public.notifications;

create policy notifications_update_self
on public.notifications
for update
to authenticated
using (
    user_id = private.current_user_id()
)
with check (
    user_id = private.current_user_id()
);


drop policy if exists notifications_insert_control
on public.notifications;

create policy notifications_insert_control
on public.notifications
for insert
to authenticated
with check (
    private.is_control_user()
);


-- =========================================================
-- 18. 테이블 기본 권한
-- =========================================================

revoke all on public.users from anon;
revoke all on public.drivers from anon;
revoke all on public.orders from anon;
revoke all on public.order_routes from anon;
revoke all on public.order_photos from anon;
revoke all on public.order_assignments from anon;
revoke all on public.order_history from anon;
revoke all on public.notifications from anon;


grant select, insert, update on public.users
to authenticated;

grant select, update on public.drivers
to authenticated;

grant select, insert, update on public.orders
to authenticated;

grant select, insert, update on public.order_routes
to authenticated;

grant select, insert on public.order_photos
to authenticated;

grant select, insert, update on public.order_assignments
to authenticated;

grant select, insert on public.order_history
to authenticated;

grant select, insert, update on public.notifications
to authenticated;


-- =========================================================
-- END
-- =========================================================