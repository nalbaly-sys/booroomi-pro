create unique index if not exists users_login_id_unique
on public.users (lower(login_id));
