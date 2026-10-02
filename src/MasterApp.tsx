import { useEffect,useState,type CSSProperties } from "react";
import { logout,supabase } from "./lib/auth/auth";

type Profile={id:string;auth_user_id:string;login_id:string;name:string;phone:string|null;role:string;is_active:boolean};
type Driver={id:string;user_id:string;driver_code:string;work_status:string;name:string;login_id:string;phone:string|null;is_active:boolean};
type AccountUser={id:string;auth_user_id:string;login_id:string;name:string;phone:string|null;role:string;is_active:boolean};

const SUPABASE_FUNCTION_URL=import.meta.env.VITE_SUPABASE_URL||"https://enwyqdekqfpuurutqjdd.supabase.co";

export default function MasterApp({profile,onLogout}:{profile:Profile;onLogout:()=>void}){
const [drivers,setDrivers]=useState<Driver[]>([]);
const [loadingDrivers,setLoadingDrivers]=useState(false);
const [productName,setProductName]=useState("");
const [routeInput,setRouteInput]=useState("");
const [routes,setRoutes]=useState<string[]>([]);
const [assignType,setAssignType]=useState("");
const [files,setFiles]=useState<File[]>([]);
const [searchKeyword,setSearchKeyword]=useState("");
const [accountOpen,setAccountOpen]=useState(false);
const [accountTab,setAccountTab]=useState<"me"|"driver">("me");
const [accountUsers,setAccountUsers]=useState<AccountUser[]>([]);
const [accountLoading,setAccountLoading]=useState(false);
const [accountError,setAccountError]=useState("");
const [accountMessage,setAccountMessage]=useState("");
const [createOpen,setCreateOpen]=useState(false);
const [createLoginId,setCreateLoginId]=useState("");
const [createPassword,setCreatePassword]=useState("");
const [createName,setCreateName]=useState("");
const [createPhone,setCreatePhone]=useState("");
const [createSaving,setCreateSaving]=useState(false);
const [passwordUser,setPasswordUser]=useState<AccountUser|null>(null);
const [newPassword,setNewPassword]=useState("");
const [passwordSaving,setPasswordSaving]=useState(false);

const loadDrivers=async()=>{
setLoadingDrivers(true);
try{
const {data,error}=await supabase.from("drivers").select("id,user_id,driver_code,work_status,users!inner(name,login_id,phone,is_active)").order("driver_code",{ascending:true});
if(error)throw error;
setDrivers((data||[]).map((r:any)=>({id:r.id,user_id:r.user_id,driver_code:r.driver_code,work_status:r.work_status,name:r.users?.name||"",login_id:r.users?.login_id||"",phone:r.users?.phone||null,is_active:r.users?.is_active!==false})));
}catch(e){console.error("기사 목록 조회 오류",e)}finally{setLoadingDrivers(false)}
};

useEffect(()=>{loadDrivers()},[]);

const addRoute=()=>{const value=routeInput.trim();if(!value)return;setRoutes(v=>[...v,value]);setRouteInput("")};
const removeRoute=(index:number)=>setRoutes(v=>v.filter((_,i)=>i!==index));
const handleFiles=(event:React.ChangeEvent<HTMLInputElement>)=>setFiles(Array.from(event.target.files||[]));

const handleLogout=async()=>{try{await logout()}finally{onLogout()}};

const loadAccountUsers=async()=>{
setAccountLoading(true);setAccountError("");
try{
const {data,error}=await supabase.from("users").select("id,auth_user_id,login_id,name,phone,role,is_active").in("role",["MASTER","DRIVER"]).order("role",{ascending:true}).order("name",{ascending:true});
if(error)throw error;
setAccountUsers((data||[]) as AccountUser[]);
}catch(e){setAccountError(e instanceof Error?e.message:"계정 목록을 불러오지 못했습니다.")}finally{setAccountLoading(false)}
};

const openAccount=()=>{setAccountOpen(true);setAccountTab("me");setAccountError("");setAccountMessage("");loadAccountUsers()};
const closeAccount=()=>{if(createSaving||passwordSaving)return;setAccountOpen(false);setCreateOpen(false);setPasswordUser(null);setAccountError("");setAccountMessage("")};

const openCreateDriver=()=>{
setCreateLoginId("");setCreatePassword("");setCreateName("");setCreatePhone("");
setCreateOpen(true);setAccountError("");setAccountMessage("");
};

const createDriver=async()=>{
const loginId=createLoginId.trim(),password=createPassword,name=createName.trim(),phone=createPhone.trim();
if(!loginId){setAccountError("기사 로그인 ID를 입력해주세요.");return}
if(!password||password.length<6){setAccountError("비밀번호는 6자 이상 입력해주세요.");return}
if(!name){setAccountError("기사 이름을 입력해주세요.");return}
setCreateSaving(true);setAccountError("");setAccountMessage("");
try{
const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
if(sessionError)throw sessionError;
const accessToken=sessionData.session?.access_token;
if(!accessToken)throw new Error("로그인 세션이 없습니다. 다시 로그인해주세요.");
const response=await fetch(`${SUPABASE_FUNCTION_URL}/functions/v1/admin-create-user`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({login_id:loginId,password,name,phone:phone||null,role:"DRIVER"})});
const result=await response.json();
if(!response.ok||!result.success)throw new Error(result.message||result.error||"기사 계정 생성에 실패했습니다.");
setCreateOpen(false);setCreateLoginId("");setCreatePassword("");setCreateName("");setCreatePhone("");
setAccountMessage(`${name} 기사 계정이 생성되었습니다.`);
await loadAccountUsers();await loadDrivers();
}catch(e){setAccountError(e instanceof Error?e.message:"기사 계정 생성 중 오류가 발생했습니다.")}finally{setCreateSaving(false)}
};

