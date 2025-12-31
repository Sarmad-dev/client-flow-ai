// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  decryptEmailData,
  isEncryptionSupported,
} from '../_shared/encryption.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function unauthorized(msg = 'Unauthorized') {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Server not configured', { status: 500 });
  }

  if (!isEncryptionSupported()) {
    return new Response(
      JSON.stringify({
        error: 'Server-side decryption not supported in this environment',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized();
  }
  const token = authHeader.replace('Bearer ', '');

  // Get user from token
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return unauthorized('Invalid user');
  }

  let body: {
    email_ids?: string[];
    filters?: {
      client_id?: string;
      lead_id?: string;
      direction?: 'sent' | 'received';
      limit?: number;
      offset?: number;
    };
  };

  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  try {
    let emails: any[] = [];

    if (body.email_ids && body.email_ids.length > 0) {
      // Fetch specific emails by IDs
      const { data, error } = await supabaseAdmin
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .in('id', body.email_ids)
        .order('created_at', { ascending: false });

      if (error) throw error;
      emails = data || [];
    } else {
      // Fetch emails with filters
      let query = supabaseAdmin
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (body.filters?.client_id) {
        query = query.eq('client_id', body.filters.client_id);
      }
      if (body.filters?.lead_id) {
        query = query.eq('lead_id', body.filters.lead_id);
      }
      if (body.filters?.direction) {
        query = query.eq('direction', body.filters.direction);
      }

      // Apply pagination
      const limit = Math.min(body.filters?.limit || 50, 100); // Max 100 emails
      const offset = body.filters?.offset || 0;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;
      emails = data || [];
    }

    console.log(`Decrypting ${emails.length} emails for user ${user.id}`);

    // Decrypt emails in batches to avoid timeout
    const batchSize = 10;
    const decryptedEmails: any[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const decryptedBatch = await Promise.all(
        batch.map(async (email) => {
          try {
            // Check if email needs decryption (has encrypted content)
            const needsDecryption =
              email.subject?.startsWith('srv_enc:') ||
              email.body_text?.startsWith('srv_enc:') ||
              email.body_html?.startsWith('srv_enc:');

            if (needsDecryption) {
              const decrypted = await decryptEmailData(
                {
                  subject: email.subject,
                  body_text: email.body_text,
                  body_html: email.body_html,
                },
                user.id
              );

              return {
                ...email,
                subject: decrypted.subject,
                body_text: decrypted.body_text,
                body_html: decrypted.body_html,
                _decrypted: true,
              };
            } else {
              // Email is not encrypted or already decrypted
              return {
                ...email,
                _decrypted: false,
              };
            }
          } catch (decryptError) {
            console.error(`Failed to decrypt email ${email.id}:`, decryptError);
            return {
              ...email,
              subject: email.subject?.startsWith('srv_enc:')
                ? '[Decryption Error]'
                : email.subject,
              body_text: email.body_text?.startsWith('srv_enc:')
                ? '[Decryption Error]'
                : email.body_text,
              body_html: email.body_html?.startsWith('srv_enc:')
                ? '[Decryption Error]'
                : email.body_html,
              _decrypted: false,
              _decryption_error: true,
            };
          }
        })
      );

      decryptedEmails.push(...decryptedBatch);
    }

    console.log(`Successfully decrypted ${decryptedEmails.length} emails`);

    return new Response(
      JSON.stringify({
        emails: decryptedEmails,
        total: decryptedEmails.length,
        decrypted_count: decryptedEmails.filter((e) => e._decrypted).length,
        error_count: decryptedEmails.filter((e) => e._decryption_error).length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email decryption error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to decrypt emails',
        details: String(error?.message ?? error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

Deno.serve(handler);
