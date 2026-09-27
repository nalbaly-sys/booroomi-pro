


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."current_driver_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
    select id
    from public.drivers
    where user_id = private.current_user_id()
    limit 1;
$$;


ALTER FUNCTION "private"."current_driver_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
    select id
    from public.users
    where auth_user_id = auth.uid()
      and is_active = true
    limit 1;
$$;


ALTER FUNCTION "private"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
    select role
    from public.users
    where auth_user_id = auth.uid()
      and is_active = true
    limit 1;
$$;


ALTER FUNCTION "private"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_control_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
    select coalesce(
        private.current_user_role() in ('master', 'submaster'),
        false
    );
$$;


ALTER FUNCTION "private"."is_control_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_master"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
    select coalesce(
        private.current_user_role() = 'master',
        false
    );
$$;


ALTER FUNCTION "private"."is_master"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_submaster"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
    select coalesce(
        private.current_user_role() = 'submaster',
        false
    );
$$;


ALTER FUNCTION "private"."is_submaster"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."driver_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "location_updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."driver_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."driver_locations" IS '기사 GPS 위치정보. Master와 해당 Driver만 접근 가능';



COMMENT ON COLUMN "public"."driver_locations"."latitude" IS '기사 현재 위도';



COMMENT ON COLUMN "public"."driver_locations"."longitude" IS '기사 현재 경도';



COMMENT ON COLUMN "public"."driver_locations"."location_updated_at" IS '기사 GPS 마지막 갱신시간';



CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "driver_code" character varying(100) NOT NULL,
    "work_status" character varying(30) DEFAULT 'OFF'::character varying NOT NULL,
    "last_access_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "drivers_work_status_check" CHECK ((("work_status")::"text" = ANY ((ARRAY['OFF'::character varying, 'WORKING'::character varying, 'BREAK'::character varying])::"text"[])))
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "order_id" "uuid",
    "notification_type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assignment_type" character varying(30) NOT NULL,
    "status" character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text",
    CONSTRAINT "order_assignments_assignment_type_check" CHECK ((("assignment_type")::"text" = ANY ((ARRAY['DESIGNATED'::character varying, 'FIRST_COME'::character varying, 'REDISPATCH'::character varying])::"text"[]))),
    CONSTRAINT "order_assignments_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying, 'EXPIRED'::character varying])::"text"[])))
);


ALTER TABLE "public"."order_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" character varying(50) NOT NULL,
    "before_data" "jsonb",
    "after_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "route_id" "uuid",
    "storage_path" "text" NOT NULL,
    "file_name" character varying(255),
    "photo_type" character varying(30) DEFAULT 'ORDER'::character varying NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "sequence" integer NOT NULL,
    "address" "text" NOT NULL,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "route_status" character varying(30) DEFAULT 'UNKNOWN'::character varying NOT NULL,
    "picked_up_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_routes_route_status_check" CHECK ((("route_status")::"text" = ANY ((ARRAY['UNKNOWN'::character varying, 'NOT_PICKED_UP'::character varying, 'PICKED_UP'::character varying, 'IN_DELIVERY'::character varying, 'DELIVERED'::character varying])::"text"[])))
);


