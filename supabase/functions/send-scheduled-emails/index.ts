// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function handler(): Promise<Response> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('email_communications')
    .select('id, user_id, subject, body_html, body_text, recipient_email')
    .lte('scheduled_at', now)
    .eq('status', 'scheduled')
    .limit(100);
  if (error) return new Response(error.message, { status: 500 });

  for (const row of data || []) {
    try {
      const { error: funcErr } = await supabaseAdmin.functions.invoke(
        'send-email',
        {
          body: {
            to: row.recipient_email,
            subject: row.subject,
            html: row.body_html,
            text: row.body_text,
          },
        }
      );
      if (!funcErr) {
        await supabaseAdmin
          .from('email_communications')
          .update({ status: 'sent', scheduled_at: null })
          .eq('id', row.id);
      }
    } catch (_) {}
  }

  return new Response('OK');
}

Deno.serve(handler);
