-- ============================================================
-- 遺由꾩씠 Pro
-- Supabase Security v2
-- ============================================================
-- 沅뚰븳 援ъ“
--
-- MASTER
--   users              ?꾩껜
--   drivers            ?꾩껜
--   driver_locations   ?꾩껜 GPS
--   orders             ?꾩껜
--   order_routes       ?꾩껜
--   order_photos       ?꾩껜
--   order_assignments  ?꾩껜
--   order_history      ?꾩껜
--   notifications      ?꾩껜
--
-- SUBMASTER
--   users              ?꾩슂???ъ슜???뺣낫
--   drivers            湲곗궗 湲곕낯?뺣낫
--   driver_locations   ?묎렐 湲덉?
--   orders             ?묎렐 媛???ㅻ뜑
--   order_routes       ?묎렐 媛???ㅻ뜑
--   order_photos       ?묎렐 媛???ㅻ뜑
--   order_assignments  ?묎렐 媛???ㅻ뜑
--   order_history      ?묎렐 媛???ㅻ뜑
--   notifications      ?먭린 ?뚮┝
--
-- DRIVER
--   users              ?먭린 ?뺣낫
--   drivers            ?먭린 ?뺣낫
--   driver_locations   ?먭린 GPS
--   orders             ?먯떊?먭쾶 諛곗젙???ㅻ뜑
--   order_routes       ?먯떊?먭쾶 諛곗젙???ㅻ뜑
--   order_photos       ?먯떊?먭쾶 諛곗젙???ㅻ뜑
--   order_assignments  ?먯떊??諛곗감
--   order_history      ?먯떊?먭쾶 愿?⑤맂 ?ㅻ뜑
--   notifications      ?먭린 ?뚮┝
--
-- 以묒슂:
-- PostgreSQL RLS?????⑥쐞 蹂댁븞?대?濡?
-- GPS瑜?蹂꾨룄 driver_locations ?뚯씠釉붾줈 遺꾨━?섏뿬
-- SUBMASTER媛 GPS 而щ읆 ?먯껜???묎렐?????녿룄濡?援ъ꽦?쒕떎.
-- ============================================================


-- ============================================================
-- 1. PRIVATE SCHEMA
-- ============================================================

create schema if not exists private;


-- ============================================================
-- 2. ?꾩옱 濡쒓렇???ъ슜??ID
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
-- 3. ?꾩옱 濡쒓렇???ъ슜??ROLE
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
-- 4. MASTER ?щ?
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
-- 5. SUBMASTER ?щ?
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
-- 7. ?꾩옱 濡쒓렇??DRIVER ID
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
-- 8. FUNCTION 沅뚰븳
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
-- 9. RLS ?쒖꽦??
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
-- 10. 湲곗〈 ?뺤콉 ?쒓굅
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
-- MASTER: ?꾩껜
-- SUBMASTER: ?꾩껜 湲곗궗 湲곕낯?뺣낫
-- DRIVER: ?먭린 ?뺣낫
--
-- GPS 而щ읆???녾린 ?뚮Ц??
-- SUBMASTER媛 ???뚯씠釉붿쓣 議고쉶?대룄 GPS ?몄텧 ?놁쓬.
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
-- MASTER: ?꾩껜 GPS
-- DRIVER: ?먭린 GPS
-- SUBMASTER: ?꾩쟾 李⑤떒
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
-- ?꾩껜 ?ㅻ뜑 愿由?
--
-- DRIVER:
-- ?먯떊?먭쾶 諛곗젙???ㅻ뜑留?
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
    or user_id = private.current_user_id()
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
-- 20. TABLE 沅뚰븳
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
