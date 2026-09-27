import { FormEvent, useState } from "react";
import { loginWithLoginId, logout } from "./lib/auth/auth";

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
    useState<AccountManagerTab>("master");

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
    event: React.KeyboardEvent<HTMLInputElement>,
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

      /*
       * 이 화면은 BooroomiAdmin 전용입니다.
       * 따라서 MASTER 권한만 접근할 수 있습니다.
       *
       * DB 역할:
       * MASTER    → ADMIN
       * SUBMASTER → 일반 MASTER
       * DRIVER    → 기사
       */
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
      // 화면은 로그인 화면으로 되돌린다.
    }

    setProfile(null);
    setLoginId("");
    setPassword("");
    setLoginError("");
    setAccountManagerOpen(false);
  }

  function openAccountManager(tab: AccountManagerTab) {
    setAccountManagerTab(tab);
    setAccountManagerOpen(true);
  }

  function closeAccountManager() {
    setAccountManagerOpen(false);
  }

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
                onChange={(event) => setLoginId(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
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
      {/* =========================================
          HEADER
      ========================================= */}
      <header id="header">
        <div>👑 꽃배달 실시간 종합 관제 센터</div>

        <span>
          [최고 관리자 ADMIN 권한 모드]
        </span>
      </header>

      {/* =========================================
          ADMIN CONTROL BAR
      ========================================= */}
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
              alert("알림 설정 기능은 다음 단계에서 연결합니다.")
            }
          >
            🔔
          </button>

          <button
            type="button"
            title="MASTER 계정 관리"
            onClick={() => openAccountManager("master")}
            style={{
              border: "1px solid #475569",
              background: "#1e293b",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "7px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            👥 계정 관리
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* =========================================
          기존 Master.html 관제 요약 영역
          위치:
          CONTROL BAR
             ↓
          SUMMARY
             ↓
          MAP
      ========================================= */}
      <section
        className="summary-wrap"
        style={{
          display: "flex",
          gap: "12px",
          padding: "12px",
          background: "#0b0f19",
          marginTop: "-4px",
          position: "relative",
          zIndex: 2,
          flexWrap: "wrap",
        }}
      >
        <div
          className="summary-card summary-order"
          style={{ minWidth: "130px" }}
        >
          <div className="summary-title">
            📦 오늘오더
          </div>

          <div className="summary-value">
            0
          </div>
        </div>

        <div
          className="summary-card summary-reject"
          style={{ minWidth: "130px" }}
        >
          <div className="summary-title">
            ❌ 거절됨
          </div>

          <div className="summary-value">
            0
          </div>
        </div>

        <div
          className="summary-card summary-uncheck"
          style={{ minWidth: "130px" }}
        >
          <div className="summary-title">
            ⏳ 미확인
          </div>

          <div className="summary-value">
            0
          </div>
        </div>

        <div
          className="summary-card summary-ing"
          style={{ minWidth: "130px" }}
        >
          <div className="summary-title">
            🚚 배송중
          </div>

          <div className="summary-value">
            0
          </div>
        </div>

        <div
          className="summary-card summary-done"
          style={{ minWidth: "130px" }}
        >
          <div className="summary-title">
            ✅ 배송완료
          </div>

          <div className="summary-value">
            0
          </div>
        </div>
      </section>

      {/* =========================================
          MAP
      ========================================= */}
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

      {/* =========================================
          MAIN
      ========================================= */}
      <div className="container">
        {/* =======================================
            TABS
        ======================================= */}
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

        {/* =======================================
            DRIVER TAB
        ======================================= */}
        {activeTab === "drivers" && (
          <section className="tab-content">
            <div className="section-title">
              📊 실시간 현장 기사 출근 및 위치 현황
            </div>

            <div className="empty-board">
              <div className="empty-icon">
                👨‍🔧
              </div>

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

        {/* =======================================
            ORDERS TAB
        ======================================= */}
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
              <div className="empty-icon">
                📋
              </div>

              <div>
                현재 표시할 오더가 없습니다.
              </div>

              <small>
                오더 데이터는 Supabase 연결 후 표시됩니다.
              </small>
            </div>
          </section>
        )}

        {/* =======================================
            REGISTER TAB
        ======================================= */}
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
                <label>
                  📍 배송 경로
                </label>

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
                🚀 관제판에 오더 등록발송
              </button>
            </div>
          </section>
        )}
      </div>

      {/* =========================================
          ADMIN ACCOUNT MANAGER MODAL
      ========================================= */}
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
            padding: "20px",
            boxSizing: "border-box",
          }}
          onClick={closeAccountManager}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85vh",
              overflow: "hidden",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "16px",
              boxShadow: "0 25px 80px rgba(0,0,0,.65)",
              color: "#fff",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                background: "#0f172a",
                borderBottom: "1px solid #334155",
              }}
            >
              <div>
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
                }}
              >
                ×
              </button>
            </div>

            {/* MODAL TABS */}
            <div
              style={{
                display: "flex",
                background: "#172033",
                borderBottom: "1px solid #334155",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setAccountManagerTab("master")
                }
                style={{
                  flex: 1,
                  padding: "14px",
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
                }}
              >
                👑 MASTER 관리
              </button>

              <button
                type="button"
                onClick={() =>
                  setAccountManagerTab("driver")
                }
                style={{
                  flex: 1,
                  padding: "14px",
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
                }}
              >
                🚚 기사 관리
              </button>
            </div>

            {/* MODAL BODY */}
            <div
              style={{
                padding: "20px",
                overflowY: "auto",
                maxHeight: "calc(85vh - 130px)",
              }}
            >
              {accountManagerTab === "master" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 900,
                        }}
                      >
                        👑 MASTER 계정
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginTop: "4px",
                        }}
                      >
                        일반 MASTER 계정을 ADMIN에서 관리합니다.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "MASTER 계정 생성 기능은 다음 단계에서 Supabase와 연결합니다.",
                        )
                      }
                      style={{
                        border: 0,
                        borderRadius: "7px",
                        background: "#4f46e5",
                        color: "#fff",
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      ➕ MASTER 생성
                    </button>
                  </div>

                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "10px",
                      padding: "18px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "32px",
                        marginBottom: "8px",
                      }}
                    >
                      👑
                    </div>

                    <div
                      style={{
                        fontWeight: 800,
                        color: "#e2e8f0",
                      }}
                    >
                      등록된 MASTER 계정을 불러오는 중입니다.
                    </div>

                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      Supabase 계정 관리 기능 연결 예정
                    </div>
                  </div>
                </div>
              )}

              {accountManagerTab === "driver" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 900,
                        }}
                      >
                        🚚 기사 계정
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginTop: "4px",
                        }}
                      >
                        ADMIN에서 전체 기사 계정을 관리합니다.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "기사 계정 생성 기능은 다음 단계에서 Supabase와 연결합니다.",
                        )
                      }
                      style={{
                        border: 0,
                        borderRadius: "7px",
                        background: "#2563eb",
                        color: "#fff",
                        padding: "10px 14px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      ➕ 기사 생성
                    </button>
                  </div>

                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "10px",
                      padding: "18px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "32px",
                        marginBottom: "8px",
                      }}
                    >
                      🚚
                    </div>

                    <div
                      style={{
                        fontWeight: 800,
                        color: "#e2e8f0",
                      }}
                    >
                      등록된 기사 계정을 불러오는 중입니다.
                    </div>

                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      Supabase 기사 계정 관리 기능 연결 예정
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}