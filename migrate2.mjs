import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:19212527121973aA@@db.cfqtbvkiegwmzkzmpojt.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    // 1. Ensure Super Admin Security Profile
    let res = await client.query(`SELECT id FROM public.security_profiles WHERE name = 'Super Admin'`);
    let spId;
    if (res.rows.length === 0) {
        const insertRes = await client.query(`
            INSERT INTO public.security_profiles (name, description, is_system, is_protected)
            VALUES ('Super Admin', 'Perfil Mestre', true, true)
            RETURNING id
        `);
        spId = insertRes.rows[0].id;
    } else {
        spId = res.rows[0].id;
    }
    console.log("Super Admin SP:", spId);

    // 2. Ensure Administrador Mestre Cargo
    res = await client.query(`SELECT id FROM public.cargos WHERE nome = 'Administrador Mestre'`);
    let cargoId;
    if (res.rows.length === 0) {
        const insertRes = await client.query(`
            INSERT INTO public.cargos (nome, description, requires_leader, security_profile_id, nivel_supervisao)
            VALUES ('Administrador Mestre', 'Acesso total', false, $1, 'ninguem')
            RETURNING id
        `, [spId]);
        cargoId = insertRes.rows[0].id;
    } else {
        cargoId = res.rows[0].id;
        await client.query(`UPDATE public.cargos SET security_profile_id = $1, nivel_supervisao = 'ninguem' WHERE id = $2`, [spId, cargoId]);
    }
    console.log("Administrador Mestre Cargo:", cargoId);

    // 3. Ensure admin@sgc.com profile is linked
    res = await client.query(`SELECT id FROM public.profiles WHERE email = 'admin@sgc.com'`);
    if (res.rows.length > 0) {
        const adminId = res.rows[0].id;
        await client.query(`UPDATE public.profiles SET cargo_id = $1, cargo = 'Administrador Mestre', disabled = false WHERE id = $2`, [cargoId, adminId]);
        console.log("Admin profile updated:", adminId);

        // 4. Ensure admin role
        res = await client.query(`SELECT id FROM public.user_roles WHERE user_id = $1`, [adminId]);
        if (res.rows.length === 0) {
            await client.query(`INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'administrador')`, [adminId]);
        } else {
            await client.query(`UPDATE public.user_roles SET role = 'administrador' WHERE user_id = $1`, [adminId]);
        }
        console.log("Admin user_roles updated");
        
        // Let's also grant all permissions to Super Admin profile if they are empty
        const permsRes = await client.query(`SELECT count(*) FROM public.security_profile_permissions WHERE profile_id = $1`, [spId]);
        if (parseInt(permsRes.rows[0].count) === 0) {
            const keys = ['progresso','atividades','minhas_acoes','crm','aprovacoes','inventario','equipe','usuarios','configuracoes','dashboard','logs_auditoria','notificacoes'];
            for (const key of keys) {
                await client.query(`INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed) VALUES ($1, $2, 'view', true)`, [spId, key]);
                await client.query(`INSERT INTO public.security_profile_permissions (profile_id, resource, action, allowed) VALUES ($1, $2, 'edit', true)`, [spId, key]);
            }
            console.log("Populated initial permissions to Super Admin SP.");
        }
    } else {
        console.log("admin@sgc.com NOT FOUND!");
    }

  } catch (err) {
    console.error("Query Error", err);
  } finally {
    await client.end();
  }
}
run();
