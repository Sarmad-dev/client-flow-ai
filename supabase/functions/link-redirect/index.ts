// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = url.searchParams.get('u');
  const messageId = url.searchParams.get('m');
  const userId = url.searchParams.get('uid');

  if (!target) return new Response('Bad Request', { status: 400 });

  try {
    if (messageId && userId) {
      const { data, error: findErr } = await supabaseAdmin
        .from('email_communications')
        .select('id')
        .eq('user_id', userId)
        .eq('mailgun_message_id', messageId)
        .maybeSingle();
      if (!findErr && data) {
        await supabaseAdmin.from('email_events').insert({
          user_id: userId,
          email_communication_id: data.id,
          event_type: 'clicked',
          occurred_at: new Date().toISOString(),
          metadata: { target },
        });
      }
    }
  } catch (_) {}

  return Response.redirect(target, 302);
}

Deno.serve(handler);
