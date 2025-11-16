# Email Search and Filtering Implementation

This document describes the implementation of Task 11: Email Search and Filtering for the NexaSuit email delivery enhancement feature.

## Overview

The email search and filtering system provides users with powerful tools to find, filter, sort, and organize their email communications. The implementation includes full-text search, advanced filtering, customizable sorting, and saved filter presets.

## Components Implemented

### 1. Hooks

#### `hooks/useEmailSearch.ts`

- **Purpose**: Main hook for searching and filtering emails
- **Features**:
  - Full-text search across subject, body, sender, and recipient
  - Multiple filter criteria (date range, direction, status, client, lead, read status)
  - Customizable sorting (by date, subject, recipient, status)
  - Real-time query updates with React Query
  - Search result highlighting utilities

#### `hooks/useEmailSortPreferences.ts`

- **Purpose**: Persist user's sort preferences across sessions
- **Features**:
  - Saves sort field and order to AsyncStorage
  - Loads preferences on mount
  - Updates preferences automatically

#### `hooks/useSavedEmailFilters.ts`

- **Purpose**: Manage saved filter presets
- **Features**:
  - Save filter combinations with custom names
  - Load, update, and delete saved filters
  - Persist to AsyncStorage
  - Handle date serialization/deserialization

### 2. UI Components

#### `components/EmailFilter.tsx`

- **Purpose**: Modal UI for applying email filters
- **Features**:
  - Direction filter (sent/received/all)
  - Status filter (delivered, opened, clicked, bounced, etc.)
  - Read status filter (read/unread/all)
  - Date range picker
  - Client and lead filters
  - Clear all filters option
  - Follows existing app design patterns

#### `components/EmailSortMenu.tsx`

- **Purpose**: Bottom sheet menu for sorting options
- **Features**:
  - Sort by date, subject, recipient, or status
  - Toggle ascending/descending order
  - Visual indicators for current selection
  - Smooth animations

#### `components/SavedEmailFilters.tsx`

- **Purpose**: Manage saved filter presets
- **Features**:
  - List all saved filters
  - Save current filter combination
  - Apply saved filters with one tap
  - Delete saved filters with confirmation
  - Display filter descriptions

#### `components/EmailSearchAndFilter.tsx`

- **Purpose**: Main component combining all search and filter functionality
- **Features**:
  - Search bar with real-time filtering
  - Filter button with active filter count badge
  - Sort button
  - Saved filters button
  - Filter chips showing active filters
  - Email list with search highlighting
  - Unread indicators
  - Attachment count display
  - Empty state handling

### 3. Screens

#### `app/(tabs)/emails-search.tsx`

- **Purpose**: Dedicated screen for email search and filtering
- **Features**:
  - Full-screen search and filter interface
  - Email detail modal
  - Integrated with existing navigation

## Features Implemented

### 11.1 Email Search Functionality ✅

- Full-text search across multiple fields (subject, body, sender, recipient)
- Case-insensitive search using PostgreSQL `ilike`
- Search result highlighting in UI
- Real-time search updates

### 11.2 Email Filter UI ✅

- Comprehensive filter panel with multiple criteria:
  - Date range filter (from/to dates)
  - Direction filter (sent/received/all)
  - Status filter (delivered, opened, clicked, bounced, etc.)
  - Read status filter
  - Client filter (first 10 clients)
  - Lead filter (first 10 leads)
- Clear individual filters or all at once
- Visual feedback for active filters

### 11.3 Combined Search and Filter ✅

- Simultaneous search and filter application
- Real-time results update
- Filter chips display showing active filters
- Remove individual filters via chip close button
- Clear all filters option
- Filter count badge on filter button

### 11.4 Email Sorting Options ✅

- Sort by:
  - Date (created_at)
  - Subject
  - Recipient
  - Status
- Ascending/descending toggle
- Sort preferences persisted to AsyncStorage
- Visual indicators for current sort

### 11.5 Saved Search Filters ✅

- Save current filter combination with custom name
- List all saved filters
- Apply saved filter with one tap
- Delete saved filters with confirmation
- Filter descriptions showing active criteria
- Persisted to AsyncStorage

## Database Schema

