-- =========================================================
-- 부름이 Pro DEV Database Schema v1
-- PostgreSQL / Supabase
-- =========================================================

create extension if not exists pgcrypto;

-- 사용자
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique,
    login_id varchar(100) unique not null,
    name varchar(100) not null,
    phone varchar(30),
    role varchar(20) not null default 'DRIVER'
        check (role in ('MASTER', 'SUBMASTER', 'DRIVER')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 기사
create table if not exists drivers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references users(id) on delete restrict,
    driver_code varchar(100) unique not null,
    work_status varchar(30) not null default 'OFF'
        check (work_status in ('OFF', 'WORKING', 'BREAK')),
    latitude numeric(10,7),
    longitude numeric(10,7),
    location_updated_at timestamptz,
    last_access_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 오더
create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    order_number varchar(50) unique not null,
    registered_by uuid references users(id) on delete set null,
    product_name varchar(255) not null,
    dispatch_type varchar(30) not null
        check (dispatch_type in ('DESIGNATED', 'FIRST_COME')),
    assigned_driver_id uuid references drivers(id) on delete set null,
    order_status varchar(30) not null default 'PENDING'
        check (order_status in (
            'PENDING',
            'DISPATCHING',
            'ASSIGNED',
            'ACCEPTED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
        )),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    cancelled_at timestamptz
);

-- 배송 경로
create table if not exists order_routes (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id) on delete cascade,
    sequence integer not null,
    address text not null,
    latitude numeric(10,7),
    longitude numeric(10,7),
    route_status varchar(30) not null default 'UNKNOWN'
        check (route_status in (
            'UNKNOWN',
            'NOT_PICKED_UP',
            'PICKED_UP',
            'IN_DELIVERY',
            'DELIVERED'
        )),
    picked_up_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(order_id, sequence)
);

-- 오더 사진
create table if not exists order_photos (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id) on delete cascade,
    route_id uuid references order_routes(id) on delete set null,
    storage_path text not null,
    file_name varchar(255),
    photo_type varchar(30) not null default 'ORDER',
    created_by uuid references users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 배차 이력
create table if not exists order_assignments (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id) on delete cascade,
    driver_id uuid not null references drivers(id) on delete restrict,
    assignment_type varchar(30) not null
        check (assignment_type in ('DESIGNATED', 'FIRST_COME', 'REDISPATCH')),
    status varchar(30) not null default 'PENDING'
        check (status in (
            'PENDING',
            'ACCEPTED',
            'REJECTED',
            'CANCELLED',
            'EXPIRED'
        )),
    assigned_at timestamptz not null default now(),
    responded_at timestamptz,
    rejected_at timestamptz,
    rejection_reason text
);

-- 오더 수정/처리 이력
create table if not exists order_history (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id) on delete cascade,
    user_id uuid references users(id) on delete set null,
    action varchar(50) not null,
    before_data jsonb,
    after_data jsonb,
    created_at timestamptz not null default now()
);

-- 알림
create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    order_id uuid references orders(id) on delete cascade,
    notification_type varchar(50) not null,
    title varchar(255) not null,
    message text,
    is_read boolean not null default false,
    created_at timestamptz not null default now(),
    read_at timestamptz
);

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists drivers_set_updated_at on drivers;
create trigger drivers_set_updated_at
before update on drivers
for each row execute function set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

drop trigger if exists order_routes_set_updated_at on order_routes;
create trigger order_routes_set_updated_at
before update on order_routes
for each row execute function set_updated_at();

-- 인덱스
create index if not exists idx_orders_created_at
    on orders(created_at desc);

create index if not exists idx_orders_status
    on orders(order_status);

create index if not exists idx_orders_driver
    on orders(assigned_driver_id);

create index if not exists idx_orders_registered_by
    on orders(registered_by);

create index if not exists idx_order_routes_order
    on order_routes(order_id, sequence);

create index if not exists idx_order_photos_order
    on order_photos(order_id);

create index if not exists idx_order_assignments_order
    on order_assignments(order_id);

create index if not exists idx_order_assignments_driver
    on order_assignments(driver_id);

create index if not exists idx_order_history_order
    on order_history(order_id, created_at desc);

create index if not exists idx_notifications_user
    on notifications(user_id, created_at desc);

create index if not exists idx_drivers_work_status
    on drivers(work_status);
