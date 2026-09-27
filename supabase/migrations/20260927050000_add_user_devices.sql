create table if not exists public.user_devices (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    device_id text not null,
    push_token text,
    platform text not null default 'web',
    is_active boolean not null default true,
    logged_out_at timestamptz,
    last_seen_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(user_id, device_id)
);

create index if not exists idx_user_devices_user_id
on public.user_devices(user_id);

create index if not exists idx_user_devices_active
on public.user_devices(user_id, is_active);

alter table public.user_devices enable row level security;

create or replace function public.set_user_devices_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_user_devices_updated_at
on public.user_devices;

create trigger trg_user_devices_updated_at
before update on public.user_devices
for each row
execute function public.set_user_devices_updated_at();
