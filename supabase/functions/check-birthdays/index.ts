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

    // Get today's month and day
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    // Find profiles with birthday today
    const { data: birthdayProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nome_completo, apelido, data_nascimento, disabled")
      .eq("disabled", false)
      .not("data_nascimento", "is", null);

    if (profilesError) throw profilesError;

    const birthdayPeople = (birthdayProfiles || []).filter((p: any) => {
      if (!p.data_nascimento) return false;
      const dob = p.data_nascimento; // format: YYYY-MM-DD
      return dob.slice(5, 7) === month && dob.slice(8, 10) === day;
    });

    if (birthdayPeople.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum aniversariante hoje." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active users to notify
    const { data: allUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("disabled", false);

    if (usersError) throw usersError;

    // Create notifications for all users about each birthday
    const notifications: any[] = [];
    for (const birthday of birthdayPeople) {
      const nome = birthday.apelido || birthday.nome_completo.split(" ")[0];
      for (const user of (allUsers || [])) {
        // Don't notify the birthday person about themselves
        if (user.id === birthday.id) continue;
        notifications.push({
          user_id: user.id,
          titulo: `🎂 Aniversário: ${nome}`,
          descricao: `Hoje é aniversário de ${birthday.nome_completo}! Não esqueça de parabenizar.`,
          tipo: "aniversario",
        });
      }
      // Also notify the birthday person
      notifications.push({
        user_id: birthday.id,
        titulo: `🎉 Feliz Aniversário, ${nome}!`,
        descricao: `A equipe Grupo New deseja a você um feliz aniversário!`,
        tipo: "aniversario",
      });
    }

    // Batch insert notifications (max 1000 at a time)
    for (let i = 0; i < notifications.length; i += 500) {
      const batch = notifications.slice(i, i + 500);
      const { error: insertError } = await supabase.from("notifications").insert(batch);
      if (insertError) console.error("Error inserting batch:", insertError);
    }

    return new Response(
      JSON.stringify({
        message: `Notificações enviadas para ${birthdayPeople.length} aniversariante(s).`,
        birthdays: birthdayPeople.map((p: any) => p.nome_completo),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
