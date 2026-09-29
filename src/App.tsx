import { FormEvent, KeyboardEvent, useState } from "react";
import { loginWithLoginId, logout, supabase } from "./lib/auth/auth";

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
type AccountManagerTab = "admin" | "master" | "driver";
type AccountUser = {
  id: string;
  auth_user_id: string;
  login_id: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
};
type AccountForm = {
  loginId: string;
  password: string;
  name: string;
  phone: string;
};

const SUPABASE_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://enwyqdekqfpuurutqjdd.supabase.co";

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("drivers");
  const [productName, setProductName] = useState("꽃배달");
  const [routeInput, setRouteInput] = useState("");
  const [routes, setRoutes] = useState<string[]>([]);

  const [accountManagerOpen, setAccountManagerOpen] = useState(false);
  const [accountManagerTab, setAccountManagerTab] =
    useState<AccountManagerTab>("admin");

  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");

  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>({
    loginId: "",
    password: "",
    name: "",
    phone: "",
  });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaveMessage, setAccountSaveMessage] = useState("");

  const [passwordResetUser, setPasswordResetUser] =
    useState<AccountUser | null>(null);
  const [passwordResetValue, setPasswordResetValue] = useState("");
  const [passwordResetSaving, setPasswordResetSaving] = useState(false);

  function addRoute() {
    const value = routeInput.trim();
    if (!value) return;
    setRoutes((current) => [...current, value]);
    setRouteInput("");
  }

  function removeRoute(index: number) {
    setRoutes((current) => current.filter((_, i) => i !== index));
  }

  function handleRouteKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addRoute();
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginId.trim() || !password) {
      setLoginError("관리자 ID와 비밀번호를 입력해주세요.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const result = await loginWithLoginId(loginId, password);

      if (result.profile.role !== "MASTER") {
        await logout();
        throw new Error("ADMIN 권한이 없는 계정입니다.");
      }

      setProfile(result.profile as Profile);
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
    setPasswordResetUser(null);
  }

  async function loadAccountUsers() {
    setAccountLoading(true);
    setAccountError("");

    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, auth_user_id, login_id, name, phone, role, is_active",
        )
        .in("role", ["MASTER", "SUBMASTER", "DRIVER"])
        .order("role", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      setAccountUsers((data || []) as AccountUser[]);
    } catch (error) {
      console.error("계정 목록 조회 오류:", error);

      setAccountError(
        error instanceof Error
          ? error.message
          : "계정 목록을 불러오지 못했습니다.",
      );
    } finally {
      setAccountLoading(false);
    }
  }

  function openAccountManager(tab: AccountManagerTab) {
    setAccountManagerTab(tab);
    setAccountManagerOpen(true);
    setAccountError("");
    setAccountSaveMessage("");
    setAccountFormOpen(false);
    setPasswordResetUser(null);
    loadAccountUsers();
  }

  function closeAccountManager() {
    setAccountManagerOpen(false);
    setAccountFormOpen(false);
    setPasswordResetUser(null);
    setAccountError("");
    setAccountSaveMessage("");
  }

  function openAccountForm() {
    if (accountManagerTab === "admin") {
      setAccountError("ADMIN 계정은 여기서 생성할 수 없습니다.");
      return;
    }

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

  async function createAccount() {
    const loginIdValue = accountForm.loginId.trim();
    const passwordValue = accountForm.password;
    const nameValue = accountForm.name.trim();
    const phoneValue = accountForm.phone.trim();

    if (accountManagerTab === "admin") {
      setAccountError("ADMIN 계정은 여기서 생성할 수 없습니다.");
      return;
    }

    if (!loginIdValue) {
      setAccountError("로그인 ID를 입력해주세요.");
      return;
    }

    if (!passwordValue) {
      setAccountError("비밀번호를 입력해주세요.");
      return;
    }

    if (passwordValue.length < 6) {
      setAccountError("비밀번호는 6자 이상 입력해주세요.");
      return;
    }

    if (!nameValue) {
      setAccountError("이름을 입력해주세요.");
      return;
    }

    const role =
      accountManagerTab === "master"
        ? "SUBMASTER"
        : accountManagerTab === "driver"
          ? "DRIVER"
          : null;

    if (!role) {
      setAccountError("계정 유형을 확인해주세요.");
      return;
    }

    setAccountSaving(true);
    setAccountError("");
    setAccountSaveMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "로그인 세션이 없습니다. 다시 로그인해주세요.",
        );
      }

      const response = await fetch(
        `${SUPABASE_FUNCTION_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            login_id: loginIdValue,
            password: passwordValue,
            name: nameValue,
            phone: phoneValue || null,
            role,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "계정 생성에 실패했습니다.",
        );
      }

      setAccountSaveMessage(
        role === "SUBMASTER"
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
      console.error("계정 생성 오류:", error);

      setAccountError(
        error instanceof Error
          ? error.message
          : "계정 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setAccountSaving(false);
    }
  }

  function openPasswordReset(user: AccountUser) {
    setPasswordResetUser(user);
    setPasswordResetValue("");
    setAccountError("");
    setAccountSaveMessage("");
  }

  function closePasswordReset() {
    if (passwordResetSaving) return;

    setPasswordResetUser(null);
    setPasswordResetValue("");
  }

  async function resetAccountPassword() {
    if (!passwordResetUser) return;

    const newPassword = passwordResetValue;

    if (!newPassword) {
      setAccountError("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      setAccountError("비밀번호는 6자 이상 입력해주세요.");
      return;
    }

    setPasswordResetSaving(true);
    setAccountError("");
    setAccountSaveMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "로그인 세션이 없습니다. 다시 로그인해주세요.",
        );
      }

      const response = await fetch(
        `${SUPABASE_FUNCTION_URL}/functions/v1/admin-reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            user_id: passwordResetUser.id,
            new_password: newPassword,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "비밀번호 변경에 실패했습니다.",
        );
      }

      const changedUserName =
        passwordResetUser.name ||
        passwordResetUser.login_id;

      setPasswordResetUser(null);
      setPasswordResetValue("");

      setAccountSaveMessage(
        `${changedUserName} 계정의 비밀번호가 변경되었습니다.`,
      );
    } catch (error) {
      console.error("비밀번호 변경 오류:", error);

      setAccountError(
        error instanceof Error
          ? error.message
          : "비밀번호 변경 중 오류가 발생했습니다.",
      );
    } finally {
      setPasswordResetSaving(false);
    }
  }

  const accountRole =
    accountManagerTab === "admin"
      ? "MASTER"
      : accountManagerTab === "master"
        ? "SUBMASTER"
        : "DRIVER";

  const filteredAccountUsers = accountUsers.filter(
    (user) => user.role === accountRole,
  );

  if (!profile) {
    return (
      <div className="login-overlay">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-head">
            <div className="login-crown">👑</div>

            <div className="login-title">
              꽃배달 종합 관제 시스템
            </div>

            <div className="login-subtitle">
              ADMIN 관리자 로그인
            </div>
          </div>

          <div className="login-body">
            <div className="login-field">
              <label htmlFor="loginId">관리자 ID</label>

              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(event) =>
                  setLoginId(event.target.value)
                }
                placeholder="관리자 ID"
                autoComplete="username"
                disabled={loginLoading}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">비밀번호</label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
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
              {loginLoading ? "로그인 중..." : "로그인"}
            </button>

            {loginLoading && (
              <div className="login-loading">
                사용자 정보를 확인하고 있습니다.
              </div>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header id="header">
        <div>👑 꽃배달 실시간 종합 관제 센터</div>

        <span>
          [최고 관리자 ADMIN 권한 모드]
        </span>
      </header>

      <div className="control-bar">
        <div className="control-user">
          👑 <b>{profile.name || profile.login_id}</b>
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
            onClick={() => window.location.reload()}
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
            title="계정 관리"
            onClick={() =>
              openAccountManager("admin")
            }
            style={{
              border: "1px solid #475569",
              background: "#1e293b",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "7px",
              cursor: "pointer",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            👥 계정 관리
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            style={{
              whiteSpace: "nowrap",
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      <section
        className="summary-wrap"
        style={{
          display: "flex",
          gap: "6px",
          padding: "8px",
          background: "#0b0f19",
          marginTop: "-4px",
          position: "relative",
          zIndex: 2,
          flexWrap: "nowrap",
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          className="summary-card summary-order"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            width: 0,
            padding: "10px 4px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            className="summary-title"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "clamp(9px, 2.5vw, 13px)",
            }}
          >
            📦 오늘오더
          </div>

          <div
            className="summary-value"
            style={{
              fontSize: "clamp(16px, 5vw, 26px)",
              marginTop: "4px",
            }}
          >
            0
          </div>
        </div>

        <div
          className="summary-card summary-reject"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            width: 0,
            padding: "10px 4px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            className="summary-title"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "clamp(9px, 2.5vw, 13px)",
            }}
          >
            ❌ 거절됨
          </div>

          <div
            className="summary-value"
            style={{
              fontSize: "clamp(16px, 5vw, 26px)",
              marginTop: "4px",
            }}
          >
            0
          </div>
        </div>

        <div
          className="summary-card summary-uncheck"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            width: 0,
            padding: "10px 4px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            className="summary-title"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "clamp(9px, 2.5vw, 13px)",
            }}
          >
            ⏳ 미확인
          </div>

          <div
            className="summary-value"
            style={{
              fontSize: "clamp(16px, 5vw, 26px)",
              marginTop: "4px",
            }}
          >
            0
          </div>
        </div>

        <div
          className="summary-card summary-ing"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            width: 0,
            padding: "10px 4px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            className="summary-title"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "clamp(9px, 2.5vw, 13px)",
            }}
          >
            🚚 배송중
          </div>

          <div
            className="summary-value"
            style={{
              fontSize: "clamp(16px, 5vw, 26px)",
              marginTop: "4px",
            }}
          >
            0
          </div>
        </div>

        <div
          className="summary-card summary-done"
          style={{
            flex: "1 1 0",
            minWidth: 0,
            width: 0,
            padding: "10px 4px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            className="summary-title"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "clamp(9px, 2.5vw, 13px)",
            }}
          >
            ✅ 배송완료
          </div>

          <div
            className="summary-value"
            style={{
              fontSize: "clamp(16px, 5vw, 26px)",
              marginTop: "4px",
            }}
          >
            0
          </div>
        </div>
      </section>

      <section className="map-section">
        <div className="map-placeholder">
          <div className="map-icon">🗺️</div>

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
            Supabase GPS 연결은 다음 단계에서 진행합니다.
          </small>
        </div>
      </section>

      <div className="container">
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn ${
              activeTab === "drivers" ? "active" : ""
            }`}
            onClick={() => setActiveTab("drivers")}
          >
            🚖 현장기사 출근부
          </button>

          <button
            type="button"
            className={`tab-btn ${
              activeTab === "orders" ? "active" : ""
            }`}
            onClick={() => setActiveTab("orders")}
          >
            📋 종합 오더 현황
          </button>

          <button
            type="button"
            className={`tab-btn ${
              activeTab === "register" ? "active" : ""
            }`}
            onClick={() => setActiveTab("register")}
          >
            ✍️ 신규 오더 배차
          </button>
        </div>

        {activeTab === "drivers" && (
          <section className="tab-content">
            <div className="section-title">
              📊 실시간 현장 기사 출근 및 위치 현황
            </div>

            <div className="empty-board">
              <div className="empty-icon">👨‍🔧</div>

              <div>
                현재 표시할 근무 기사가 없습니다.
              </div>

              <small>
                기사 출근 상태와 전체 기사 GPS는
                Supabase 연결 후 표시됩니다.
              </small>
            </div>
          </section>
        )}

        {activeTab === "orders" && (
          <section className="tab-content">
            <div className="section-title">
              📊 실시간 오더 관제 현황판

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
              <div className="empty-icon">📋</div>

              <div>
                현재 표시할 오더가 없습니다.
              </div>

              <small>
                오더 데이터는 Supabase 연결 후 표시됩니다.
              </small>
            </div>
          </section>
        )}

        {activeTab === "register" && (
          <section className="tab-content">
            <div className="section-title">
              ✍️ 신규 복합 오더 발송 등록
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
                    setProductName(event.target.value)
                  }
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label>📍 배송 경로</label>

                <div className="route-input-container">
                  <input
                    className="input-text"
                    value={routeInput}
                    onChange={(event) =>
                      setRouteInput(event.target.value)
                    }
                    onKeyDown={handleRouteKeyDown}
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
                  {routes.length === 0 ? (
                    <div className="empty-route-msg">
                      배송 경로를 추가해주세요.
                    </div>
                  ) : (
                    routes.map((route, index) => (
                      <div
                        className="route-chip"
                        key={`${route}-${index}`}
                      >
                        <span>
                          📍 {index + 1}. {route}
                        </span>

                        <button
                          type="button"
                          className="btn-del-chip"
                          onClick={() =>
                            removeRoute(index)
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))
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
                <label>📸 배송 사진</label>

                <div className="file-btn-layout">
                  <button
                    type="button"
                    className="btn-file-trigger"
                    onClick={() =>
                      alert(
                        "사진 업로드 기능은 Supabase 연결 단계에서 연결합니다.",
                      )
                    }
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
                🚀 관제판에 오더 등록발송
              </button>
            </div>
          </section>
        )}
      </div>

      {accountManagerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.78)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            boxSizing: "border-box",
          }}
          onClick={closeAccountManager}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "90vh",
              overflow: "hidden",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "16px",
              boxShadow: "0 25px 80px rgba(0,0,0,.65)",
              color: "#fff",
              boxSizing: "border-box",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "14px 16px",
                background: "#0f172a",
                borderBottom: "1px solid #334155",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 900,
                  }}
                >
                  👥 계정 관리
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginTop: "4px",
                  }}
                >
                  ADMIN 전용 계정 관리
                </div>
              </div>

              <button
                type="button"
                onClick={closeAccountManager}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#94a3b8",
                  fontSize: "28px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                background: "#172033",
                borderBottom: "1px solid #334155",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  openAccountManager("admin")
                }
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  padding: "12px 6px",
                  border: 0,
                  borderBottom:
                    accountManagerTab === "admin"
                      ? "3px solid #a855f7"
                      : "3px solid transparent",
                  background:
                    accountManagerTab === "admin"
                      ? "#1e293b"
                      : "transparent",
                  color:
                    accountManagerTab === "admin"
                      ? "#fff"
                      : "#94a3b8",
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                👑 ADMIN 관리
              </button>

              <button
                type="button"
                onClick={() =>
                  openAccountManager("master")
                }
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  padding: "12px 6px",
                  border: 0,
                  borderBottom:
                    accountManagerTab === "master"
                      ? "3px solid #6366f1"
                      : "3px solid transparent",
                  background:
                    accountManagerTab === "master"
                      ? "#1e293b"
                      : "transparent",
                  color:
                    accountManagerTab === "master"
                      ? "#fff"
                      : "#94a3b8",
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                👑 MASTER 관리
              </button>

              <button
                type="button"
                onClick={() =>
                  openAccountManager("driver")
                }
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  padding: "12px 6px",
                  border: 0,
                  borderBottom:
                    accountManagerTab === "driver"
                      ? "3px solid #3b82f6"
                      : "3px solid transparent",
                  background:
                    accountManagerTab === "driver"
                      ? "#1e293b"
                      : "transparent",
                  color:
                    accountManagerTab === "driver"
                      ? "#fff"
                      : "#94a3b8",
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                🚚 기사 관리
              </button>
            </div>

            <div
              style={{
                padding: "16px",
                overflowY: "auto",
                maxHeight: "calc(90vh - 125px)",
                boxSizing: "border-box",
              }}
            >
              {accountError && (
                <div
                  style={{
                    marginBottom: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#451a1a",
                    border: "1px solid #7f1d1d",
                    color: "#fecaca",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {accountError}
                </div>
              )}

              {accountSaveMessage && (
                <div
                  style={{
                    marginBottom: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#052e16",
                    border: "1px solid #166534",
                    color: "#bbf7d0",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {accountSaveMessage}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "15px",
                  flexWrap: "nowrap",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 900,
                    }}
                  >
                    {accountManagerTab === "admin"
                      ? "👑 ADMIN 계정"
                      : accountManagerTab === "master"
                        ? "👑 MASTER 계정"
                        : "🚚 기사 계정"}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      marginTop: "4px",
                    }}
                  >
                    {accountManagerTab === "admin"
                      ? "최고 관리자 ADMIN 계정을 관리합니다."
                      : accountManagerTab === "master"
                        ? "일반 MASTER 계정을 ADMIN에서 관리합니다."
                        : "ADMIN에서 전체 기사 계정을 관리합니다."}
                  </div>
                </div>

                {accountManagerTab !== "admin" && (
                  <button
                    type="button"
                    onClick={openAccountForm}
                    style={{
                      border: 0,
                      borderRadius: "7px",
                      background:
                        accountManagerTab === "master"
                          ? "#4f46e5"
                          : "#2563eb",
                      color: "#fff",
                      padding: "9px 10px",
                      fontWeight: 800,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {accountManagerTab === "master"
                      ? "➕ MASTER 생성"
                      : "➕ 기사 생성"}
                  </button>
                )}
              </div>

              {accountLoading ? (
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    padding: "25px",
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  계정 목록을 불러오는 중입니다...
                </div>
              ) : filteredAccountUsers.length === 0 ? (
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    padding: "25px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "32px",
                      marginBottom: "8px",
                    }}
                  >
                    {accountManagerTab === "driver"
                      ? "🚚"
                      : "👑"}
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      color: "#e2e8f0",
                    }}
                  >
                    등록된{" "}
                    {accountManagerTab === "admin"
                      ? "ADMIN"
                      : accountManagerTab === "master"
                        ? "MASTER"
                        : "기사"}{" "}
                    계정이 없습니다.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  {filteredAccountUsers.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "10px",
                        padding: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                            flexWrap: "wrap",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "15px",
                              color: "#f8fafc",
                            }}
                          >
                            {user.name || "이름없음"}
                          </strong>

                          <span
                            style={{
                              fontSize: "11px",
                              padding: "3px 6px",
                              borderRadius: "999px",
                              background: user.is_active
                                ? "#14532d"
                                : "#3f3f46",
                              color: user.is_active
                                ? "#bbf7d0"
                                : "#d4d4d8",
                            }}
                          >
                            {user.is_active
                              ? "활성"
                              : "비활성"}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "12px",
                            color: "#94a3b8",
                          }}
                        >
                          ID: {user.login_id}
                          {user.phone
                            ? ` · ${user.phone}`
                            : ""}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openPasswordReset(user)
                        }
                        style={{
                          border: "1px solid #475569",
                          borderRadius: "7px",
                          background: "#1e293b",
                          color: "#fff",
                          padding: "8px 10px",
                          fontWeight: 800,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        🔑 비밀번호 변경
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {accountFormOpen && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 100001,
                  background: "rgba(0,0,0,.65)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px",
                }}
                onClick={closeAccountForm}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "430px",
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "14px",
                    padding: "18px",
                    boxSizing: "border-box",
                  }}
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 900,
                      marginBottom: "14px",
                    }}
                  >
                    {accountManagerTab === "master"
                      ? "👑 MASTER 계정 생성"
                      : "🚚 기사 계정 생성"}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "9px",
                    }}
                  >
                    <input
                      value={accountForm.loginId}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          loginId: event.target.value,
                        }))
                      }
                      placeholder="로그인 ID"
                      disabled={accountSaving}
                      style={{
                        padding: "11px",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "#fff",
                      }}
                    />

                    <input
                      type="password"
                      value={accountForm.password}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="비밀번호 (6자 이상)"
                      disabled={accountSaving}
                      style={{
                        padding: "11px",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "#fff",
                      }}
                    />

                    <input
                      value={accountForm.name}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="이름"
                      disabled={accountSaving}
                      style={{
                        padding: "11px",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "#fff",
                      }}
                    />

                    <input
                      value={accountForm.phone}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="전화번호 (선택)"
                      disabled={accountSaving}
                      style={{
                        padding: "11px",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        background: "#0f172a",
                        color: "#fff",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "14px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={closeAccountForm}
                      disabled={accountSaving}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        background: "#334155",
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      취소
                    </button>

                    <button
                      type="button"
                      onClick={createAccount}
                      disabled={accountSaving}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: 0,
                        background: "#4f46e5",
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      {accountSaving
                        ? "생성 중..."
                        : "계정 생성"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {passwordResetUser && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 100002,
                  background: "rgba(0,0,0,.72)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px",
                }}
                onClick={closePasswordReset}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "14px",
                    padding: "18px",
                    boxSizing: "border-box",
                    boxShadow:
                      "0 20px 60px rgba(0,0,0,.6)",
                  }}
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 900,
                    }}
                  >
                    🔑 비밀번호 변경
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "#94a3b8",
                      marginTop: "6px",
                      marginBottom: "14px",
                    }}
                  >
                    {passwordResetUser.name} (
                    {passwordResetUser.login_id})
                  </div>

                  <input
                    autoFocus
                    type="password"
                    value={passwordResetValue}
                    onChange={(event) => {
                      setPasswordResetValue(
                        event.target.value,
                      );
                      setAccountError("");
                    }}
                    placeholder="새 비밀번호 (6자 이상)"
                    disabled={passwordResetSaving}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #475569",
                      background: "#0f172a",
                      color: "#fff",
                      boxSizing: "border-box",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "14px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={closePasswordReset}
                      disabled={passwordResetSaving}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #475569",
                        background: "#334155",
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      취소
                    </button>

                    <button
                      type="button"
                      onClick={resetAccountPassword}
                      disabled={passwordResetSaving}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: 0,
                        background: "#2563eb",
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      {passwordResetSaving
                        ? "변경 중..."
                        : "비밀번호 변경"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}