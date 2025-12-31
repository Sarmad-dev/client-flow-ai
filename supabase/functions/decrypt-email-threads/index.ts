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

interface EmailThread {
  threadId: string;
  counterpartyEmail: string;
  displayName: string | null;
  lastSubject: string | null;
  lastMessageTime: string;
  totalCount: number;
  unreadCount: number;
  hasReplied: boolean;
}

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

  try {
    // Fetch all emails for the user (limit to recent ones for performance)
    const { data: emails, error: emailsError } = await supabaseAdmin
      .from('email_communications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (emailsError) throw emailsError;

    // Fetch client and lead names for display
    const [clientsRes, leadsRes] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('email, name')
        .eq('user_id', user.id),
      supabaseAdmin.from('leads').select('email, name').eq('user_id', user.id),
    ]);

    if (clientsRes.error) throw clientsRes.error;
    if (leadsRes.error) throw leadsRes.error;

    // Create name lookup map
    const nameByEmail = new Map<string, string>();
    for (const c of (clientsRes.data ?? []) as {
      email: string | null;
      name: string;
    }[]) {
      const key = (c?.email || '').toLowerCase();
      if (key) nameByEmail.set(key, c.name);
    }
    for (const l of (leadsRes.data ?? []) as {
      email: string | null;
      name: string;
    }[]) {
      const key = (l?.email || '').toLowerCase();
      if (key && !nameByEmail.has(key)) nameByEmail.set(key, l.name);
    }

    console.log(`Processing ${emails?.length || 0} emails for threads`);

    // Decrypt emails in batches
    const batchSize = 20;
    const decryptedEmails: any[] = [];

    for (let i = 0; i < (emails?.length || 0); i += batchSize) {
      const batch = emails!.slice(i, i + batchSize);

      const decryptedBatch = await Promise.all(
        batch.map(async (email) => {
          try {
            // Check if email needs decryption
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
              };
            } else {
              return email;
            }
          } catch (decryptError) {
            console.error(`Failed to decrypt email ${email.id}:`, decryptError);
            return {
              ...email,
              subject: email.subject?.startsWith('srv_enc:')
                ? '[Decryption Error]'
                : email.subject,
            };
          }
        })
      );

      decryptedEmails.push(...decryptedBatch);
    }

    // Group emails into threads
    const threadMap = new Map<string, any[]>();

    for (const email of decryptedEmails) {
      // Determine counterparty email
      const counterpartyEmail =
        email.direction === 'sent' ? email.recipient_email : email.sender_email;

      if (!counterpartyEmail) continue;

      const threadKey = counterpartyEmail.toLowerCase();

      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, []);
      }
      threadMap.get(threadKey)!.push(email);
    }

    // Create thread summaries
    const threads: EmailThread[] = [];

    for (const [counterpartyEmail, threadEmails] of threadMap) {
      // Sort emails by date (newest first for last message, oldest first for thread ID)
      const sortedEmails = threadEmails.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const lastEmail = sortedEmails[0];
      const displayName = nameByEmail.get(counterpartyEmail) || null;

      // Count unread emails (assuming emails without opened_at are unread for received emails)
      const unreadCount = threadEmails.filter(
        (email) => email.direction === 'received' && !email.opened_at
      ).length;

      // Check if user has replied (has sent emails in this thread)
      const hasReplied = threadEmails.some(
        (email) => email.direction === 'sent'
      );

      // Generate a consistent thread ID based on counterparty email
      const threadId = `thread_${counterpartyEmail.replace(
        /[^a-zA-Z0-9]/g,
        '_'
      )}`;

      threads.push({
        threadId,
        counterpartyEmail,
        displayName,
        lastSubject: lastEmail.subject || null,
        lastMessageTime: lastEmail.created_at,
        totalCount: threadEmails.length,
        unreadCount,
        hasReplied,
      });
    }

    // Sort threads by last message time (newest first)
    threads.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
    );

    console.log(`Generated ${threads.length} email threads`);

    return new Response(
      JSON.stringify({
        threads,
        total: threads.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email threads error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process email threads',
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