const openPasswordChange=(user:AccountUser)=>{
setPasswordUser(user);setNewPassword("");setAccountError("");setAccountMessage("");
};

const changePassword=async()=>{
if(!passwordUser)return;
if(newPassword.length<6){setAccountError("비밀번호는 6자 이상 입력해주세요.");return}
setPasswordSaving(true);setAccountError("");setAccountMessage("");
try{
const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
if(sessionError)throw sessionError;
const accessToken=sessionData.session?.access_token;
if(!accessToken)throw new Error("로그인 세션이 없습니다. 다시 로그인해주세요.");
const response=await fetch(`${SUPABASE_FUNCTION_URL}/functions/v1/admin-reset-password`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({user_id:passwordUser.id,new_password:newPassword})});
const result=await response.json();
if(!response.ok||!result.success)throw new Error(result.message||result.error||"비밀번호 변경에 실패했습니다.");
setPasswordUser(null);setNewPassword("");setAccountMessage(`${passwordUser.name||passwordUser.login_id} 계정의 비밀번호가 변경되었습니다.`);
}catch(e){setAccountError(e instanceof Error?e.message:"비밀번호 변경 중 오류가 발생했습니다.")}finally{setPasswordSaving(false)}
};

const changeAccountStatus=async(user:AccountUser)=>{
const nextActive=!user.is_active;
const actionText=nextActive?"재활성화":"강제탈퇴";
if(!window.confirm(`${user.name||user.login_id} 계정을 ${actionText}하시겠습니까?`))return;
setAccountError("");setAccountMessage("");
try{
const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
if(sessionError)throw sessionError;
const accessToken=sessionData.session?.access_token;
if(!accessToken)throw new Error("로그인 세션이 없습니다. 다시 로그인해주세요.");
const response=await fetch(`${SUPABASE_FUNCTION_URL}/functions/v1/account-status`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},body:JSON.stringify({user_id:user.id,is_active:nextActive})});
const result=await response.json();
if(!response.ok||!result.success)throw new Error(result.message||result.error||`계정 ${actionText}에 실패했습니다.`);
setAccountMessage(`${user.name||user.login_id} 계정이 ${actionText}되었습니다.`);
await loadAccountUsers();await loadDrivers();
}catch(e){setAccountError(e instanceof Error?e.message:`계정 ${actionText} 중 오류가 발생했습니다.`)}
};

const workingCount=drivers.filter(d=>d.is_active&&(d.work_status==="ON"||d.work_status==="근무중")).length;
const driverAccounts=accountUsers.filter(u=>u.role==="DRIVER");
const masterAccount=accountUsers.find(u=>u.id===profile.id)||({id:profile.id,auth_user_id:profile.auth_user_id,login_id:profile.login_id,name:profile.name,phone:profile.phone,role:"MASTER",is_active:profile.is_active} as AccountUser);

return <div className="app">
<header id="header"><div>🏢 꽃배달 현장관제 시스템</div><span>[MASTER 전용 실시간 오더 제어 센터]</span></header>

