/**
 * Custom hook for server-side decrypted email operations
 *
 * Uses server-side decryption edge function to handle encrypted emails
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface EmailCommunication {
  id: string;
  user_id: string;
  client_id: string | null;
  lead_id: string | null;
  sendgrid_message_id: string | null;
  mailgun_message_id: string | null; // Legacy field for backward compatibility
  direction: 'sent' | 'received';
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  in_reply_to_message_id: string | null;
  references: string[] | null;
  created_at: string;
  is_draft: boolean;
  is_scheduled: boolean;
  scheduled_at: string | null;
  is_read: boolean;
  thread_id: string | null;
  sequence_enrollment_id: string | null;
  signature_used: string | null;
  attachment_count: number;
  total_attachment_size: number;
  _decrypted?: boolean;
  _decryption_error?: boolean;
}

interface EmailFilters {
  client_id?: string;
  lead_id?: string;
  direction?: 'sent' | 'received';
  limit?: number;
  offset?: number;
}

/**
 * Fetch and decrypt emails using server-side decryption
 */
export function useServerDecryptedEmails(filters?: EmailFilters) {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['server-decrypted-emails', user?.id, filters],
    queryFn: async (): Promise<EmailCommunication[]> => {
      if (!user || !session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/decrypt-emails`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filters: filters || {},
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to fetch and decrypt emails'
        );
      }

      const result = await response.json();
      return result.emails || [];
    },
    enabled: !!user && !!session?.access_token,
    staleTime: 1000 * 60 * 2, // 2 minutes (shorter than client-side due to server processing)
    retry: 2,
  });
}

/**
 * Fetch and decrypt specific emails by IDs
 */
export function useServerDecryptedEmailsByIds(emailIds: string[]) {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['server-decrypted-emails-by-ids', user?.id, emailIds],
    queryFn: async (): Promise<EmailCommunication[]> => {
      if (!user || !session?.access_token || !emailIds.length) {
        return [];
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/decrypt-emails`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_ids: emailIds,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to fetch and decrypt emails'
        );
      }

      const result = await response.json();
      return result.emails || [];
    },
    enabled: !!user && !!session?.access_token && emailIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes for specific emails
  });
}

/**
 * Fetch and decrypt a single email
 */
export function useServerDecryptedEmail(emailId: string) {
  const { data: emails, ...query } = useServerDecryptedEmailsByIds(
    emailId ? [emailId] : []
  );

  return {
    ...query,
    data: emails?.[0] || null,
  };
}

/**
 * Search decrypted emails (server-side search after decryption)
 */
export function useSearchServerDecryptedEmails(
  searchTerm: string,
  filters?: EmailFilters
) {
  const { data: emails, ...query } = useServerDecryptedEmails(filters);

  const filteredEmails = emails?.filter((email) => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(term) ||
      email.body_text?.toLowerCase().includes(term) ||
      email.sender_email?.toLowerCase().includes(term) ||
      email.recipient_email?.toLowerCase().includes(term)
    );
  });

  return {
    ...query,
    data: filteredEmails,
  };
}

/**
 * Prefetch emails for better performance
 */
export function usePrefetchServerDecryptedEmails() {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();

  return useMutation({
    mutationFn: async (filters: EmailFilters) => {
      if (!user || !session?.access_token) return;

      await queryClient.prefetchQuery({
        queryKey: ['server-decrypted-emails', user.id, filters],
        queryFn: async () => {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/decrypt-emails`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                filters,
              }),
            }
          );

          if (!response.ok) {
            throw new Error('Failed to prefetch emails');
          }

          const result = await response.json();
          return result.emails || [];
        },
        staleTime: 1000 * 60 * 2,
      });
    },
  });
}

/**
 * Get email thread (emails with same thread_id or related by references)
 */
export function useServerDecryptedEmailThread(threadId?: string) {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['server-decrypted-email-thread', user?.id, threadId],
    queryFn: async (): Promise<EmailCommunication[]> => {
      if (!user || !session?.access_token || !threadId) {
        return [];
      }

      // First get emails with the same thread_id
      const { data: threadEmails, error } = await supabase
        .from('email_communications')
        .select('id')
        .eq('user_id', user.id)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!threadEmails?.length) {
        return [];
      }

      // Then decrypt them using the server function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/decrypt-emails`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_ids: threadEmails.map((e) => e.id),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch thread emails');
      }

      const result = await response.json();
      return result.emails || [];
    },
    enabled: !!user && !!session?.access_token && !!threadId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get email threads with server-side decryption and aggregation
 */
export function useServerDecryptedEmailThreads() {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['server-decrypted-email-threads', user?.id],
    queryFn: async (): Promise<EmailThread[]> => {
      if (!user || !session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/decrypt-email-threads`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to fetch and decrypt email threads'
        );
      }

      const result = await response.json();
      return result.threads || [];
    },
    enabled: !!user && !!session?.access_token,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
}

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

/**
 * Get thread messages by counterparty email with server-side decryption
 */
export function useServerDecryptedThreadMessages(
  counterpartyEmail?: string | null
) {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: [
      'server-decrypted-thread-messages',
      user?.id,
      counterpartyEmail?.toLowerCase(),
    ],
    queryFn: async (): Promise<EmailCommunication[]> => {
      if (!user || !session?.access_token || !counterpartyEmail) {
        return [];
      }

      // First get email IDs for this thread
      const emailLower = counterpartyEmail.toLowerCase();
      const { data: threadEmails, error } = await supabase
        .from('email_communications')
        .select('id')
        .eq('user_id', user.id)
        .or(
          `sender_email.ilike.${emailLower},recipient_email.ilike.${emailLower}`
        )
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!threadEmails?.length) {
        return [];
      }

      // Then decrypt them using the server function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/decrypt-emails`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_ids: threadEmails.map((e) => e.id),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch thread messages');
      }

      const result = await response.json();
      return result.emails || [];
    },
    enabled: !!user && !!session?.access_token && !!counterpartyEmail,
    staleTime: 1000 * 60 * 5,
  });
}