ALTER TABLE "public"."order_routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "registered_by" "uuid",
    "delegated_to_user_id" "uuid",
    "product_name" character varying(255) NOT NULL,
    "dispatch_type" character varying(30) NOT NULL,
    "assigned_driver_id" "uuid",
    "order_status" character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "orders_dispatch_type_check" CHECK ((("dispatch_type")::"text" = ANY ((ARRAY['DESIGNATED'::character varying, 'FIRST_COME'::character varying])::"text"[]))),
    CONSTRAINT "orders_order_status_check" CHECK ((("order_status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'DISPATCHING'::character varying, 'ASSIGNED'::character varying, 'ACCEPTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "login_id" character varying(100) NOT NULL,
    "name" character varying(100) NOT NULL,
    "phone" character varying(30),
    "role" character varying(20) DEFAULT 'DRIVER'::character varying NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['MASTER'::character varying, 'SUBMASTER'::character varying, 'DRIVER'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."driver_locations"
    ADD CONSTRAINT "driver_locations_driver_id_key" UNIQUE ("driver_id");



ALTER TABLE ONLY "public"."driver_locations"
    ADD CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_driver_code_key" UNIQUE ("driver_code");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_history"
    ADD CONSTRAINT "order_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_photos"
    ADD CONSTRAINT "order_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_routes"
    ADD CONSTRAINT "order_routes_order_id_sequence_key" UNIQUE ("order_id", "sequence");



ALTER TABLE ONLY "public"."order_routes"
    ADD CONSTRAINT "order_routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_login_id_key" UNIQUE ("login_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_driver_locations_driver_id" ON "public"."driver_locations" USING "btree" ("driver_id");



CREATE INDEX "idx_driver_locations_updated" ON "public"."driver_locations" USING "btree" ("location_updated_at");



CREATE INDEX "idx_drivers_work_status" ON "public"."drivers" USING "btree" ("work_status");



CREATE INDEX "idx_notifications_order" ON "public"."notifications" USING "btree" ("order_id");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_order_assignments_assigned_by" ON "public"."order_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_order_assignments_driver" ON "public"."order_assignments" USING "btree" ("driver_id");



CREATE INDEX "idx_order_assignments_order" ON "public"."order_assignments" USING "btree" ("order_id");



CREATE INDEX "idx_order_history_order" ON "public"."order_history" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_order_history_user" ON "public"."order_history" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_order_photos_order" ON "public"."order_photos" USING "btree" ("order_id");



CREATE INDEX "idx_order_photos_route" ON "public"."order_photos" USING "btree" ("route_id");



CREATE INDEX "idx_order_routes_order" ON "public"."order_routes" USING "btree" ("order_id", "sequence");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_delegated_to" ON "public"."orders" USING "btree" ("delegated_to_user_id");



CREATE INDEX "idx_orders_driver" ON "public"."orders" USING "btree" ("assigned_driver_id");



CREATE INDEX "idx_orders_registered_by" ON "public"."orders" USING "btree" ("registered_by");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("order_status");



CREATE INDEX "idx_users_auth_user_id" ON "public"."users" USING "btree" ("auth_user_id");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "drivers_set_updated_at" BEFORE UPDATE ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "order_routes_set_updated_at" BEFORE UPDATE ON "public"."order_routes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_driver_locations_updated_at" BEFORE UPDATE ON "public"."driver_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."driver_locations"
    ADD CONSTRAINT "driver_locations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_assignments"
    ADD CONSTRAINT "order_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_history"
    ADD CONSTRAINT "order_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_history"
    ADD CONSTRAINT "order_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_photos"
    ADD CONSTRAINT "order_photos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_photos"
    ADD CONSTRAINT "order_photos_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_photos"
    ADD CONSTRAINT "order_photos_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."order_routes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_routes"
    ADD CONSTRAINT "order_routes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_assigned_driver_id_fkey" FOREIGN KEY ("assigned_driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_delegated_to_user_id_fkey" FOREIGN KEY ("delegated_to_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."driver_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "driver_locations_delete_policy" ON "public"."driver_locations" FOR DELETE TO "authenticated" USING ("private"."is_master"());



CREATE POLICY "driver_locations_insert_policy" ON "public"."driver_locations" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_master"() OR ("driver_id" = "private"."current_driver_id"())));



CREATE POLICY "driver_locations_select_policy" ON "public"."driver_locations" FOR SELECT TO "authenticated" USING (("private"."is_master"() OR ("driver_id" = "private"."current_driver_id"())));



CREATE POLICY "driver_locations_update_policy" ON "public"."driver_locations" FOR UPDATE TO "authenticated" USING (("private"."is_master"() OR ("driver_id" = "private"."current_driver_id"()))) WITH CHECK (("private"."is_master"() OR ("driver_id" = "private"."current_driver_id"())));



ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "drivers_delete_policy" ON "public"."drivers" FOR DELETE TO "authenticated" USING ("private"."is_master"());



CREATE POLICY "drivers_insert_policy" ON "public"."drivers" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_master"());



CREATE POLICY "drivers_select_policy" ON "public"."drivers" FOR SELECT TO "authenticated" USING (("private"."is_master"() OR "private"."is_submaster"() OR ("user_id" = "private"."current_user_id"())));



CREATE POLICY "drivers_update_policy" ON "public"."drivers" FOR UPDATE TO "authenticated" USING (("private"."is_master"() OR ("user_id" = "private"."current_user_id"()))) WITH CHECK (("private"."is_master"() OR ("user_id" = "private"."current_user_id"())));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_policy" ON "public"."notifications" FOR DELETE TO "authenticated" USING ("private"."is_master"());



CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_control_user"() OR ("user_id" = "private"."current_user_id"())));



CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("user_id" = "private"."current_user_id"()) OR "private"."is_master"()));



CREATE POLICY "notifications_update_policy" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("user_id" = "private"."current_user_id"()) OR "private"."is_master"())) WITH CHECK ((("user_id" = "private"."current_user_id"()) OR "private"."is_master"()));



ALTER TABLE "public"."order_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_assignments_delete_policy" ON "public"."order_assignments" FOR DELETE TO "authenticated" USING ("private"."is_master"());



CREATE POLICY "order_assignments_insert_policy" ON "public"."order_assignments" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_control_user"());



CREATE POLICY "order_assignments_select_policy" ON "public"."order_assignments" FOR SELECT TO "authenticated" USING (("private"."is_control_user"() OR ("driver_id" = "private"."current_driver_id"())));



CREATE POLICY "order_assignments_update_policy" ON "public"."order_assignments" FOR UPDATE TO "authenticated" USING (("private"."is_control_user"() OR ("driver_id" = "private"."current_driver_id"()))) WITH CHECK (("private"."is_control_user"() OR ("driver_id" = "private"."current_driver_id"())));



ALTER TABLE "public"."order_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_history_insert_policy" ON "public"."order_history" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_control_user"() OR ("user_id" = "private"."current_user_id"())));



CREATE POLICY "order_history_select_policy" ON "public"."order_history" FOR SELECT TO "authenticated" USING (("private"."is_control_user"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_history"."order_id") AND ("o"."assigned_driver_id" = "private"."current_driver_id"()))))));



ALTER TABLE "public"."order_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_photos_delete_policy" ON "public"."order_photos" FOR DELETE TO "authenticated" USING ("private"."is_control_user"());



CREATE POLICY "order_photos_insert_policy" ON "public"."order_photos" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_control_user"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_photos"."order_id") AND ("o"."assigned_driver_id" = "private"."current_driver_id"()))))));



