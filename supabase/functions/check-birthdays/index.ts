import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const isFirstDay = day === "01";

    // Fetch all active profiles with birthdates
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nome_completo, apelido, data_nascimento, disabled")
      .eq("disabled", false)
      .not("data_nascimento", "is", null);

    if (profilesError) throw profilesError;

    const notifications: any[] = [];
    const birthdayPeopleToday = (profiles || []).filter((p: any) => {
      const dob = p.data_nascimento;
      return dob.slice(5, 7) === month && dob.slice(8, 10) === day;
    });

    const birthdayPeopleMonth = (profiles || []).filter((p: any) => {
      const dob = p.data_nascimento;
      return dob.slice(5, 7) === month;
    });

    // 1. Birthdays Today
    if (birthdayPeopleToday.length > 0) {
      for (const birthday of birthdayPeopleToday) {
        const nome = birthday.apelido || birthday.nome_completo.split(" ")[0];
        for (const user of (profiles || [])) {
          if (user.id === birthday.id) continue;
          notifications.push({
            user_id: user.id,
            titulo: `🎂 Aniversário: ${nome}`,
            descricao: `Hoje é aniversário de ${birthday.nome_completo}!`,
            tipo: "aniversario",
          });
        }
        // Notify self
        notifications.push({
          user_id: birthday.id,
          titulo: `🎉 Feliz Aniversário, ${nome}!`,
          descricao: `A equipe Grupo New deseja a você um feliz aniversário!`,
          tipo: "aniversario",
        });
      }
    }

    // 2. Birthdays of the Month (Only run on 1st day)
    if (isFirstDay && birthdayPeopleMonth.length > 0) {
      const names = birthdayPeopleMonth.map((p: any) => p.apelido || p.nome_completo.split(" ")[0]).join(", ");
      for (const user of (profiles || [])) {
        notifications.push({
          user_id: user.id,
          titulo: `📅 Aniversariantes de ${today.toLocaleString('pt-BR', { month: 'long' })}`,
          descricao: `Celebre com: ${names}.`,
          tipo: "info",
        });
      }
    }

    if (notifications.length > 0) {
      // Batch insert (max 1000)
      for (let i = 0; i < notifications.length; i += 500) {
        const batch = notifications.slice(i, i + 500);
        await supabase.from("notifications").insert(batch);
      }
    }

    return new Response(JSON.stringify({ success: true, count: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});