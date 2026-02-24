// Supabase Edge Function: create auth user + insert into aspirants (use service_role).
// Only callable by admins (JWT verified; we check admins table for caller).
// Deploy: supabase functions deploy create-aspirant
// Body: { email, password, full_name, track, plan, phone?, city? }

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

const TRACKS = ["fresher", "experienced"];
const PLANS = ["base", "silver", "gold"];

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
      .select("id")
      .eq("id", callerId)
      .single();
    if (!callerRow) {
      return new Response(
        JSON.stringify({ error: "Only admins can create aspirants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const {
      email,
      password,
      full_name,
      track = "fresher",
      plan = "base",
      phone,
      city,
    } = body;

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "email, password, and full_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!TRACKS.includes(track)) {
      return new Response(
        JSON.stringify({ error: "track must be fresher or experienced" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!PLANS.includes(plan)) {
      return new Response(
        JSON.stringify({ error: "plan must be base, silver, or gold" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: (full_name || "").trim() },
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

    const { error: insertError } = await supabaseAdmin.from("aspirants").insert({
      id: userId,
      full_name: (full_name || "").trim(),
      email: email.trim(),
      phone: phone != null && String(phone).trim() !== "" ? String(phone).trim() : null,
      city: city != null && String(city).trim() !== "" ? String(city).trim() : "—",
      education: {},
      skills: [],
      track: track,
      plan: plan,
      plan_started_at: new Date().toISOString(),
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ id: userId, email: email.trim(), message: "Aspirant created. Share login details with the user." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