CREATE POLICY "order_photos_select_policy" ON "public"."order_photos" FOR SELECT TO "authenticated" USING (("private"."is_control_user"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_photos"."order_id") AND ("o"."assigned_driver_id" = "private"."current_driver_id"()))))));



CREATE POLICY "order_photos_update_policy" ON "public"."order_photos" FOR UPDATE TO "authenticated" USING ("private"."is_control_user"()) WITH CHECK ("private"."is_control_user"());



ALTER TABLE "public"."order_routes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_routes_delete_policy" ON "public"."order_routes" FOR DELETE TO "authenticated" USING ("private"."is_control_user"());



CREATE POLICY "order_routes_insert_policy" ON "public"."order_routes" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_control_user"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_routes"."order_id") AND ("o"."assigned_driver_id" = "private"."current_driver_id"()))))));



CREATE POLICY "order_routes_select_policy" ON "public"."order_routes" FOR SELECT TO "authenticated" USING (("private"."is_control_user"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_routes"."order_id") AND ("o"."assigned_driver_id" = "private"."current_driver_id"()))))));



CREATE POLICY "order_routes_update_policy" ON "public"."order_routes" FOR UPDATE TO "authenticated" USING (("private"."is_control_user"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_routes"."order_id") AND ("o"."assigned_driver_id" = "private"."current_driver_id"())))))) WITH CHECK (("private"."is_control_user"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_routes"."order_id") AND ("o"."assigned_driver_id" = "private"."current_driver_id"()))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_delete_policy" ON "public"."orders" FOR DELETE TO "authenticated" USING ("private"."is_master"());



CREATE POLICY "orders_insert_policy" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_control_user"());



CREATE POLICY "orders_select_policy" ON "public"."orders" FOR SELECT TO "authenticated" USING (("private"."is_control_user"() OR ("assigned_driver_id" = "private"."current_driver_id"())));



CREATE POLICY "orders_update_policy" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("private"."is_control_user"() OR ("assigned_driver_id" = "private"."current_driver_id"()))) WITH CHECK (("private"."is_control_user"() OR ("assigned_driver_id" = "private"."current_driver_id"())));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_policy" ON "public"."users" FOR DELETE TO "authenticated" USING ("private"."is_master"());



CREATE POLICY "users_insert_policy" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_master"());



CREATE POLICY "users_select_policy" ON "public"."users" FOR SELECT TO "authenticated" USING (("private"."is_master"() OR ("id" = "private"."current_user_id"())));



CREATE POLICY "users_update_policy" ON "public"."users" FOR UPDATE TO "authenticated" USING (("private"."is_master"() OR ("id" = "private"."current_user_id"()))) WITH CHECK (("private"."is_master"() OR ("id" = "private"."current_user_id"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "private"."current_driver_id"() TO "authenticated";



GRANT ALL ON FUNCTION "private"."current_user_id"() TO "authenticated";



GRANT ALL ON FUNCTION "private"."current_user_role"() TO "authenticated";



GRANT ALL ON FUNCTION "private"."is_control_user"() TO "authenticated";



GRANT ALL ON FUNCTION "private"."is_master"() TO "authenticated";



GRANT ALL ON FUNCTION "private"."is_submaster"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."driver_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_locations" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."order_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."order_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_history" TO "service_role";



GRANT ALL ON TABLE "public"."order_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."order_photos" TO "service_role";



GRANT ALL ON TABLE "public"."order_routes" TO "authenticated";
GRANT ALL ON TABLE "public"."order_routes" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































