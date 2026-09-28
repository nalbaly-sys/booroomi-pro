import { FormEvent, KeyboardEvent, useState } from "react";
import {
  loginWithLoginId,
  logout,
  supabase,
  SUPABASE_URL,
} from "./lib/auth/auth";

type Tab = "drivers" | "orders" | "register";

type Profile = {
  id: string;
  auth_user_id: string;
  login_id: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
};

type AccountManagerTab = "master" | "driver";

type AccountUser = {
  id: string;
  auth_user_id: string;
  login_id: string;
  name: string;
  phone: string | null;
  role: "MASTER" | "DRIVER";
  is_active: boolean;
};

type AccountForm = {
  loginId: string;
  password: string;
  name: string;
  phone: string;
};

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] =
    useState<Tab>("drivers");

  const [productName, setProductName] =
    useState("꽃배달");

  const [routeInput, setRouteInput] =
    useState("");

  const [routes, setRoutes] =
    useState<string[]>([]);

  const [accountManagerOpen, setAccountManagerOpen] =
    useState(false);

  const [accountManagerTab, setAccountManagerTab] =
    useState<AccountManagerTab>("master");

  const [accountUsers, setAccountUsers] =
    useState<AccountUser[]>([]);

  const [accountLoading, setAccountLoading] =
    useState(false);

  const [accountError, setAccountError] =
    useState("");

  const [accountFormOpen, setAccountFormOpen] =
    useState(false);

  const [accountForm, setAccountForm] =
    useState<AccountForm>({
      loginId: "",
      password: "",
      name: "",
      phone: "",
    });

  const [accountSaving, setAccountSaving] =
    useState(false);

  const [accountSaveMessage, setAccountSaveMessage] =
    useState("");

  // ==================================================
  // 배송 경로
  // ==================================================

  function addRoute() {
    const value = routeInput.trim();

    if (!value) return;

    setRoutes((current) => [
      ...current,
      value,
    ]);

    setRouteInput("");
  }

  function removeRoute(index: number) {
    setRoutes((current) =>
      current.filter(
        (_, i) => i !== index,
      ),
    );
  }

  function handleRouteKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addRoute();
    }
  }

  // ==================================================
  // 로그인
  // ==================================================

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!loginId.trim() || !password) {
      setLoginError(
        "관리자 ID와 비밀번호를 입력해주세요.",
      );
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const result =
        await loginWithLoginId(
          loginId,
          password,
        );

      if (result.profile.role !== "MASTER") {
        await logout();

        throw new Error(
          "ADMIN 권한이 없는 계정입니다.",
        );
      }

      setProfile(
        result.profile as Profile,
      );

      setPassword("");
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "로그인 중 오류가 발생했습니다.",
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // ==================================================
  // 로그아웃
  // ==================================================

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // 로그인 화면으로 이동
    }

    setProfile(null);
    setLoginId("");
    setPassword("");
    setLoginError("");
    setAccountManagerOpen(false);
    setAccountFormOpen(false);
  }

  // ==================================================
  // 계정 목록 조회
  // ==================================================

  async function loadAccountUsers() {
    setAccountLoading(true);
    setAccountError("");

    try {
      const {
        data,
        error,
      } = await supabase
        .from("users")
        .select(
          "id, auth_user_id, login_id, name, phone, role, is_active",
        )
        .in("role", [
          "MASTER",
          "DRIVER",
        ])
        .order("role", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setAccountUsers(
        (data || []) as AccountUser[],
      );
    } catch (error) {
      console.error(
        "계정 목록 조회 오류:",
        error,
      );

      setAccountError(
        error instanceof Error
          ? error.message
          : "계정 목록을 불러오지 못했습니다.",
      );
    } finally {
      setAccountLoading(false);
    }
  }

  // ==================================================
  // 계정관리 열기
  // ==================================================

  function openAccountManager(
    tab: AccountManagerTab,
  ) {
    setAccountManagerTab(tab);
    setAccountManagerOpen(true);
    setAccountError("");
    setAccountSaveMessage("");
    setAccountFormOpen(false);

    loadAccountUsers();
  }

  // ==================================================
  // 계정관리 닫기
  // ==================================================

  function closeAccountManager() {
    setAccountManagerOpen(false);
    setAccountFormOpen(false);
    setAccountError("");
    setAccountSaveMessage("");
  }

  // ==================================================
  // 계정 생성 폼 열기
  // ==================================================

  function openAccountForm() {
    setAccountForm({
      loginId: "",
      password: "",
      name: "",
      phone: "",
    });

    setAccountSaveMessage("");
    setAccountError("");
    setAccountFormOpen(true);
  }

  // ==================================================
  // 계정 생성 폼 닫기
  // ==================================================

  function closeAccountForm() {
    if (accountSaving) return;

    setAccountFormOpen(false);

    setAccountForm({
      loginId: "",
      password: "",
      name: "",
      phone: "",
    });
  }

  // ==================================================
  // 계정 생성
  // ==================================================

  async function createAccount() {
    const loginIdValue =
      accountForm.loginId.trim();

    const passwordValue =
      accountForm.password;

    const nameValue =
      accountForm.name.trim();

    const phoneValue =
      accountForm.phone.trim();

    if (!loginIdValue) {
      setAccountError(
        "로그인 ID를 입력해주세요.",
      );
      return;
    }

    if (!passwordValue) {
      setAccountError(
        "비밀번호를 입력해주세요.",
      );
      return;
    }

    if (passwordValue.length < 6) {
      setAccountError(
        "비밀번호는 6자 이상 입력해주세요.",
      );
      return;
    }

    if (!nameValue) {
      setAccountError(
        "이름을 입력해주세요.",
      );
      return;
    }

    setAccountSaving(true);
    setAccountError("");
    setAccountSaveMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          "로그인 세션이 없습니다. 다시 로그인해주세요.",
        );
      }

      const role =
        accountManagerTab === "master"
          ? "MASTER"
          : "DRIVER";

      const response =
        await fetch(
          `${SUPABASE_URL}/functions/v1/admin-create-user`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,
            },

            body: JSON.stringify({
              login_id: loginIdValue,
              password: passwordValue,
              name: nameValue,
              phone:
                phoneValue || null,
              role,
            }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            result.error ||
            "계정 생성에 실패했습니다.",
        );
      }

      setAccountSaveMessage(
        role === "MASTER"
          ? "MASTER 계정이 생성되었습니다."
          : "기사 계정이 생성되었습니다.",
      );

      setAccountFormOpen(false);

      setAccountForm({
        loginId: "",
        password: "",
        name: "",
        phone: "",
      });

      await loadAccountUsers();
    } catch (error) {
      console.error(
        "계정 생성 오류:",
        error,
      );

      setAccountError(
        error instanceof Error
          ? error.message
          : "계정 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setAccountSaving(false);
    }
  }

  // ==================================================
  // 현재 탭의 계정만 표시
  // ==================================================

  const visibleAccountUsers =
    accountUsers.filter(
      (user) =>
        user.role ===
        (accountManagerTab === "master"
          ? "MASTER"
          : "DRIVER"),
    );

  // ==================================================
  // 로그인 화면
  // ==================================================

  if (!profile) {
    return (
      <div className="login-overlay">
        <form
          className="login-card"
          onSubmit={handleLogin}
        >
          <div className="login-head">
            <div className="login-crown">
              👑
            </div>

            <div className="login-title">
              꽃배달 종합 관제 시스템
            </div>

            <div className="login-subtitle">
              ADMIN 관리자 로그인
            </div>
          </div>

          <div className="login-body">
            <div className="login-field">
              <label htmlFor="loginId">
                관리자 ID
              </label>

              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(event) =>
                  setLoginId(
                    event.target.value,
                  )
                }
                placeholder="관리자 ID"
                autoComplete="username"
                disabled={loginLoading}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">
                비밀번호
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="비밀번호"
                autoComplete="current-password"
                disabled={loginLoading}
              />
            </div>

            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loginLoading}
            >
              {loginLoading
                ? "로그인 중..."
                : "로그인"}
            </button>

            {loginLoading && (
              <div className="login-loading">
                사용자 정보를 확인하고
                있습니다.
              </div>
            )}
          </div>
        </form>
      </div>
    );
  }

  // ==================================================
  // ADMIN 화면
  // ==================================================

  return (
    <div className="app">

      {/* HEADER */}
      <header id="header">
        <div>
          👑 꽃배달 실시간 종합 관제 센터
        </div>

        <span>
          [최고 관리자 ADMIN 권한 모드]
        </span>
      </header>

      {/* ADMIN CONTROL BAR */}
      <div className="control-bar">
        <div className="control-user">
          👑{" "}
          <b>
            {profile.name ||
              profile.login_id}
          </b>

          <span>[ADMIN]</span>
        </div>

        <div
          className="control-actions"
          style={{
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            title="전체 새로고침"
            onClick={() =>
              window.location.reload()
            }
          >
            🔄
          </button>

          <button
            type="button"
            title="알림 설정"
            onClick={() =>
              alert(
                "알림 설정 기능은 다음 단계에서 연결합니다.",
              )
            }
          >
            🔔
          </button>

          <button
            type="button"
            title="MASTER 계정 관리"
            onClick={() =>
              openAccountManager(
                "master",
              )
            }
            style={{
              border:
                "1px solid #475569",
              background:
                "#1e293b",
              color: "#fff",
              padding:
                "8px 12px",
              borderRadius:
                "7px",
              cursor:
                "pointer",
              fontWeight: 700,
              whiteSpace:
                "nowrap",
            }}
          >
            👥 계정 관리
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            style={{
              whiteSpace:
                "nowrap",
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <section
        className="summary-wrap"
        style={{
          display: "flex",
          gap: "6px",
          padding: "8px",
          background:
            "#0b0f19",
          marginTop: "-4px",
          position:
            "relative",
          zIndex: 2,
          flexWrap:
            "nowrap",
          width: "100%",
          boxSizing:
            "border-box",
          overflow:
            "hidden",
        }}
      >
        {[
          ["📦 오늘오더", "summary-order"],
          ["❌ 거절됨", "summary-reject"],
          ["⏳ 미확인", "summary-uncheck"],
          ["🚚 배송중", "summary-ing"],
          ["✅ 배송완료", "summary-done"],
        ].map(
          ([title, className]) => (
            <div
              key={title}
              className={`summary-card ${className}`}
              style={{
                flex:
                  "1 1 0",
                minWidth: 0,
                width: 0,
                padding:
                  "10px 4px",
                boxSizing:
                  "border-box",
                overflow:
                  "hidden",
              }}
            >
              <div
                className="summary-title"
                style={{
                  whiteSpace:
                    "nowrap",
                  overflow:
                    "hidden",
                  textOverflow:
                    "ellipsis",
                  fontSize:
                    "clamp(9px, 2.5vw, 13px)",
                }}
              >
                {title}
              </div>

              <div
                className="summary-value"
                style={{
                  fontSize:
                    "clamp(16px, 5vw, 26px)",
                  marginTop:
                    "4px",
                }}
              >
                0
              </div>
            </div>
          ),
        )}
      </section>

      {/* MAP */}
      <section className="map-section">
        <div className="map-placeholder">
          <div className="map-icon">
            🗺️
          </div>

          <div className="map-title">
            실시간 기사 위치 관제 지도
          </div>

          <div className="map-description">
            ADMIN 전체 기사 위치 관제 지도
          </div>

          <small
            style={{
              display: "block",
              marginTop: "8px",
              color: "#64748b",
            }}
          >
            Supabase GPS 연결은
            다음 단계에서 진행합니다.
          </small>
        </div>
      </section>

      {/* MAIN */}
      <div className="container">

        {/* TABS */}
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn ${
              activeTab === "drivers"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "drivers",
              )
            }
          >
            🚖 현장기사 출근부
          </button>

          <button
            type="button"
            className={`tab-btn ${
              activeTab === "orders"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "orders",
              )
            }
          >
            📋 종합 오더 현황
          </button>

          <button
            type="button"
            className={`tab-btn ${
              activeTab === "register"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "register",
              )
            }
          >
            ✍️ 신규 오더 배차
          </button>
        </div>

        {/* DRIVER TAB */}
        {activeTab ===
          "drivers" && (
          <section className="tab-content">
            <div className="section-title">
              📊 실시간 현장 기사
              출근 및 위치 현황
            </div>

            <div className="empty-board">
              <div className="empty-icon">
                👨‍🔧
              </div>

              <div>
                현재 표시할
                근무 기사가
                없습니다.
              </div>

              <small>
                기사 출근 상태와
                전체 기사 GPS는
                Supabase 연결 후
                표시됩니다.
              </small>
            </div>
          </section>
        )}

        {/* ORDERS TAB */}
        {activeTab ===
          "orders" && (
          <section className="tab-content">
            <div className="section-title">
              📊 실시간 오더
              관제 현황판

              <span className="section-subtitle">
                10초 자동 갱신
              </span>
            </div>

            <div className="order-tools">
              <div className="date-tools">
                <input type="date" />

                <span>~</span>

                <input type="date" />

                <button type="button">
                  📥 전체 기사 Excel
                </button>
              </div>

              <div className="search-tools">
                <input
                  type="text"
                  placeholder="오더번호 / 상품명 / 경로 / 기사 검색"
                />

                <button type="button">
                  📜 배송완료 내역 조회
                </button>
              </div>
            </div>

            <div className="empty-board">
              <div className="empty-icon">
                📋
              </div>

              <div>
                현재 표시할
                오더가 없습니다.
              </div>

              <small>
                오더 데이터는
                Supabase 연결 후
                표시됩니다.
              </small>
            </div>
          </section>
        )}

        {/* REGISTER TAB */}
        {activeTab ===
          "register" && (
          <section className="tab-content">
            <div className="section-title">
              ✍️ 신규 복합 오더
              발송 등록
            </div>

            <div className="form-box">
              <div className="form-group">
                <label htmlFor="productName">
                  상품명
                </label>

                <input
                  id="productName"
                  className="input-text"
                  value={productName}
                  onChange={(event) =>
                    setProductName(
                      event.target.value,
                    )
                  }
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label>
                  📍 배송 경로
                </label>

                <div className="route-input-container">
                  <input
                    className="input-text"
                    value={routeInput}
                    onChange={(event) =>
                      setRouteInput(
                        event.target.value,
                      )
                    }
                    onKeyDown={
                      handleRouteKeyDown
                    }
                    placeholder="배송지를 입력하세요"
                  />

                  <button
                    type="button"
                    className="btn-add-route"
                    onClick={addRoute}
                  >
                    ➕ 추가
                  </button>
                </div>

                <div className="added-route-list">
                  {routes.length ===
                  0 ? (
                    <div className="empty-route-msg">
                      배송 경로를
                      추가해주세요.
                    </div>
                  ) : (
                    routes.map(
                      (
                        route,
                        index,
                      ) => (
                        <div
                          className="route-chip"
                          key={`${route}-${index}`}
                        >
                          <span>
                            📍{" "}
                            {index + 1}.
                            {" "}
                            {route}
                          </span>

                          <button
                            type="button"
                            className="btn-del-chip"
                            onClick={() =>
                              removeRoute(
                                index,
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dispatchType">
                  🚖 배차 유형
                </label>

                <select
                  id="dispatchType"
                  className="select-control"
                  defaultValue="선착순배차"
                >
                  <option value="선착순배차">
                    선착순배차
                  </option>

                  <option value="지정배차">
                    지정배차
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  📸 배송 사진
                </label>

                <div className="file-btn-layout">
                  <button
                    type="button"
                    className="btn-file-trigger"
                  >
                    📷 사진 선택
                  </button>

                  <span id="fileStatus">
                    선택된 사진 없음
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="submit-btn"
                onClick={() =>
                  alert(
                    "오더 등록 기능은 Supabase 연결 단계에서 연결합니다.",
                  )
                }
              >
                🚀 관제판에 오더
                등록발송
              </button>
            </div>
          </section>
        )}
      </div>

      {/* ACCOUNT MANAGER */}
      {accountManagerOpen && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,.78)",
            zIndex:
              100000,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "12px",
            boxSizing:
              "border-box",
          }}
          onClick={
            closeAccountManager
          }
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                "720px",
              maxHeight:
                "90vh",
              overflow:
                "hidden",
              background:
                "#1e293b",
              border:
                "1px solid #475569",
              borderRadius:
                "16px",
              boxShadow:
                "0 25px 80px rgba(0,0,0,.65)",
              color:
                "#fff",
              boxSizing:
                "border-box",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap:
                  "10px",
                padding:
                  "14px 16px",
                background:
                  "#0f172a",
                borderBottom:
                  "1px solid #334155",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      "18px",
                    fontWeight:
                      900,
                  }}
                >
                  👥 계정 관리
                </div>

                <div
                  style={{
                    fontSize:
                      "11px",
                    color:
                      "#94a3b8",
                    marginTop:
                      "4px",
                  }}
                >
                  ADMIN 전용 계정 관리
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeAccountManager
                }
                style={{
                  border:
                    0,
                  background:
                    "transparent",
                  color:
                    "#94a3b8",
                  fontSize:
                    "28px",
                  cursor:
                    "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* MODAL TABS */}
            <div
              style={{
                display:
                  "flex",
                width:
                  "100%",
                background:
                  "#172033",
                borderBottom:
                  "1px solid #334155",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAccountManagerTab(
                    "master",
                  );
                  setAccountError("");
                  setAccountSaveMessage("");
                }}
                style={{
                  flex:
                    "1 1 0",
                  padding:
                    "12px 6px",
                  border:
                    0,
                  borderBottom:
                    accountManagerTab ===
                    "master"
                      ? "3px solid #6366f1"
                      : "3px solid transparent",
                  background:
                    accountManagerTab ===
                    "master"
                      ? "#1e293b"
                      : "transparent",
                  color:
                    accountManagerTab ===
                    "master"
                      ? "#fff"
                      : "#94a3b8",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                }}
              >
                👑 MASTER 관리
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountManagerTab(
                    "driver",
                  );
                  setAccountError("");
                  setAccountSaveMessage("");
                }}
                style={{
                  flex:
                    "1 1 0",
                  padding:
                    "12px 6px",
                  border:
                    0,
                  borderBottom:
                    accountManagerTab ===
                    "driver"
                      ? "3px solid #3b82f6"
                      : "3px solid transparent",
                  background:
                    accountManagerTab ===
                    "driver"
                      ? "#1e293b"
                      : "transparent",
                  color:
                    accountManagerTab ===
                    "driver"
                      ? "#fff"
                      : "#94a3b8",
                  fontWeight:
                    800,
                  cursor:
                    "pointer",
                }}
              >
                🚚 기사 관리
              </button>
            </div>

            {/* MODAL BODY */}
            <div
              style={{
                padding:
                  "16px",
                overflowY:
                  "auto",
                maxHeight:
                  "calc(90vh - 125px)",
                boxSizing:
                  "border-box",
              }}
            >

              {/* 제목 */}
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap:
                    "10px",
                  marginBottom:
                    "15px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "16px",
                      fontWeight:
                        900,
                    }}
                  >
                    {accountManagerTab ===
                    "master"
                      ? "👑 MASTER 계정"
                      : "🚚 기사 계정"}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#94a3b8",
                      marginTop:
                        "4px",
                    }}
                  >
                    {accountManagerTab ===
                    "master"
                      ? "ADMIN에서 MASTER 계정을 관리합니다."
                      : "ADMIN에서 전체 기사 계정을 관리합니다."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    openAccountForm
                  }
                  style={{
                    border:
                      0,
                    borderRadius:
                      "7px",
                    background:
                      accountManagerTab ===
                      "master"
                        ? "#4f46e5"
                        : "#2563eb",
                    color:
                      "#fff",
                    padding:
                      "9px 10px",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  ➕{" "}
                  {accountManagerTab ===
                  "master"
                    ? "MASTER 생성"
                    : "기사 생성"}
                </button>
              </div>

              {/* 메시지 */}
              {accountError && (
                <div
                  style={{
                    marginBottom:
                      "12px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "8px",
                    background:
                      "rgba(239,68,68,.12)",
                    border:
                      "1px solid rgba(239,68,68,.4)",
                    color:
                      "#fca5a5",
                    fontSize:
                      "13px",
                  }}
                >
                  {accountError}
                </div>
              )}

              {accountSaveMessage && (
                <div
                  style={{
                    marginBottom:
                      "12px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "8px",
                    background:
                      "rgba(34,197,94,.12)",
                    border:
                      "1px solid rgba(34,197,94,.4)",
                    color:
                      "#86efac",
                    fontSize:
                      "13px",
                  }}
                >
                  {accountSaveMessage}
                </div>
              )}

              {/* 계정 생성 폼 */}
              {accountFormOpen && (
                <div
                  style={{
                    marginBottom:
                      "16px",
                    padding:
                      "14px",
                    background:
                      "#0f172a",
                    border:
                      "1px solid #334155",
                    borderRadius:
                      "10px",
                  }}
                >
                  <div
                    style={{
                      fontWeight:
                        900,
                      marginBottom:
                        "12px",
                    }}
                  >
                    {accountManagerTab ===
                    "master"
                      ? "👑 MASTER 계정 생성"
                      : "🚚 기사 계정 생성"}
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap:
                        "10px",
                    }}
                  >
                    <input
                      type="text"
                      value={
                        accountForm.loginId
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            loginId:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="로그인 ID"
                      disabled={
                        accountSaving
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "10px",
                        border:
                          "1px solid #475569",
                        borderRadius:
                          "7px",
                        background:
                          "#1e293b",
                        color:
                          "#fff",
                      }}
                    />

                    <input
                      type="password"
                      value={
                        accountForm.password
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            password:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="비밀번호 6자 이상"
                      disabled={
                        accountSaving
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "10px",
                        border:
                          "1px solid #475569",
                        borderRadius:
                          "7px",
                        background:
                          "#1e293b",
                        color:
                          "#fff",
                      }}
                    />

                    <input
                      type="text"
                      value={
                        accountForm.name
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            name:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="이름"
                      disabled={
                        accountSaving
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "10px",
                        border:
                          "1px solid #475569",
                        borderRadius:
                          "7px",
                        background:
                          "#1e293b",
                        color:
                          "#fff",
                      }}
                    />

                    <input
                      type="text"
                      value={
                        accountForm.phone
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            phone:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      placeholder="전화번호"
                      disabled={
                        accountSaving
                      }
                      style={{
                        width:
                          "100%",
                        boxSizing:
                          "border-box",
                        padding:
                          "10px",
                        border:
                          "1px solid #475569",
                        borderRadius:
                          "7px",
                        background:
                          "#1e293b",
                        color:
                          "#fff",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "flex-end",
                      gap:
                        "8px",
                      marginTop:
                        "12px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={
                        closeAccountForm
                      }
                      disabled={
                        accountSaving
                      }
                      style={{
                        padding:
                          "9px 12px",
                        border:
                          "1px solid #475569",
                        borderRadius:
                          "7px",
                        background:
                          "#1e293b",
                        color:
                          "#cbd5e1",
                        cursor:
                          "pointer",
                      }}
                    >
                      취소
                    </button>

                    <button
                      type="button"
                      onClick={
                        createAccount
                      }
                      disabled={
                        accountSaving
                      }
                      style={{
                        padding:
                          "9px 14px",
                        border:
                          0,
                        borderRadius:
                          "7px",
                        background:
                          accountManagerTab ===
                          "master"
                            ? "#4f46e5"
                            : "#2563eb",
                        color:
                          "#fff",
                        fontWeight:
                          800,
                        cursor:
                          "pointer",
                      }}
                    >
                      {accountSaving
                        ? "생성 중..."
                        : "계정 생성"}
                    </button>
                  </div>
                </div>
              )}

              {/* 계정 목록 */}
              <div>
                {accountLoading ? (
                  <div
                    style={{
                      padding:
                        "30px 15px",
                      textAlign:
                        "center",
                      color:
                        "#94a3b8",
                    }}
                  >
                    계정 목록을
                    불러오는 중입니다...
                  </div>
                ) : visibleAccountUsers.length ===
                  0 ? (
                  <div
                    style={{
                      padding:
                        "30px 15px",
                      textAlign:
                        "center",
                      background:
                        "#0f172a",
                      border:
                        "1px solid #334155",
                      borderRadius:
                        "10px",
                      color:
                        "#94a3b8",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "32px",
                        marginBottom:
                          "8px",
                      }}
                    >
                      {accountManagerTab ===
                      "master"
                        ? "👑"
                        : "🚚"}
                    </div>

                    <div
                      style={{
                        color:
                          "#e2e8f0",
                        fontWeight:
                          800,
                      }}
                    >
                      등록된{" "}
                      {accountManagerTab ===
                      "master"
                        ? "MASTER"
                        : "기사"}{" "}
                      계정이 없습니다.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap:
                        "8px",
                    }}
                  >
                    {visibleAccountUsers.map(
                      (user) => (
                        <div
                          key={
                            user.id
                          }
                          style={{
                            padding:
                              "12px",
                            background:
                              "#0f172a",
                            border:
                              "1px solid #334155",
                            borderRadius:
                              "10px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap:
                              "10px",
                          }}
                        >
                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <div
                              style={{
                                fontWeight:
                                  900,
                                color:
                                  "#f8fafc",
                              }}
                            >
                              {user.name ||
                                "-"}
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "4px",
                                fontSize:
                                  "12px",
                                color:
                                  "#94a3b8",
                              }}
                            >
                              ID:{" "}
                              {
                                user.login_id
                              }
                              {" · "}
                              {user.phone ||
                                "전화번호 없음"}
                            </div>
                          </div>

                          <div
                            style={{
                              flexShrink:
                                0,
                              padding:
                                "5px 8px",
                              borderRadius:
                                "999px",
                              fontSize:
                                "11px",
                              fontWeight:
                                800,
                              background:
                                user.is_active
                                  ? "rgba(34,197,94,.15)"
                                  : "rgba(100,116,139,.2)",
                              color:
                                user.is_active
                                  ? "#86efac"
                                  : "#94a3b8",
                            }}
                          >
                            {user.is_active
                              ? "활성"
                              : "비활성"}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}