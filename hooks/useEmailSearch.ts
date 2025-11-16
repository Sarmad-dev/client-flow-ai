import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EmailRecord } from './useEmails';

export interface EmailSearchFilters {
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
  direction?: 'sent' | 'received' | 'all';
  status?: string;
  clientId?: string;
  leadId?: string;
  isRead?: boolean;
}

export interface EmailSortOptions {
  field: 'date' | 'subject' | 'recipient' | 'status';
  order: 'asc' | 'desc';
}

export function useEmailSearch(
  filters: EmailSearchFilters = {},
  sortOptions: EmailSortOptions = { field: 'date', order: 'desc' }
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-search', user?.id, filters, sortOptions],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as EmailRecord[];

      let query = supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_draft', false); // Exclude drafts from search

      // Apply search query across multiple fields
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const searchTerm = filters.searchQuery.trim();
        // Use ilike for case-insensitive search across multiple fields
        query = query.or(
          `subject.ilike.%${searchTerm}%,` +
            `body_text.ilike.%${searchTerm}%,` +
            `sender_email.ilike.%${searchTerm}%,` +
            `recipient_email.ilike.%${searchTerm}%`
        );
      }

      // Apply date range filter
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        // Add one day to include the entire end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      // Apply direction filter
      if (filters.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply client filter
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      // Apply lead filter
      if (filters.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }

      // Apply read status filter
      if (filters.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      // Apply sorting
      const sortField = getSortField(sortOptions.field);
      query = query.order(sortField, {
        ascending: sortOptions.order === 'asc',
      });

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as EmailRecord[];
    },
  });
}

function getSortField(field: EmailSortOptions['field']): string {
  switch (field) {
    case 'date':
      return 'created_at';
    case 'subject':
      return 'subject';
    case 'recipient':
      return 'recipient_email';
    case 'status':
      return 'status';
    default:
      return 'created_at';
  }
}

// Hook for highlighting search results
export function useSearchHighlight(text: string, searchQuery?: string) {
  if (!searchQuery || !searchQuery.trim() || !text) {
    return text;
  }

  const query = searchQuery.trim();
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '**$1**'); // Use markdown-style highlighting
}

// Helper function to extract highlighted segments for display
export function getHighlightedSegments(
  text: string,
  searchQuery?: string
): Array<{ text: string; highlighted: boolean }> {
  if (!searchQuery || !searchQuery.trim() || !text) {
    return [{ text, highlighted: false }];
  }

  const query = searchQuery.trim();
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted: regex.test(part),
    }));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
