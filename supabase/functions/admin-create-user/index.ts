import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
        if (caller) {
          const { data: roleData } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", caller.id)
            .maybeSingle();
          if (roleData?.role !== "administrador") {
            return new Response(JSON.stringify({ error: "Somente administradores podem criar usuários." }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch {
        // Token might be anon key or invalid
      }
    }

    const body = await req.json();
    const { email, nome_completo, celular, cpf, rg, endereco, cargo, role, supervisor_id, gerente_id, numero_emergencia_1, numero_emergencia_2, data_admissao, data_nascimento } = body;

    if (!email || !nome_completo) {
      return new Response(JSON.stringify({ error: "E-mail e nome completo são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a disabled profile with this email exists (reusable)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, disabled")
      .eq("email", email)
      .maybeSingle();

    let userId: string;

    if (existingProfile && existingProfile.disabled) {
      // Reuse existing auth user
      userId = existingProfile.id;
    } else if (existingProfile && !existingProfile.disabled) {
      return new Response(JSON.stringify({ error: `Já existe um usuário ativo com o e-mail ${email}.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Create new auth user (trigger will create profile + default role)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: nome_completo },
      });

      if (createError) {
        // If user exists in auth but not in profiles, try to get the ID
        if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuthUser = users?.find(u => u.email === email);
          if (existingAuthUser) {
            userId = existingAuthUser.id;
          } else {
            return new Response(JSON.stringify({ error: createError.message }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = newUser.user.id;
      }
    }

    // Generate next codigo
    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("codigo").order("codigo", { ascending: false }).limit(1);
    let nextCode = "GN001";
    if (allProfiles && allProfiles.length > 0 && allProfiles[0].codigo) {
      const num = parseInt(allProfiles[0].codigo.replace("GN", ""), 10);
      nextCode = `GN${String(num + 1).padStart(3, "0")}`;
    }

    // Update profile with full data and enable the user (Active from the start)
    const { error: profileError } = await supabaseAdmin.from("profiles").update({
      nome_completo,
      apelido: nome_completo.split(" ")[0],
      celular: celular || null,
      cpf: cpf || null,
      rg: rg || null,
      endereco: endereco || null,
      cargo: cargo || "Consultor de Vendas",
      codigo: nextCode,
      supervisor_id: supervisor_id || null,
      gerente_id: gerente_id || null,
      numero_emergencia_1: numero_emergencia_1 || null,
      numero_emergencia_2: numero_emergencia_2 || null,
      data_admissao: data_admissao || null,
      data_nascimento: data_nascimento || null,
      disabled: false,
    }).eq("id", userId);

    if (profileError) {
      return new Response(JSON.stringify({ error: `Erro ao atualizar perfil: ${profileError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update role if not consultor
    if (role && role !== "consultor") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);
      if (roleError) {
        return new Response(JSON.stringify({ error: `Erro ao atualizar papel: ${roleError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId, codigo: nextCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
