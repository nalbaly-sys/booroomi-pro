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

    const loginId=String(body.login_id||"").trim().toLowerCase();
    const password=String(body.password||"");
    const name=String(body.name||"").trim();
    const phone=body.phone?String(body.phone).trim():null;
    const requestedRole=String(body.role||"").trim().toUpperCase();

    if(!loginId){
      throw new Error("로그인 ID를 입력해주세요.");
    }

    if(!password){
      throw new Error("비밀번호를 입력해주세요.");
    }

    if(password.length<6){
      throw new Error("비밀번호는 6자 이상 입력해주세요.");
    }

    if(!name){
      throw new Error("이름을 입력해주세요.");
    }

    if(requestedRole!=="SUBMASTER"&&requestedRole!=="DRIVER"){
      throw new Error("생성할 계정 유형이 올바르지 않습니다.");
    }

    const {data:duplicateUser,error:duplicateError}=await adminClient
      .from("users")
      .select("id,login_id")
      .eq("login_id",loginId)
      .maybeSingle();

    if(duplicateError){
      throw duplicateError;
    }

    if(duplicateUser){
      throw new Error("이미 사용 중인 로그인 ID입니다.");
    }

    const email=`${loginId}@auth.booroomi.internal`;

    const {data:createdAuth,error:authError}=await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm:true,
      user_metadata:{
        login_id:loginId,
        name,
        role:requestedRole
      }
    });

    if(authError||!createdAuth.user){
      throw authError||new Error("인증 계정 생성에 실패했습니다.");
    }

    const authUser=createdAuth.user;

    const {data:newUser,error:userInsertError}=await adminClient
      .from("users")
      .insert({
        auth_user_id:authUser.id,
        login_id:loginId,
        name,
        phone,
        role:requestedRole,
        is_active:true
      })
      .select("id,auth_user_id,login_id,name,phone,role,is_active")
      .single();

    if(userInsertError||!newUser){
      await adminClient.auth.admin.deleteUser(authUser.id);
      throw userInsertError||new Error("사용자 프로필 생성에 실패했습니다.");
    }

    if(requestedRole==="DRIVER"){
      const {error:driverError}=await adminClient
        .from("drivers")
        .insert({
          user_id:newUser.id,
          driver_code:loginId,
          work_status:"OFF"
        });

      if(driverError){
        await adminClient.from("users").delete().eq("id",newUser.id);
        await adminClient.auth.admin.deleteUser(authUser.id);
        throw driverError;
      }
    }

    return new Response(JSON.stringify({
      success:true,
      message:requestedRole==="SUBMASTER"
        ?"MASTER 계정이 생성되었습니다."
        :"기사 계정이 생성되었습니다.",
      user:newUser
    }),{
      status:200,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    });

  }catch(error){
    console.error("admin-create-user error:",error);

    return new Response(JSON.stringify({
      success:false,
      message:error instanceof Error
        ?error.message
        :"계정 생성 중 오류가 발생했습니다."
    }),{
      status:400,
      headers:{...corsHeaders,"Content-Type":"application/json"}
    });
  }
});