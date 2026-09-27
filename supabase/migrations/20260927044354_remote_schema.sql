drop extension if exists "pg_net";

revoke delete on table "public"."driver_locations" from "anon";

revoke insert on table "public"."driver_locations" from "anon";

revoke references on table "public"."driver_locations" from "anon";

revoke select on table "public"."driver_locations" from "anon";

revoke trigger on table "public"."driver_locations" from "anon";

revoke truncate on table "public"."driver_locations" from "anon";

revoke update on table "public"."driver_locations" from "anon";

revoke delete on table "public"."drivers" from "anon";

revoke insert on table "public"."drivers" from "anon";

revoke references on table "public"."drivers" from "anon";

revoke select on table "public"."drivers" from "anon";

revoke trigger on table "public"."drivers" from "anon";

revoke truncate on table "public"."drivers" from "anon";

revoke update on table "public"."drivers" from "anon";

revoke delete on table "public"."notifications" from "anon";

revoke insert on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke select on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."order_assignments" from "anon";

revoke insert on table "public"."order_assignments" from "anon";

revoke references on table "public"."order_assignments" from "anon";

revoke select on table "public"."order_assignments" from "anon";

revoke trigger on table "public"."order_assignments" from "anon";

revoke truncate on table "public"."order_assignments" from "anon";

revoke update on table "public"."order_assignments" from "anon";

revoke delete on table "public"."order_history" from "anon";

revoke insert on table "public"."order_history" from "anon";

revoke references on table "public"."order_history" from "anon";

revoke select on table "public"."order_history" from "anon";

revoke trigger on table "public"."order_history" from "anon";

revoke truncate on table "public"."order_history" from "anon";

revoke update on table "public"."order_history" from "anon";

revoke delete on table "public"."order_photos" from "anon";

revoke insert on table "public"."order_photos" from "anon";

revoke references on table "public"."order_photos" from "anon";

revoke select on table "public"."order_photos" from "anon";

revoke trigger on table "public"."order_photos" from "anon";

revoke truncate on table "public"."order_photos" from "anon";

revoke update on table "public"."order_photos" from "anon";

revoke delete on table "public"."order_routes" from "anon";

revoke insert on table "public"."order_routes" from "anon";

revoke references on table "public"."order_routes" from "anon";

revoke select on table "public"."order_routes" from "anon";

revoke trigger on table "public"."order_routes" from "anon";

revoke truncate on table "public"."order_routes" from "anon";

revoke update on table "public"."order_routes" from "anon";

revoke delete on table "public"."orders" from "anon";

revoke insert on table "public"."orders" from "anon";

revoke references on table "public"."orders" from "anon";

revoke select on table "public"."orders" from "anon";

revoke trigger on table "public"."orders" from "anon";

revoke truncate on table "public"."orders" from "anon";

revoke update on table "public"."orders" from "anon";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

alter table "public"."drivers" drop constraint "drivers_work_status_check";

alter table "public"."order_assignments" drop constraint "order_assignments_assignment_type_check";

alter table "public"."order_assignments" drop constraint "order_assignments_status_check";

alter table "public"."order_routes" drop constraint "order_routes_route_status_check";

alter table "public"."orders" drop constraint "orders_dispatch_type_check";

alter table "public"."orders" drop constraint "orders_order_status_check";

alter table "public"."users" drop constraint "users_role_check";

alter table "public"."drivers" add constraint "drivers_work_status_check" CHECK (((work_status)::text = ANY ((ARRAY['OFF'::character varying, 'WORKING'::character varying, 'BREAK'::character varying])::text[]))) not valid;

alter table "public"."drivers" validate constraint "drivers_work_status_check";

alter table "public"."order_assignments" add constraint "order_assignments_assignment_type_check" CHECK (((assignment_type)::text = ANY ((ARRAY['DESIGNATED'::character varying, 'FIRST_COME'::character varying, 'REDISPATCH'::character varying])::text[]))) not valid;

alter table "public"."order_assignments" validate constraint "order_assignments_assignment_type_check";

alter table "public"."order_assignments" add constraint "order_assignments_status_check" CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying, 'EXPIRED'::character varying])::text[]))) not valid;

alter table "public"."order_assignments" validate constraint "order_assignments_status_check";

alter table "public"."order_routes" add constraint "order_routes_route_status_check" CHECK (((route_status)::text = ANY ((ARRAY['UNKNOWN'::character varying, 'NOT_PICKED_UP'::character varying, 'PICKED_UP'::character varying, 'IN_DELIVERY'::character varying, 'DELIVERED'::character varying])::text[]))) not valid;

alter table "public"."order_routes" validate constraint "order_routes_route_status_check";

alter table "public"."orders" add constraint "orders_dispatch_type_check" CHECK (((dispatch_type)::text = ANY ((ARRAY['DESIGNATED'::character varying, 'FIRST_COME'::character varying])::text[]))) not valid;

alter table "public"."orders" validate constraint "orders_dispatch_type_check";

alter table "public"."orders" add constraint "orders_order_status_check" CHECK (((order_status)::text = ANY ((ARRAY['PENDING'::character varying, 'DISPATCHING'::character varying, 'ASSIGNED'::character varying, 'ACCEPTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))) not valid;

alter table "public"."orders" validate constraint "orders_order_status_check";

alter table "public"."users" add constraint "users_role_check" CHECK (((role)::text = ANY ((ARRAY['MASTER'::character varying, 'SUBMASTER'::character varying, 'DRIVER'::character varying])::text[]))) not valid;

alter table "public"."users" validate constraint "users_role_check";


