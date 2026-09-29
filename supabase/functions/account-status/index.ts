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
      return new Response(JSON.stringify({success:false,message:"POST 요청만 허용됩니다."}),{status:405,headers:{...corsHeaders,"Content-Type":"application/json"}});
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

    const {data:currentUser,error:currentUserError}=await adminClient
      .from("users")
      .select("id,auth_user_id,login_id,name,role,is_active")
      .eq("auth_user_id",user.id)
      .maybeSingle();

    if(currentUserError||!currentUser){
      throw new Error("현재 사용자 정보를 확인할 수 없습니다.");
    }

    if(!currentUser.is_active){
      throw new Error("현재 계정이 이미 비활성화되어 있습니다.");
    }

    const body=await req.json();

    const targetUserId=String(body.user_id||"").trim();
    const requestedActive=body.is_active;

    if(!targetUserId){
      throw new Error("대상 계정 정보가 없습니다.");
    }

    if(typeof requestedActive!=="boolean"){
      throw new Error("계정 상태 값이 올바르지 않습니다.");
    }

    const {data:targetUser,error:targetUserError}=await adminClient
      .from("users")
      .select("id,auth_user_id,login_id,name,role,is_active")
      .eq("id",targetUserId)
      .maybeSingle();

    if(targetUserError){
      throw targetUserError;
    }

    if(!targetUser){
      throw new Error("대상 계정을 찾을 수 없습니다.");
    }

    if(targetUser.id===currentUser.id){
      if(requestedActive){
        throw new Error("현재 계정은 여기서 활성화할 수 없습니다.");
      }
    }else{
      if(currentUser.role==="MASTER"){
        if(!["SUBMASTER","DRIVER"].includes(targetUser.role)){
          throw new Error("ADMIN은 MASTER와 기사 계정만 관리할 수 있습니다.");
        }
      }else if(currentUser.role==="SUBMASTER"){
        if(targetUser.role!=="DRIVER"){
          throw new Error("MASTER는 기사 계정만 관리할 수 있습니다.");
        }
      }else{
        throw new Error("계정 상태를 변경할 권한이 없습니다.");
      }
    }

    if(targetUser.is_active===requestedActive){
      return new Response(JSON.stringify({
        success:true,
        message:requestedActive?"이미 활성화된 계정입니다.":"이미 비활성화된 계정입니다.",
        user:targetUser
      }),{
        status:200,
        headers:{...corsHeaders,"Content-Type":"application/json"}
      });
    }

    const {data:updatedUser,error:updateError}=await adminClient
      .from("users")
      .update({
        is_active:requestedActive,
        updated_at:new Date().toISOString()
      })
      .eq("id",targetUser.id)
      .select("id,auth_user_id,login_id,name,phone,role,is_active")
      .single();

    if(updateError||!updatedUser){
      throw updateError||new Error("계정 상태 변경에 실패했습니다.");
    }

    return new Response(JSON.stringify({
      success:true,
      message:requestedActive
        ?"계정이 활성화되었습니다."
        :"계정이 비활성화되었습니다.",
      user:updatedUser
    }),{
      status:200,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    });

  }catch(error){
    console.error("account-status error:",error);

    return new Response(JSON.stringify({
      success:false,
      message:error instanceof Error
        ?error.message
        :"계정 상태 변경 중 오류가 발생했습니다."
    }),{
      status:400,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    });
  }
});