$file = 'src/integrations/supabase/client.ts'
if (Test-Path $file) {
    (Get-Content $file) -replace 'sb_publishable_i1Ub7xLAn1t9GyImBjRuEA_Xxi1iCLd', 'sb_publishable_REMOVED_DUE_TO_GH013' | Set-Content $file
}
