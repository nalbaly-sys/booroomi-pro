import { FormEvent, useEffect, useState } from "react";
import { logout, supabase } from "./lib/auth/auth";

type Profile = { id: string; auth_user_id: string; login_id: string; name: string; phone: string | null; role: string; is_active: boolean };
type Driver = { id: string; user_id: string; driver_code: string; work_status: string; name: string; login_id: string; phone: string | null; is_active: boolean };

const FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL || "https://enwyqdekqfpuurutqjdd.supabase.co";

export default function MasterApp({ profile, onLogout }: { profile: Profile; onLogout: () => void }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordUser, setPasswordUser] = useState<Driver | null>(null);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function loadDrivers() {
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.from("drivers").select("id,user_id,driver_code,work_status,users!inner(name,login_id,phone,is_active)").order("driver_code", { ascending: true });
      if (error) throw error;
      const rows = (data || []).map((row: any) => ({ id: row.id, user_id: row.user_id, driver_code: row.driver_code, work_status: row.work_status, name: row.users?.name || "", login_id: row.users?.login_id || "", phone: row.users?.phone || null, is_active: row.users?.is_active !== false }));
      setDrivers(rows);
    } catch (e) { setError(e instanceof Error ? e.message : "기사 목록을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadDrivers(); }, []);

  async function changeDriverStatus(driver: Driver) {
    const next = !driver.is_active;
    if (!window.confirm(`${driver.name || driver.login_id} 기사 계정을 ${next ? "재활성화" : "강제탈퇴"}하시겠습니까?`)) return;
    setMessage(""); setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("로그인 세션이 없습니다.");
      const response = await fetch(`${FUNCTION_URL}/functions/v1/account-status`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ user_id: driver.user_id, is_active: next }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || result.error || "계정 상태 변경에 실패했습니다.");
      setMessage(`${driver.name || driver.login_id} 기사 계정이 ${next ? "재활성화" : "강제탈퇴"}되었습니다.`);
      await loadDrivers();
    } catch (e) { setError(e instanceof Error ? e.message : "계정 상태 변경에 실패했습니다."); }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (!passwordUser || password.length < 6) { setError("비밀번호는 6자 이상 입력해주세요."); return; }
    setSavingPassword(true); setError(""); setMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("로그인 세션이 없습니다.");
      const response = await fetch(`${FUNCTION_URL}/functions/v1/admin-reset-password`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ user_id: passwordUser.user_id, password }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || result.error || "비밀번호 변경에 실패했습니다.");
      setMessage(`${passwordUser.name || passwordUser.login_id} 기사 비밀번호가 변경되었습니다.`);
      setPasswordUser(null); setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다."); }
    finally { setSavingPassword(false); }
  }

  async function handleLogout() {
    try { await logout(); } finally { onLogout(); }
  }

  return <div className="app">
    <header id="header"><div>🏢 꽃배달 현장관제 시스템</div><span>[MASTER 마스터 실시간 오더 제어 센터]</span></header>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",padding:"10px 15px",background:"#111827",color:"#fff"}}>
      <div>👤 <b>{profile.name || profile.login_id}</b> <span style={{color:"#818cf8"}}>[MASTER]</span></div>
      <div style={{display:"flex",gap:"6px"}}><button type="button" onClick={loadDrivers} style={buttonStyle}>🔄 새로고침</button><button type="button" onClick={handleLogout} style={logoutStyle}>로그아웃</button></div>
    </div>
    <main className="container">
      <section className="summary-grid" style={{marginTop:"12px"}}>
        <div className="summary-card"><div className="summary-title">👨 근무기사</div><div className="summary-value">{drivers.filter(d=>d.is_active && d.work_status==="ON").length}</div></div>
        <div className="summary-card"><div className="summary-title">🚚 전체기사</div><div className="summary-value">{drivers.length}</div></div>
        <div className="summary-card"><div className="summary-title">📦 오늘 오더</div><div className="summary-value">0</div></div>
      </section>
      <section className="map-section"><div className="map-placeholder"><div className="map-icon">🗺️</div><div className="map-title">실시간 기사 위치 관제 지도</div><div className="map-description">MASTER는 기사 상태와 오더를 관제할 수 있습니다.</div><small style={{display:"block",marginTop:"8px",color:"#64748b"}}>GPS 지도 연결은 다음 단계에서 기존 flower-delivery 기능을 기준으로 연결합니다.</small></div></section>
      {message && <div style={{padding:"10px",marginBottom:"10px",borderRadius:"8px",background:"#14532d",color:"#dcfce7",fontWeight:700}}>{message}</div>}
      {error && <div style={{padding:"10px",marginBottom:"10px",borderRadius:"8px",background:"#450a0a",color:"#fecaca",fontWeight:700}}>{error}</div>}
      <section className="form-box">
        <div className="section-title">🚖 기사 관리</div>
        {loading ? <div style={{padding:"25px",textAlign:"center"}}>기사 목록을 불러오는 중...</div> : drivers.length === 0 ? <div style={{padding:"25px",textAlign:"center",color:"#64748b"}}>등록된 기사가 없습니다.</div> : <div style={{display:"grid",gap:"8px"}}>{drivers.map(driver=><div key={driver.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",padding:"12px",border:"1px solid #e2e8f0",borderRadius:"8px",background:"#fff"}}><div><div style={{fontWeight:900}}>{driver.name || driver.login_id}</div><div style={{fontSize:"12px",color:"#64748b"}}>{driver.driver_code} · {driver.phone || "전화번호 없음"} · {driver.work_status}</div></div><div style={{display:"flex",gap:"6px"}}><button type="button" onClick={()=>{setPasswordUser(driver);setPassword("")}} style={buttonStyle}>🔑 비밀번호</button><button type="button" onClick={()=>changeDriverStatus(driver)} style={driver.is_active ? dangerStyle : successStyle}>{driver.is_active ? "🚫 강제탈퇴" : "♻️ 재활성화"}</button></div></div>)}</div>}
      </section>
      <section className="form-box" style={{marginTop:"12px"}}><div className="section-title">📋 종합 오더 현황</div><div style={{padding:"25px",textAlign:"center",color:"#64748b"}}>오더 관제 기능은 기존 `sub.html`의 기능을 기준으로 다음 단계에서 연결합니다.</div></section>
    </main>
    {passwordUser && <div className="login-overlay"><form className="login-card" onSubmit={resetPassword}><div className="login-head"><div className="login-crown">🔑</div><div className="login-title">기사 비밀번호 변경</div><div className="login-subtitle">{passwordUser.name || passwordUser.login_id}</div></div><div className="login-body"><div className="login-field"><label>새 비밀번호</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} placeholder="6자 이상" autoFocus /></div><button className="login-button" type="submit" disabled={savingPassword}>{savingPassword ? "변경 중..." : "비밀번호 변경"}</button><button type="button" onClick={()=>setPasswordUser(null)} style={{width:"100%",marginTop:"8px",padding:"12px",border:0,borderRadius:"8px",background:"#475569",color:"#fff",fontWeight:800}}>취소</button></div></form></div>}
  </div>;
}

const buttonStyle: React.CSSProperties = { border:"1px solid #475569", borderRadius:"7px", background:"#1e293b", color:"#fff", padding:"8px 10px", fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" };
const logoutStyle: React.CSSProperties = { ...buttonStyle, borderColor:"#7f1d1d", background:"#450a0a", color:"#fecaca" };
const dangerStyle: React.CSSProperties = { ...buttonStyle, borderColor:"#7f1d1d", background:"#451a1a" };
const successStyle: React.CSSProperties = { ...buttonStyle, borderColor:"#166534", background:"#14532d" };
