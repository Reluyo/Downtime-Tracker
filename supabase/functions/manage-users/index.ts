import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authErr,
    } = await callerClient.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = callerClient.auth.admin;
    const url = new URL(req.url);
    const method = req.method;

    // GET — list all users with roles
    if (method === "GET") {
      const {
        data: { users },
        error,
      } = await admin.listUsers();
      if (error) throw error;

      const { data: roles } = await callerClient
        .from("user_roles")
        .select("user_id, role");

      const roleMap = new Map(
        (roles ?? []).map((r: Record<string, string>) => [r.user_id, r.role]),
      );

      const result = users.map((u) => ({
        id: u.id,
        email: u.email,
        role: roleMap.get(u.id) ?? "viewer",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — create user
    if (method === "POST") {
      const body = await req.json();
      const { email, password, role } = body;

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (password.length < 12) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 12 characters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: newUser, error: createErr } = await admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (createErr) throw createErr;

      if (role && (role === "admin" || role === "viewer")) {
        await callerClient.from("user_roles").upsert({
          user_id: newUser.user.id,
          role,
        });
      }

      return new Response(
        JSON.stringify({
          id: newUser.user.id,
          email: newUser.user.email,
          role: role ?? "viewer",
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // PUT — update user role and/or password
    if (method === "PUT") {
      const body = await req.json();
      const { user_id, role, password } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (role) {
        await callerClient.from("user_roles").upsert({ user_id, role });
      }

      if (password) {
        if (password.length < 12) {
          return new Response(
            JSON.stringify({ error: "Password must be at least 12 characters" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const { error: updateErr } = await admin.updateUserById(user_id, {
          password,
          user_metadata: { must_change_password: true },
        });
        if (updateErr) throw updateErr;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE — remove user
    if (method === "DELETE") {
      const userId = url.searchParams.get("user_id");
      if (!userId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (userId === caller.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete yourself" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      await callerClient.from("user_roles").delete().eq("user_id", userId);
      const { error: delErr } = await admin.deleteUser(userId);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