The implementation uses the existing `email_communications` table with the following relevant columns:

```sql
- subject: text
- body_text: text
- body_html: text
- sender_email: text
- recipient_email: text
- direction: 'sent' | 'received'
- status: text
- created_at: timestamptz
- is_read: boolean
- is_draft: boolean
- client_id: uuid
- lead_id: uuid
- attachment_count: integer
```

## Usage Examples

### Basic Search

```typescript
import EmailSearchAndFilter from '@/components/EmailSearchAndFilter';

<EmailSearchAndFilter
  onSelectEmail={(email) => {
    // Handle email selection
    console.log('Selected email:', email);
  }}
/>;
```

### Using the Hook Directly

```typescript
import { useEmailSearch } from '@/hooks/useEmailSearch';

const { data: emails, isLoading } = useEmailSearch(
  {
    searchQuery: 'invoice',
    direction: 'sent',
    status: 'delivered',
    dateFrom: new Date('2024-01-01'),
  },
  {
    field: 'date',
    order: 'desc',
  }
);
```

### Saving a Filter Preset

```typescript
import { useSavedEmailFilters } from '@/hooks/useSavedEmailFilters';

const { saveFilter } = useSavedEmailFilters();

await saveFilter('Important Clients', {
  direction: 'sent',
  status: 'delivered',
  clientId: 'client-123',
});
```

## Performance Considerations

1. **Database Indexes**: The implementation relies on existing indexes on `email_communications`:

   - `idx_email_communications_user` for user filtering
   - `idx_email_communications_is_draft` for excluding drafts
   - Additional indexes on `created_at`, `direction`, `status`, etc.

2. **Query Optimization**:

   - Filters are applied at the database level using Supabase queries
   - React Query caching reduces redundant API calls
   - Debounced search input (handled by React Query)

3. **UI Performance**:
   - FlatList for efficient rendering of large email lists
   - Memoized filter descriptions
   - Lazy loading of filter options

## Testing Recommendations

1. **Unit Tests**:

   - Test `useEmailSearch` with various filter combinations
   - Test search highlighting utility functions
   - Test saved filter serialization/deserialization

2. **Integration Tests**:

   - Test complete search flow from input to results
   - Test filter application and removal
   - Test saved filter persistence

3. **E2E Tests**:
   - Search for emails and verify results
   - Apply multiple filters and verify combined results
   - Save and apply filter presets
   - Sort emails and verify order

## Future Enhancements

1. **Advanced Search**:

   - Boolean operators (AND, OR, NOT)
   - Field-specific search (subject:, from:, to:)
   - Regular expression support

2. **Smart Filters**:

   - AI-powered filter suggestions
   - Auto-categorization
   - Priority inbox

3. **Bulk Operations**:

   - Select multiple emails from search results
   - Bulk actions on filtered emails

4. **Export**:
   - Export search results to CSV
   - Share filtered email lists

## Requirements Mapping

- **Requirement 10.1**: Full-text search across subject, body, sender, recipient ✅
- **Requirement 10.2**: Multiple filter criteria (date, direction, status, client, lead) ✅
- **Requirement 10.3**: Combined search and filter application ✅
- **Requirement 10.4**: Sorting options with persistence ✅
- **Requirement 10.5**: Search result highlighting ✅
- **Requirement 10.6**: Saved filter presets ✅
- **Requirement 10.7**: Empty state handling ✅

## Files Created/Modified

### New Files

- `hooks/useEmailSearch.ts`
- `hooks/useEmailSortPreferences.ts`
- `hooks/useSavedEmailFilters.ts`
- `components/EmailFilter.tsx`
- `components/EmailSortMenu.tsx`
- `components/SavedEmailFilters.tsx`
- `components/EmailSearchAndFilter.tsx`
- `app/(tabs)/emails-search.tsx`

### Modified Files

- `hooks/useEmails.ts` - Added new fields to EmailRecord interface
- `app/(tabs)/emails.tsx` - Added navigation link to search screen

## Conclusion

The email search and filtering implementation provides a comprehensive solution for finding and organizing emails. It follows the app's existing design patterns, integrates seamlessly with the current architecture, and provides a solid foundation for future enhancements.
