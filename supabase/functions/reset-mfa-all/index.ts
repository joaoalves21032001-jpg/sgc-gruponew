import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log("Fetching all users...")
    const { data: usersData, error: usersError } = await supabaseClient.auth.admin.listUsers()
    
    if (usersError) throw usersError
    
    const users = usersData.users
    let deletedCount = 0
    let noMfaCount = 0

    for (const user of users) {
      const { data: factors, error: factorsError } = await supabaseClient.auth.admin.mfa.listFactors({ userId: user.id })
      if (factorsError) {
        console.error(`Error fetching factors for ${user.email}:`, factorsError)
        continue
      }

      if (!factors || factors.factors.length === 0) {
        noMfaCount++
        continue
      }

      for (const factor of factors.factors) {
        const { error: deleteError } = await supabaseClient.auth.admin.mfa.deleteFactor({
          userId: user.id,
          id: factor.id
        })
        if (deleteError) {
          console.error(`Failed to delete factor ${factor.id} for ${user.email}:`, deleteError)
        } else {
          deletedCount++
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "MFA reset complete", 
        deletedFactors: deletedCount, 
        usersWithoutMfa: noMfaCount,
        totalUsers: users.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
