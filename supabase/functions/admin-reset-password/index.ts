import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS"
};

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS"){
    return new Response("ok",{status:200,headers:corsHeaders});
  }

  try{
    if(req.method!=="POST"){
      return new Response(JSON.stringify({success:false,message:"POST 요청만 허용됩니다."}),{
        status:405,
        headers:{...corsHeaders,"Content-Type":"application/json"}
      });
    }

    const authHeader=req.headers.get("Authorization");

    if(!authHeader){
      throw new Error("인증 정보가 없습니다.");
    }

    const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
    const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY")||"";

    if(!supabaseUrl||!serviceRoleKey||!anonKey){
      throw new Error("Supabase 서버 설정을 확인해주세요.");
    }

    const userClient=createClient(supabaseUrl,anonKey,{
      global:{headers:{Authorization:authHeader}}
    });

    const {data:{user},error:userError}=await userClient.auth.getUser();

    if(userError||!user){
      throw new Error("로그인 세션이 유효하지 않습니다.");
    }

    const adminClient=createClient(supabaseUrl,serviceRoleKey);

    const {data:adminProfile,error:profileError}=await adminClient
      .from("users")
      .select("id,auth_user_id,login_id,name,role,is_active")
      .eq("auth_user_id",user.id)
      .maybeSingle();

    if(profileError||!adminProfile){
      throw new Error("관리자 정보를 확인할 수 없습니다.");
    }

    if(adminProfile.role!=="MASTER"||!adminProfile.is_active){
      throw new Error("ADMIN 권한이 없습니다.");
    }

    const body=await req.json();

    const targetUserId=String(body.user_id||"").trim();
    const password=String(body.password||"");

    if(!targetUserId){
      throw new Error("변경할 사용자 정보가 없습니다.");
    }

    if(!password){
      throw new Error("새 비밀번호를 입력해주세요.");
    }

    if(password.length<6){
      throw new Error("비밀번호는 6자 이상 입력해주세요.");
    }

    const {data:targetUser,error:targetError}=await adminClient
      .from("users")
      .select("id,auth_user_id,login_id,name,role,is_active")
      .eq("id",targetUserId)
      .maybeSingle();

    if(targetError){
      throw targetError;
    }

    if(!targetUser){
      throw new Error("변경할 계정을 찾을 수 없습니다.");
    }

    if(!["MASTER","SUBMASTER","DRIVER"].includes(targetUser.role)){
      throw new Error("비밀번호를 변경할 수 없는 계정입니다.");
    }

    if(!targetUser.is_active){
      throw new Error("비활성화된 계정의 비밀번호는 변경할 수 없습니다.");
    }

    const {error:updateError}=await adminClient.auth.admin.updateUserById(
      targetUser.auth_user_id,
      {password}
    );

    if(updateError){
      throw updateError;
    }

    return new Response(JSON.stringify({
      success:true,
      message:"비밀번호가 변경되었습니다.",
      user:{
        id:targetUser.id,
        login_id:targetUser.login_id,
        name:targetUser.name,
        role:targetUser.role
      }
    }),{
      status:200,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    });

  }catch(error){
    console.error("admin-reset-password error:",error);

    return new Response(JSON.stringify({
      success:false,
      message:error instanceof Error
        ?error.message
        :"비밀번호 변경 중 오류가 발생했습니다."
    }),{
      status:400,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    });
  }
});