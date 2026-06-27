// Supabase Edge Function: create auth user + insert into admins (use service_role).
// Only callable by super admins (JWT verified by Supabase; we check admins.role = 'super admin').
// Deploy: supabase functions deploy create-admin
// Call from admin panel with body: { email, password, name, role?, type?, contact? }
// role can be: super admin, admin, assistant admin, interviewer

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getCallerIdFromJwt(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, "=");
    const payload = JSON.parse(atob(padded));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const callerId = getCallerIdFromJwt(req);
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: callerRow } = await supabaseAdmin
      .from("admins")
      .select("role")
      .eq("id", callerId)
      .single();
    if (!callerRow || (callerRow as { role?: string }).role !== "super admin") {
      return new Response(
        JSON.stringify({ error: "Only super admins can create admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { email, password, name, role = "admin", type, contact } = body;

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "email, password, and name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (userError) {
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = userData.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User created but no id returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: insertError } = await supabaseAdmin.from("admins").insert({
      id: userId,
      name,
      email,
      role: role ?? "admin",
      type: type ?? null,
      contact: contact ?? null,
      created_by: callerId,
    });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ id: userId, email, message: "Admin user created." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
