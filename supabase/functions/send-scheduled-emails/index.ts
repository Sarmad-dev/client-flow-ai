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
      // Get user session for the send-email function
      const { data: user, error: userErr } =
        await supabaseAdmin.auth.admin.getUserById(row.user_id);
      if (userErr || !user) {
        console.error('Failed to get user for scheduled email:', userErr);
        continue;
      }

      // Create a temporary session for the user to send the email
      const { data: session, error: sessionErr } =
        await supabaseAdmin.auth.admin.generateAccessToken(row.user_id);
      if (sessionErr || !session) {
        console.error(
          'Failed to generate session for scheduled email:',
          sessionErr
        );
        continue;
      }

      const { error: funcErr } = await supabaseAdmin.functions.invoke(
        'send-email',
        {
          body: {
            to: row.recipient_email,
            subject: row.subject,
            html: row.body_html,
            text: row.body_text,
            from: user.user?.email?.split('@')[0] || 'scheduled',
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!funcErr) {
        await supabaseAdmin
          .from('email_communications')
          .update({ status: 'sent', scheduled_at: null })
          .eq('id', row.id);
      } else {
        console.error('Failed to send scheduled email:', funcErr);
        // Mark as failed after 3 attempts
        await supabaseAdmin
          .from('email_communications')
          .update({
            status: 'failed',
            scheduled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
      }
    } catch (e) {
      console.error('Error processing scheduled email:', e);
    }
  }

  return new Response('OK');
}

Deno.serve(handler);
