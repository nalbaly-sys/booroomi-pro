import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOOTSTRAP_SECRET = Deno.env.get("BOOTSTRAP_SECRET")!;

Deno.serve(async (req) => {
  try {
    const providedSecret = req.headers.get("x-bootstrap-secret");

    if (!providedSecret || providedSecret !== BOOTSTRAP_SECRET) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { count, error: countError } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "MASTER");

    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "MASTER already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();

    if (!body.password || typeof body.password !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Password is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (body.password.length < 8) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Password must be at least 8 characters",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const internalEmail = `admin@auth.booroomi.internal`;

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        login_id: "admin",
        name: "admin",
        role: "MASTER",
      },
    });

    if (authError || !authUser.user) {
      throw authError ?? new Error("Auth user creation failed");
    }

    const { error: userError } = await admin
      .from("users")
      .insert({
        auth_user_id: authUser.user.id,
        login_id: "admin",
        name: "admin",
        role: "MASTER",
        is_active: true,
      });

    if (userError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      throw userError;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "MASTER account created",
        login_id: "admin",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
