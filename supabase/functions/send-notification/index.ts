import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  type: "atividade_registrada" | "venda_registrada" | "venda_status_atualizado" | "novo_usuario" | "acesso_solicitado" | "acesso_negado";
  data: Record<string, any>;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SGC Grupo New <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error [${res.status}]: ${err}`);
    throw new Error(`Falha ao enviar e-mail: ${err}`);
  }

  const result = await res.json();
  console.log("Email sent:", result);
  return result;
}

function emailTemplate(title: string, content: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #1a4a5c 0%, #2d6a7e 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 700;">SGC — Grupo New</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 4px;">Sistema de Gestão Comercial</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #1a4a5c; font-size: 18px; margin: 0 0 16px 0;">${title}</h2>
        ${content}
      </div>
      <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Grupo New — Notificação automática do SGC</p>
      </div>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, data } = await req.json() as NotificationPayload;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get supervisors, gerentes, admins emails
    const getNotifyEmails = async (userId?: string) => {
      const emails: string[] = [];

      if (userId) {
        // Get user's supervisor and gerente
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("supervisor_id, gerente_id")
          .eq("id", userId)
          .single();

        if (profile?.supervisor_id) {
          const { data: sup } = await supabaseAdmin.from("profiles").select("email").eq("id", profile.supervisor_id).single();
          if (sup?.email) emails.push(sup.email);
        }
        if (profile?.gerente_id) {
          const { data: ger } = await supabaseAdmin.from("profiles").select("email").eq("id", profile.gerente_id).single();
          if (ger?.email) emails.push(ger.email);
        }
      }

      // Always notify admins
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "administrador");

      if (adminRoles) {
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const { data: adminProfiles } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .in("id", adminIds);
        if (adminProfiles) {
          for (const p of adminProfiles) {
            if (p.email && !emails.includes(p.email)) emails.push(p.email);
          }
        }
      }

      return emails;
    };

    let subject = "";
    let html = "";
    let recipients: string[] = [];

    switch (type) {
      case "atividade_registrada": {
        const { user_id, user_name, data: dateStr, ligacoes, mensagens, cotacoes_enviadas, follow_up } = data;
        recipients = await getNotifyEmails(user_id);
        subject = `📊 Atividades registradas — ${user_name}`;
        html = emailTemplate("Novo Registro de Atividades", `
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            <strong>${user_name}</strong> registrou atividades para o dia <strong>${dateStr}</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Ligações</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${ligacoes}</td></tr>
            <tr><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Mensagens</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${mensagens}</td></tr>
            <tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Cotações Enviadas</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${cotacoes_enviadas}</td></tr>
            <tr><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Follow-up</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${follow_up}</td></tr>
          </table>
        `);
        break;
      }

      case "venda_registrada": {
        const { user_id, user_name, nome_titular, modalidade, vidas, valor } = data;
        recipients = await getNotifyEmails(user_id);
        subject = `🛒 Nova venda registrada — ${user_name}`;
        html = emailTemplate("Nova Venda Registrada", `
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            <strong>${user_name}</strong> registrou uma nova venda.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Titular</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${nome_titular}</td></tr>
            <tr><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Modalidade</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${modalidade}</td></tr>
            <tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Vidas</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${vidas}</td></tr>
            <tr><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Valor</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">R$ ${valor ? Number(valor).toLocaleString('pt-BR') : '—'}</td></tr>
          </table>
        `);
        break;
      }

      case "venda_status_atualizado": {
        const { user_id, user_email, nome_titular, status, observacoes } = data;
        // Notify the consultant who owns the sale
        if (user_email) recipients.push(user_email);
        const moreEmails = await getNotifyEmails(user_id);
        for (const e of moreEmails) { if (!recipients.includes(e)) recipients.push(e); }
        const statusLabel: Record<string, string> = { aprovado: '✅ Aprovada', recusado: '❌ Recusada', pendente: '⚠️ Pendência', analise: '🔍 Em Análise' };
        subject = `Venda ${statusLabel[status] || status} — ${nome_titular}`;
        html = emailTemplate("Status da Venda Atualizado", `
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            A venda de <strong>${nome_titular}</strong> teve seu status atualizado para <strong>${statusLabel[status] || status}</strong>.
          </p>
          ${observacoes ? `<div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; border: 1px solid #fde68a;"><p style="font-size: 13px; color: #92400e; margin: 0;"><strong>Observação:</strong> ${observacoes}</p></div>` : ''}
        `);
        break;
      }

      case "novo_usuario": {
        const { nome, email, cargo } = data;
        recipients = await getNotifyEmails();
        subject = `👤 Novo usuário cadastrado — ${nome}`;
        html = emailTemplate("Novo Usuário no SGC", `
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Um novo usuário foi adicionado ao sistema.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Nome</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${nome}</td></tr>
            <tr><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">E-mail</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${email}</td></tr>
            <tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Cargo</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${cargo}</td></tr>
          </table>
        `);
        break;
      }

      case "acesso_solicitado": {
        const { nome, email, telefone, mensagem } = data;
        recipients = await getNotifyEmails();
        subject = `🔑 Solicitação de acesso — ${nome}`;
        html = emailTemplate("Nova Solicitação de Acesso", `
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            <strong>${nome}</strong> solicitou acesso ao sistema SGC.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Nome</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${nome}</td></tr>
            <tr><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">E-mail</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${email}</td></tr>
            ${telefone ? `<tr style="background: #f3f4f6;"><td style="padding: 10px 12px; font-size: 13px; color: #6b7280;">Telefone</td><td style="padding: 10px 12px; font-size: 13px; font-weight: 600; text-align: right;">${telefone}</td></tr>` : ''}
          </table>
          ${mensagem ? `<div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;"><p style="font-size: 13px; color: #1e40af; margin: 0;"><strong>Mensagem:</strong> ${mensagem}</p></div>` : ''}
        `);
        break;
      }

      case "acesso_negado": {
        const { nome, email, motivo } = data;
        recipients = [email];
        subject = `Solicitação de Acesso Negado`;
        html = emailTemplate("Solicitação de Acesso Negado", `
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Olá <strong>${nome}</strong>,
          </p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Sua solicitação de acesso ao sistema SGC foi negada.
          </p>
          <div style="margin-top: 16px; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
            <p style="font-size: 14px; color: #991b1b; margin: 0;">${motivo}</p>
          </div>
        `);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Tipo de notificação inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (recipients.length > 0) {
      await sendEmail(recipients, subject, html);
      console.log(`Notification [${type}] sent to: ${recipients.join(", ")}`);
    } else {
      console.log(`Notification [${type}]: no recipients found`);
    }

    return new Response(JSON.stringify({ success: true, recipients_count: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
