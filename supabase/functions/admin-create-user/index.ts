import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type CreateUserRequest = {
  login_id?: string;
  password?: string;
  name?: string;
  phone?: string;
  role?: "MASTER" | "DRIVER";
};

const adminClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function getCurrentUser(req: Request) {
  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return null;
  }

  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return null;
  }

  const { data, error } =
    await adminClient.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function getCurrentProfile(authUserId: string) {
  const { data, error } = await adminClient
    .from("users")
    .select(
      "id, auth_user_id, login_id, name, phone, role, is_active",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function makeInternalEmail(loginId: string) {
  return `${loginId.trim().toLowerCase()}@auth.booroomi.internal`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          ok: false,
          error: "POST method is required.",
        },
        405,
      );
    }

    /*
     * ==========================================
     * 1. 현재 로그인 사용자 확인
     * ==========================================
     */
    const currentAuthUser =
      await getCurrentUser(req);

    if (!currentAuthUser) {
      return jsonResponse(
        {
          ok: false,
          error: "로그인이 필요합니다.",
        },
        401,
      );
    }

    /*
     * ==========================================
     * 2. 현재 사용자의 users 프로필 확인
     * ==========================================
     */
    const currentProfile =
      await getCurrentProfile(
        currentAuthUser.id,
      );

    if (!currentProfile) {
      return jsonResponse(
        {
          ok: false,
          error: "사용자 프로필을 찾을 수 없습니다.",
        },
        403,
      );
    }

    /*
     * ==========================================
     * 3. ADMIN 권한 확인
     *
     * DB role:
     * MASTER = ADMIN 화면
     * SUBMASTER = MASTER 화면
     * DRIVER = 기사
     * ==========================================
     */
    if (
      currentProfile.role !== "MASTER" ||
      !currentProfile.is_active
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "ADMIN 권한이 없습니다.",
        },
        403,
      );
    }

    /*
     * ==========================================
     * 4. 요청 데이터
     * ==========================================
     */
    const body =
      (await req.json()) as CreateUserRequest;

    const loginId =
      String(body.login_id ?? "").trim();

    const password =
      String(body.password ?? "");

    const name =
      String(body.name ?? "").trim();

    const phone =
      String(body.phone ?? "").trim();

    const role =
      body.role;

    /*
     * ==========================================
     * 5. 기본 검증
     * ==========================================
     */
    if (!loginId) {
      return jsonResponse(
        {
          ok: false,
          error: "로그인 ID를 입력해주세요.",
        },
        400,
      );
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(loginId)) {
      return jsonResponse(
        {
          ok: false,
          error:
            "로그인 ID는 영문, 숫자, ., _, -만 사용할 수 있습니다.",
        },
        400,
      );
    }

    if (loginId.length < 3 || loginId.length > 30) {
      return jsonResponse(
        {
          ok: false,
          error:
            "로그인 ID는 3~30자로 입력해주세요.",
        },
        400,
      );
    }

    if (!password) {
      return jsonResponse(
        {
          ok: false,
          error: "비밀번호를 입력해주세요.",
        },
        400,
      );
    }

    if (password.length < 8) {
      return jsonResponse(
        {
          ok: false,
          error:
            "비밀번호는 8자 이상이어야 합니다.",
        },
        400,
      );
    }

    if (!name) {
      return jsonResponse(
        {
          ok: false,
          error: "이름을 입력해주세요.",
        },
        400,
      );
    }

    if (
      role !== "MASTER" &&
      role !== "DRIVER"
    ) {
      return jsonResponse(
        {
          ok: false,
          error:
            "생성할 계정 권한이 올바르지 않습니다.",
        },
        400,
      );
    }

    /*
     * ==========================================
     * 6. login_id 중복 확인
     * ==========================================
     */
    const { data: existingUser, error: existingError } =
      await adminClient
        .from("users")
        .select("id, login_id, is_active")
        .ilike("login_id", loginId)
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingUser) {
      return jsonResponse(
        {
          ok: false,
          error:
            "이미 사용 중인 로그인 ID입니다.",
        },
        409,
      );
    }

    /*
     * ==========================================
     * 7. MASTER 계정 생성 제한
     *
     * ADMIN(MASTER)은 MASTER 계정을 만들 수 있지만
     * 동일 ID는 위에서 차단한다.
     *
     * 현재 로그인한 최초 ADMIN 계정 자체는
     * 삭제/변경하지 않는다.
     * ==========================================
     */
    const internalEmail =
      makeInternalEmail(loginId);

    /*
     * ==========================================
     * 8. Supabase Auth 사용자 생성
     * ==========================================
     */
    const {
      data: authData,
      error: authError,
    } =
      await adminClient.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          login_id: loginId,
          name,
          phone: phone || null,
          role,
        },
      });

    if (
      authError ||
      !authData.user
    ) {
      throw (
        authError ??
        new Error(
          "Auth 사용자 생성에 실패했습니다.",
        )
      );
    }

    const authUser =
      authData.user;

    /*
     * ==========================================
     * 9. users 테이블 생성
     * ==========================================
     */
    const { data: newUser, error: userError } =
      await adminClient
        .from("users")
        .insert({
          auth_user_id: authUser.id,
          login_id: loginId,
          name,
          phone: phone || null,
          role,
          is_active: true,
        })
        .select(
          "id, auth_user_id, login_id, name, phone, role, is_active, created_at",
        )
        .single();

    /*
     * ==========================================
     * 10. users 저장 실패 시 Auth 사용자 롤백
     * ==========================================
     */
    if (userError) {
      await adminClient.auth.admin.deleteUser(
        authUser.id,
      );

      throw userError;
    }

    /*
     * ==========================================
     * 11. DRIVER인 경우 drivers 레코드 생성
     * ==========================================
     */
    if (role === "DRIVER") {
      const driverCode = loginId;

      const {
        data: existingDriver,
        error: driverCheckError,
      } = await adminClient
        .from("drivers")
        .select("id")
        .eq("driver_code", driverCode)
        .maybeSingle();

      if (driverCheckError) {
        await adminClient
          .from("users")
          .delete()
          .eq("id", newUser.id);

        await adminClient.auth.admin.deleteUser(
          authUser.id,
        );

        throw driverCheckError;
      }

      if (existingDriver) {
        await adminClient
          .from("users")
          .delete()
          .eq("id", newUser.id);

        await adminClient.auth.admin.deleteUser(
          authUser.id,
        );

        return jsonResponse(
          {
            ok: false,
            error:
              "이미 사용 중인 기사 ID입니다.",
          },
          409,
        );
      }

      const {
        error: driverInsertError,
      } = await adminClient
        .from("drivers")
        .insert({
          user_id: newUser.id,
          driver_code: driverCode,
          work_status: "퇴근함",
        });

      if (driverInsertError) {
        await adminClient
          .from("users")
          .delete()
          .eq("id", newUser.id);

        await adminClient.auth.admin.deleteUser(
          authUser.id,
        );

        throw driverInsertError;
      }
    }

    /*
     * ==========================================
     * 12. 성공
     * ==========================================
     */
    return jsonResponse(
      {
        ok: true,
        message:
          role === "MASTER"
            ? "MASTER 계정이 생성되었습니다."
            : "기사 계정이 생성되었습니다.",
        user: newUser,
      },
      201,
    );
  } catch (error) {
    console.error(error);

    return jsonResponse(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "계정 생성 중 오류가 발생했습니다.",
      },
      500,
    );
  }
});