<div className="control-bar">
<div className="control-user">👤 <b>{profile.name||profile.login_id}</b> <span>[MASTER]</span></div>
<div className="control-actions">
<button type="button" title="전체 새로고침" onClick={()=>window.location.reload()}>🔄</button>
<button type="button" title="알림음 설정" onClick={()=>alert("알림음 설정은 다음 단계에서 연결합니다.")}>🔔</button>
<button type="button" title="계정 관리" onClick={openAccount} style={accountButtonStyle}>👥 계정 관리</button>
<button type="button" className="logout-button" onClick={handleLogout}>로그아웃</button>
</div>
</div>

<section className="summary-wrap">
<div className="summary-card summary-order"><div className="summary-title">📦 오늘오더</div><div className="summary-value">0</div></div>
<div className="summary-card summary-reject"><div className="summary-title">❌ 거절됨</div><div className="summary-value">0</div></div>
<div className="summary-card summary-uncheck"><div className="summary-title">⏳ 미확인</div><div className="summary-value">0</div></div>
<div className="summary-card summary-ing"><div className="summary-title">🚚 배송중</div><div className="summary-value">0</div></div>
<div className="summary-card summary-done"><div className="summary-title">✅ 배송완료</div><div className="summary-value">0</div></div>
</section>

<main className="container">

<section className="form-box">
<div className="section-title">✍️ 신규 복합 오더 발송 등록</div>
<div className="form-group"><label>📦 상품명</label><input className="input-text" value={productName} onChange={e=>setProductName(e.target.value)} placeholder="예 : 꽃다발, 근조화환, 축하화환"/></div>
<div className="form-group"><label>📍 배송 루트 빌더 (순서대로 장소를 추가해 주세요)</label><div className="route-input-container"><input className="input-text" value={routeInput} onChange={e=>setRouteInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addRoute()}}} placeholder="배송지를 입력하세요"/><button type="button" className="btn-add-route" onClick={addRoute}>➕ 추가</button></div><div className="added-route-list">{routes.length===0?<p className="empty-route-msg">추가된 배송 주소가 없습니다. 위 상자에서 등록해 주세요.</p>:routes.map((route,index)=><div className="route-chip" key={`${route}-${index}`}><span>{index+1}. {route}</span><button type="button" className="btn-del-chip" onClick={()=>removeRoute(index)}>✕</button></div>)}</div></div>
<div className="form-group"><label>🚖 배차 방식 및 대상 기사 선택</label><select className="select-control" value={assignType} onChange={e=>setAssignType(e.target.value)}><option value="">🚖 기사 선택</option><option value="선착순배차">선착순배차</option>{drivers.filter(d=>d.is_active).map(driver=><option key={driver.id} value={`지정배차_${driver.driver_code}`}>지정배차 · {driver.name||driver.login_id} ({driver.driver_code})</option>)}</select></div>
<div className="form-group"><label>📸 배송 전표 및 사진 파일 첨부 (선택)</label><div className="file-btn-layout"><label className="btn-file-trigger">📂 파일 선택<input type="file" multiple accept="image/*" capture="environment" onChange={handleFiles} style={{display:"none"}}/></label><span id="fileStatus">{files.length?`${files.length}개 파일 선택됨`:"선택된 파일 없음"}</span></div>{files.length>0&&<div id="previewArea">{files.map((file,index)=><div key={index} style={previewStyle}>{file.name}</div>)}</div>}</div>
<button type="button" className="submit-btn" onClick={()=>alert("오더 등록 기능은 다음 단계에서 App.tsx 기능을 연결합니다.")}>🚀 관제판에 오더 등록발송</button>
</section>

<section style={driverBoxStyle}>
<div style={{fontSize:"14px",fontWeight:900}}>👨‍✈️ 기사 출근부</div>
<div style={{marginTop:"7px"}}>👨‍✈️ 전체 기사: <b>{drivers.length}명</b> | 🟢 근무중: <span style={{color:"#4ade80"}}><b>{workingCount}명</b></span></div>
<div style={driverListStyle}>{loadingDrivers?<span style={{color:"#94a3b8"}}>기사 현황 로딩중...</span>:drivers.length===0?<span style={{color:"#94a3b8"}}>등록된 기사가 없습니다.</span>:drivers.map(driver=>{const working=driver.work_status==="ON"||driver.work_status==="근무중";return <span key={driver.id} style={{...driverChipStyle,background:working?"#22c55e":"#64748b"}}>{driver.name||driver.login_id} ({working?"근무중":driver.work_status||"대기"})</span>})}</div>
</section>

