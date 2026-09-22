-- ============================================================
-- 부름이 Pro Database Schema v3
-- ============================================================
-- 원칙
-- 1. Master / Submaster / Driver 구조
-- 2. GPS 위치정보는 drivers와 분리
-- 3. Master만 전체 GPS 조회 가능
-- 4. Submaster는 기사 기본정보만 조회
-- 5. Driver는 자기 정보/자기 GPS만 접근
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- USERS
-- ============================================================

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),

    auth_user_id uuid unique,

    login_id text not null unique,
    name text not null,
    phone text,

    role text not null
        check (role in ('master', 'submaster', 'driver')),

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- DRIVERS
-- 기사 기본정보
-- GPS 정보는 driver_locations로 분리
-- ============================================================

create table if not exists public.drivers (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null unique
        references public.users(id)
        on delete cascade,

    driver_code text not null unique,

    work_status text not null default '퇴근함'
        check (work_status in ('근무중', '퇴근함')),

    last_access_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- DRIVER LOCATIONS
-- 기사 GPS 전용 테이블
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
-- ORDERS
-- ============================================================

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),

    order_number text not null unique,

    registered_by uuid not null
        references public.users(id),

    delegated_to_user_id uuid
        references public.users(id),

    product_name text not null,

    dispatch_type text not null
        check (dispatch_type in ('지정배차', '선착순배차')),

    assigned_driver_id uuid
        references public.drivers(id),

    order_status text not null default '접수'
        check (
            order_status in (
                '접수',
                '배차대기',
                '배차중',
                '배차완료',
                '배송중',
                '배송완료',
                '취소'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    completed_at timestamptz,
    cancelled_at timestamptz
);


-- ============================================================
-- ORDER ROUTES
-- ============================================================

create table if not exists public.order_routes (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null
        references public.orders(id)
        on delete cascade,

    route_order integer not null,

    address text not null,

    latitude numeric(10,7),
    longitude numeric(10,7),

    route_status text not null default '미확인'
        check (
            route_status in (
                '미확인',
                '미픽업',
                '픽업완료',
                '배송중',
                '배송완료'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(order_id, route_order)
);


-- ============================================================
-- ORDER PHOTOS
-- ============================================================

create table if not exists public.order_photos (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null
        references public.orders(id)
        on delete cascade,

    storage_path text not null,

    original_filename text,

    created_by uuid
        references public.users(id),

    created_at timestamptz not null default now()
);


-- ============================================================
-- ORDER ASSIGNMENTS
-- 배차 / 수락 / 거절 / 재배차 이력
-- ============================================================

create table if not exists public.order_assignments (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null
        references public.orders(id)
        on delete cascade,

    driver_id uuid not null
        references public.drivers(id),

    assigned_by uuid
        references public.users(id),

    assignment_type text not null
        check (
            assignment_type in (
                '지정배차',
                '선착순배차',
                '재배차'
            )
        ),

    assignment_status text not null default '대기'
        check (
            assignment_status in (
                '대기',
                '수락',
                '거절',
                '취소',
                '완료'
            )
        ),

    assigned_at timestamptz not null default now(),
    responded_at timestamptz
);


-- ============================================================
-- ORDER HISTORY
-- 모든 주요 작업 기록
-- ============================================================

create table if not exists public.order_history (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null
        references public.orders(id)
        on delete cascade,

    action text not null,

    actor_user_id uuid
        references public.users(id),

    before_data jsonb,
    after_data jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    order_id uuid
        references public.orders(id)
        on delete cascade,

    notification_type text not null,

    title text,
    message text,

    is_read boolean not null default false,

    created_at timestamptz not null default now(),
    read_at timestamptz
);


-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists trg_users_updated_at
on public.users;

create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();


drop trigger if exists trg_drivers_updated_at
on public.drivers;

create trigger trg_drivers_updated_at
before update on public.drivers
for each row
execute function public.set_updated_at();


drop trigger if exists trg_driver_locations_updated_at
on public.driver_locations;

create trigger trg_driver_locations_updated_at
before update on public.driver_locations
for each row
execute function public.set_updated_at();


drop trigger if exists trg_orders_updated_at
on public.orders;

create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();


drop trigger if exists trg_order_routes_updated_at
on public.order_routes;

create trigger trg_order_routes_updated_at
before update on public.order_routes
for each row
execute function public.set_updated_at();


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_users_role
on public.users(role);

create index if not exists idx_users_active
on public.users(is_active);

create index if not exists idx_drivers_user_id
on public.drivers(user_id);

create index if not exists idx_drivers_work_status
on public.drivers(work_status);

create index if not exists idx_driver_locations_driver_id
on public.driver_locations(driver_id);

create index if not exists idx_driver_locations_updated
on public.driver_locations(location_updated_at);

create index if not exists idx_orders_registered_by
on public.orders(registered_by);

create index if not exists idx_orders_delegated_to
on public.orders(delegated_to_user_id);

create index if not exists idx_orders_driver
on public.orders(assigned_driver_id);

create index if not exists idx_orders_status
on public.orders(order_status);

create index if not exists idx_orders_created_at
on public.orders(created_at desc);

create index if not exists idx_order_routes_order
on public.order_routes(order_id);

create index if not exists idx_order_photos_order
on public.order_photos(order_id);

create index if not exists idx_order_assignments_order
on public.order_assignments(order_id);

create index if not exists idx_order_assignments_driver
on public.order_assignments(driver_id);

create index if not exists idx_order_history_order
on public.order_history(order_id);

create index if not exists idx_notifications_user
on public.notifications(user_id);

create index if not exists idx_notifications_order
on public.notifications(order_id);

create index if not exists idx_notifications_unread
on public.notifications(user_id, is_read);


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.users is
'부름이 Pro 사용자 계정 및 권한 정보';

comment on table public.drivers is
'기사 기본정보 및 근무상태';

comment on table public.driver_locations is
'기사 GPS 위치정보. 권한에 따라 접근 제한';

comment on table public.orders is
'꽃배달 오더 기본정보';

comment on table public.order_routes is
'오더별 배송 경로';

comment on table public.order_photos is
'오더 사진 Storage 경로';

comment on table public.order_assignments is
'배차 및 수락/거절/재배차 이력';

comment on table public.order_history is
'오더 변경 이력';

comment on table public.notifications is
'사용자 알림';


-- ============================================================
-- END
-- ============================================================