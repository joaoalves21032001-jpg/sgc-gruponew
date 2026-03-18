import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { user_id } = await req.json();
        if (!user_id) throw new Error("user_id is required");

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1. List all MFA factors for the user
        const { data: factors, error: listError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user_id });
        if (listError) throw listError;

        // 2. Delete each factor
        for (const factor of factors?.factors ?? []) {
            const { error: delError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user_id });
            if (delError) throw delError;
        }

        // 3. Delete trusted devices for this user
        await supabaseAdmin.from("mfa_trusted_devices").delete().eq("user_id", user_id);

        return new Response(JSON.stringify({ success: true, factorsRemoved: factors?.factors?.length ?? 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