<section>
<div className="section-title">📊 실시간 오더 관제 현황판 <span className="section-subtitle">10초 자동 갱신</span></div>
<div style={excelBoxStyle}><span style={{fontSize:"13px",fontWeight:800,color:"#f8fafc"}}>📥 엑셀 기간 선택:</span><input type="date" className="input-text" style={dateInputStyle}/><span style={{color:"#94a3b8",fontWeight:800}}>~</span><input type="date" className="input-text" style={dateInputStyle}/><button type="button" style={excelButtonStyle} onClick={()=>alert("Excel 다운로드 기능은 다음 단계에서 연결합니다.")}>📥 전체 기사 Excel</button></div>
<div style={searchBoxStyle}><input className="input-text" value={searchKeyword} onChange={e=>setSearchKeyword(e.target.value)} placeholder="오더번호 / 상품명 / 경로 / 기사 검색"/><button type="button" style={historyButtonStyle} onClick={()=>alert("배송완료 내역 조회 기능은 다음 단계에서 연결합니다.")}>📜 배송완료 내역 조회</button></div>
<div className="form-box" style={{marginTop:"8px"}}><div style={orderEmptyStyle}><div style={{fontSize:"38px"}}>📋</div><div style={{fontWeight:900}}>현재 표시할 오더가 없습니다.</div><small style={{color:"#64748b"}}>오더 데이터 연결 후 실제 오더카드가 표시됩니다.</small></div></div>
</section>

</main>

{accountOpen&&<div style={modalOverlayStyle} onClick={closeAccount}>
<div style={accountModalStyle} onClick={e=>e.stopPropagation()}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:"18px",fontWeight:900}}>👥 계정 관리</div><div style={{fontSize:"12px",color:"#94a3b8",marginTop:"4px"}}>MASTER 계정 및 기사 계정 관리</div></div><button type="button" onClick={closeAccount} style={modalXStyle}>✕</button></div>

<div style={tabBarStyle}>
<button type="button" onClick={()=>{setAccountTab("me");setAccountError("");setAccountMessage("")}} style={accountTab==="me"?activeAccountTabStyle:accountTabStyle}>👑 내 계정</button>
<button type="button" onClick={()=>{setAccountTab("driver");setAccountError("");setAccountMessage("")}} style={accountTab==="driver"?activeAccountTabStyle:accountTabStyle}>🚚 기사 관리</button>
</div>

{accountError&&<div style={errorBoxStyle}>{accountError}</div>}
{accountMessage&&<div style={successBoxStyle}>{accountMessage}</div>}

{accountTab==="me"&&<section>
<div style={accountInfoCardStyle}>
<div style={accountRoleBadgeStyle}>MASTER</div>
<div style={accountRowStyle}><span>이름</span><b>{masterAccount.name||"-"}</b></div>
<div style={accountRowStyle}><span>로그인 ID</span><b>{masterAccount.login_id}</b></div>
<div style={accountRowStyle}><span>전화번호</span><b>{masterAccount.phone||"-"}</b></div>
<div style={accountRowStyle}><span>계정상태</span><b style={{color:masterAccount.is_active?"#4ade80":"#f87171"}}>{masterAccount.is_active?"활성":"비활성"}</b></div>
</div>
<button type="button" onClick={()=>openPasswordChange(masterAccount)} style={fullButtonStyle}>🔑 내 비밀번호 변경</button>
</section>}

{accountTab==="driver"&&<section>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px",marginBottom:"10px"}}><div style={{fontWeight:900}}>🚚 기사 계정 <span style={{color:"#94a3b8",fontSize:"12px"}}>{driverAccounts.length}명</span></div><button type="button" onClick={openCreateDriver} style={createButtonStyle}>➕ 기사 계정 생성</button></div>
{accountLoading?<div style={emptyAccountStyle}>계정 목록을 불러오는 중...</div>:driverAccounts.length===0?<div style={emptyAccountStyle}>등록된 기사 계정이 없습니다.</div>:<div style={{display:"grid",gap:"8px"}}>{driverAccounts.map(user=><div key={user.id} style={driverCardStyle}>
<div style={{minWidth:0}}><div style={{fontWeight:900}}>{user.name||user.login_id}</div><div style={{fontSize:"12px",color:"#94a3b8",marginTop:"3px"}}>{user.login_id} · {user.phone||"전화번호 없음"}</div><div style={{fontSize:"11px",marginTop:"4px",color:user.is_active?"#4ade80":"#f87171"}}>{user.is_active?"● 활성":"● 비활성"}</div></div>
<div style={{display:"flex",gap:"5px",flexWrap:"wrap",justifyContent:"flex-end"}}><button type="button" onClick={()=>openPasswordChange(user)} style={smallButtonStyle}>🔑 비밀번호</button><button type="button" onClick={()=>changeAccountStatus(user)} style={user.is_active?dangerSmallButtonStyle:successSmallButtonStyle}>{user.is_active?"강제탈퇴":"재활성화"}</button></div>
</div>)}</div>}
</section>}
</div>
</div>}

