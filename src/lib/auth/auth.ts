import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://enwyqdekqfpuurutqjdd.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

export function loginEmailFromLoginId(loginId:string):string{
  return `${loginId.trim().toLowerCase()}@auth.booroomi.internal`;
}

export async function loginWithLoginId(loginId:string,password:string){
  const email=loginEmailFromLoginId(loginId);
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error) throw new Error("로그인 ID 또는 비밀번호가 올바르지 않습니다.");
  if(!data.user) throw new Error("로그인 정보를 확인할 수 없습니다.");

  const {data:profile,error:profileError}=await supabase.from("users").select("id,auth_user_id,login_id,name,phone,role,is_active").eq("auth_user_id",data.user.id).maybeSingle();

  if(profileError){
    await supabase.auth.signOut();
    throw new Error("사용자 정보를 확인하는 중 오류가 발생했습니다.");
  }

  if(!profile){
    await supabase.auth.signOut();
    throw new Error("등록된 사용자 정보를 찾을 수 없습니다.");
  }

  if(!profile.is_active){
    await supabase.auth.signOut();
    throw new Error("비활성화된 계정입니다.");
  }

  return {authUser:data.user,profile};
}

export async function logout(){
  const {error}=await supabase.auth.signOut();
  if(error) throw error;
}