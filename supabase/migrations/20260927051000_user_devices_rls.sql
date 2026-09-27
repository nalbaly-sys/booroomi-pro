create policy "user_devices_select_own"
on public.user_devices
for select
to authenticated
using (
    user_id = private.current_user_id()
);

create policy "user_devices_insert_own"
on public.user_devices
for insert
to authenticated
with check (
    user_id = private.current_user_id()
);

create policy "user_devices_update_own"
on public.user_devices
for update
to authenticated
using (
    user_id = private.current_user_id()
)
with check (
    user_id = private.current_user_id()
);