{createOpen&&<div style={modalOverlayStyle} onClick={()=>{if(!createSaving)setCreateOpen(false)}}>
<div style={smallModalStyle} onClick={e=>e.stopPropagation()}>
<div style={{fontSize:"17px",fontWeight:900}}>🚚 기사 계정 생성</div>
<div style={{fontSize:"12px",color:"#94a3b8",marginTop:"4px"}}>MASTER가 신규 기사 계정을 생성합니다.</div>
<div style={fieldGroupStyle}><label>로그인 ID</label><input className="input-text" value={createLoginId} onChange={e=>setCreateLoginId(e.target.value)} placeholder="기사 로그인 ID"/></div>
<div style={fieldGroupStyle}><label>비밀번호</label><input className="input-text" type="password" value={createPassword} onChange={e=>setCreatePassword(e.target.value)} placeholder="6자 이상"/></div>
<div style={fieldGroupStyle}><label>기사 이름</label><input className="input-text" value={createName} onChange={e=>setCreateName(e.target.value)} placeholder="기사 이름"/></div>
<div style={fieldGroupStyle}><label>전화번호</label><input className="input-text" value={createPhone} onChange={e=>setCreatePhone(e.target.value)} placeholder="선택 입력"/></div>
<div style={{display:"flex",gap:"7px",marginTop:"14px"}}><button type="button" onClick={()=>setCreateOpen(false)} disabled={createSaving} style={cancelButtonStyle}>취소</button><button type="button" onClick={createDriver} disabled={createSaving} style={createButtonStyle}>{createSaving?"생성 중...":"기사 계정 생성"}</button></div>
</div>
</div>}

{passwordUser&&<div style={modalOverlayStyle} onClick={()=>{if(!passwordSaving)setPasswordUser(null)}}>
<div style={smallModalStyle} onClick={e=>e.stopPropagation()}>
<div style={{fontSize:"17px",fontWeight:900}}>🔑 비밀번호 변경</div>
<div style={{fontSize:"12px",color:"#94a3b8",marginTop:"4px"}}>{passwordUser.name||passwordUser.login_id}</div>
<div style={fieldGroupStyle}><label>새 비밀번호</label><input className="input-text" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="6자 이상"/></div>
<div style={{display:"flex",gap:"7px",marginTop:"14px"}}><button type="button" onClick={()=>setPasswordUser(null)} disabled={passwordSaving} style={cancelButtonStyle}>취소</button><button type="button" onClick={changePassword} disabled={passwordSaving} style={createButtonStyle}>{passwordSaving?"변경 중...":"비밀번호 변경"}</button></div>
</div>
</div>}
</div>;
}

const accountButtonStyle:CSSProperties={border:"1px solid #475569",background:"#1e293b",color:"#fff",padding:"8px 12px",borderRadius:"7px",cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"};
const driverBoxStyle:CSSProperties={background:"#1e293b",padding:"12px",marginTop:"12px",borderRadius:"8px",color:"#fff",fontWeight:700,textAlign:"center"};
const driverListStyle:CSSProperties={fontSize:"12px",marginTop:"7px",display:"flex",flexWrap:"wrap",gap:"6px",justifyContent:"center"};
const driverChipStyle:CSSProperties={padding:"3px 8px",borderRadius:"10px",fontSize:"11px",color:"#fff",fontWeight:800};
const previewStyle:CSSProperties={padding:"6px 9px",background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:"6px",fontSize:"11px",color:"#334155"};
const excelBoxStyle:CSSProperties={background:"#1e293b",padding:"12px",borderRadius:"8px",marginBottom:"8px",display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",border:"1px solid #334155"};
const dateInputStyle:CSSProperties={width:"140px",padding:"6px",fontSize:"13px",background:"#0f172a",color:"#f8fafc",border:"1px solid #334155"};
const excelButtonStyle:CSSProperties={padding:"7px 12px",border:0,borderRadius:"6px",background:"#16a34a",color:"#fff",fontWeight:800,cursor:"pointer"};
const searchBoxStyle:CSSProperties={padding:"10px",display:"flex",gap:"8px",alignItems:"center",boxSizing:"border-box"};
const historyButtonStyle:CSSProperties={background:"#475569",color:"#fff",border:0,padding:"10px 12px",borderRadius:"6px",fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"};
const orderEmptyStyle:CSSProperties={padding:"35px 20px",textAlign:"center",color:"#64748b",display:"grid",gap:"8px"};
const modalOverlayStyle:CSSProperties={position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,.78)",display:"flex",alignItems:"center",justifyContent:"center",padding:"15px",boxSizing:"border-box"};
const accountModalStyle:CSSProperties={width:"100%",maxWidth:"560px",maxHeight:"90vh",overflowY:"auto",background:"#1e293b",border:"1px solid #475569",borderRadius:"15px",padding:"18px",color:"#fff",boxSizing:"border-box"};
const smallModalStyle:CSSProperties={width:"100%",maxWidth:"430px",background:"#1e293b",border:"1px solid #475569",borderRadius:"15px",padding:"18px",color:"#fff",boxSizing:"border-box"};
const modalXStyle:CSSProperties={border:0,background:"transparent",color:"#94a3b8",fontSize:"18px",cursor:"pointer"};
const tabBarStyle:CSSProperties={display:"flex",gap:"6px",marginTop:"16px",padding:"4px",background:"#0f172a",borderRadius:"8px"};
const accountTabStyle:CSSProperties={flex:1,padding:"9px",border:0,borderRadius:"6px",background:"transparent",color:"#94a3b8",fontWeight:800,cursor:"pointer"};
const activeAccountTabStyle:CSSProperties={...accountTabStyle,background:"#334155",color:"#fff"};
const errorBoxStyle:CSSProperties={marginTop:"10px",padding:"9px",borderRadius:"7px",background:"#450a0a",color:"#fecaca",fontSize:"12px",fontWeight:800};
const successBoxStyle:CSSProperties={marginTop:"10px",padding:"9px",borderRadius:"7px",background:"#14532d",color:"#dcfce7",fontSize:"12px",fontWeight:800};
const accountInfoCardStyle:CSSProperties={marginTop:"12px",padding:"14px",background:"#0f172a",border:"1px solid #334155",borderRadius:"10px"};
const accountRoleBadgeStyle:CSSProperties={display:"inline-block",padding:"4px 9px",borderRadius:"12px",background:"#4338ca",color:"#fff",fontSize:"11px",fontWeight:900,marginBottom:"10px"};
const accountRowStyle:CSSProperties={display:"flex",justifyContent:"space-between",gap:"10px",padding:"8px 0",borderBottom:"1px solid #1e293b",fontSize:"13px"};
const fullButtonStyle:CSSProperties={width:"100%",marginTop:"10px",padding:"10px",border:0,borderRadius:"7px",background:"#334155",color:"#fff",fontWeight:800,cursor:"pointer"};
const driverCardStyle:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",padding:"11px",background:"#0f172a",border:"1px solid #334155",borderRadius:"9px"};
const smallButtonStyle:CSSProperties={padding:"7px 9px",border:"1px solid #475569",borderRadius:"6px",background:"#334155",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:"11px"};
const dangerSmallButtonStyle:CSSProperties={...smallButtonStyle,borderColor:"#7f1d1d",background:"#451a1a",color:"#fecaca"};
const successSmallButtonStyle:CSSProperties={...smallButtonStyle,borderColor:"#166534",background:"#14532d",color:"#dcfce7"};
const createButtonStyle:CSSProperties={padding:"8px 11px",border:0,borderRadius:"7px",background:"#2563eb",color:"#fff",fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"};
const cancelButtonStyle:CSSProperties={flex:1,padding:"10px",border:0,borderRadius:"7px",background:"#475569",color:"#fff",fontWeight:800,cursor:"pointer"};
const fieldGroupStyle:CSSProperties={display:"grid",gap:"5px",marginTop:"12px"};
const emptyAccountStyle:CSSProperties={padding:"30px",textAlign:"center",color:"#94a3b8",background:"#0f172a",borderRadius:"9px"};