# Design Document

## Overview

This design document outlines the architecture and implementation approach for enhancing the NexaSuit email delivery system. The system builds upon the existing SendGrid integration, React Native UI components, and Supabase backend infrastructure. The enhancements focus on improving user experience, adding advanced email management capabilities, implementing automation features, and providing comprehensive analytics.

### Design Goals

1. **Seamless Integration**: Enhance existing components without breaking current functionality
2. **Performance**: Maintain fast load times and responsive UI even with large email volumes
3. **Scalability**: Support growing email volumes and user base
4. **User Experience**: Provide intuitive interfaces for complex email management tasks
5. **Reliability**: Ensure email delivery tracking and webhook processing are robust
6. **Mobile-First**: Optimize all features for mobile devices while maintaining functionality

### Technology Stack Alignment

- **Frontend**: React Native with Expo SDK 54, TypeScript, React Hook Form, Zod validation
- **Backend**: Supabase Edge Functions (Deno), PostgreSQL database
- **Email Service**: SendGrid API v3 with webhook event tracking
- **State Management**: TanStack React Query for server state, React Context for global state
- **UI Components**: Custom components with Lucide React Native icons, react-native-pell-rich-editor

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native Mobile App                      │
├─────────────────────────────────────────────────────────────────┤
│  Email Screens                                                   │
│  ├── EmailComposer (Enhanced)                                   │
│  ├── EmailThreadsView (New)                                     │
│  ├── EmailTemplatesManager (New)                                │
│  ├── EmailSequencesManager (New)                                │
│  ├── EmailAnalyticsDashboard (New)                              │
│  ├── EmailScheduler (New)                                       │
│  └── EmailSettings (New)                                        │
├─────────────────────────────────────────────────────────────────┤
│  Custom Hooks                                                    │
│  ├── useEmails (Enhanced)                                       │
│  ├── useEmailTemplates (Enhanced)                               │
│  ├── useEmailSequences (New)                                    │
│  ├── useEmailAnalytics (New)                                    │
│  ├── useEmailDrafts (New)                                       │
│  └── useEmailSignatures (New)                                   │
├─────────────────────────────────────────────────────────────────┤
│  React Query Cache Layer                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend                              │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions                                                  │
│  ├── send-email (Enhanced)                                      │
│  ├── sendgrid-webhook (Enhanced)                                │
│  ├── inbound-email (Enhanced)                                   │
│  ├── send-scheduled-emails (Enhanced)                           │
│  ├── process-email-sequences (New)                              │
│  └── generate-email-analytics (New)                             │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                             │
│  ├── email_communications (Enhanced)                            │
│  ├── email_templates (Existing)                                 │
│  ├── email_sequences (Existing)                                 │
│  ├── sequence_steps (Existing)                                  │
│  ├── email_events (Existing)                                    │
│  ├── suppression_list (Existing)                                │
│  ├── email_drafts (New)                                         │
│  ├── email_signatures (New)                                     │
│  ├── sequence_enrollments (New)                                 │
│  └── email_analytics_cache (New)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      SendGrid API                                │
│  ├── Mail Send API                                              │
│  ├── Event Webhook                                              │
│  └── Inbound Parse                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Sending Email Flow

```
User → EmailComposer → useSendEmail hook → send-email function →
SendGrid API → email_communications table → Success response → UI update
```

#### Webhook Event Flow

```
SendGrid → sendgrid-webhook function → Parse event →
Update email_communications → Insert email_events →
React Query cache invalidation → UI update
```

#### Email Sequence Flow

```
User creates sequence → sequence_steps table →
Enroll contact → sequence_enrollments table →
Cron trigger → process-email-sequences function →
send-email function → SendGrid API
```

## Components and Interfaces

### 1. Enhanced Email Composer Component

**File**: `components/EmailComposer.tsx` (Enhanced)

**Key Enhancements**:

- Improved autocomplete with fuzzy search
- Draft auto-save functionality
- Enhanced attachment preview with file type icons
- Signature insertion
- Schedule send option
- Better error handling and validation

**New Props**:

```typescript
interface EmailComposerProps {
  // Existing props...
  draftId?: string | null;
  onSaveDraft?: (draftId: string) => void;
  onSchedule?: (scheduledAt: Date) => void;
  enableSignature?: boolean;
  maxAttachmentSize?: number; // in MB
  maxAttachments?: number;
}
```

**State Management**:

- Local state for form fields and UI state
- React Query mutations for sending, saving drafts
- Debounced auto-save for drafts every 30 seconds

### 2. Email Threads View Component

**File**: `components/EmailThreadsView.tsx` (New)

**Purpose**: Display email conversations grouped by counterparty

**Features**:

- List view of all email threads
- Search and filter threads
- Unread indicators
- Quick reply from thread view
- Contact name resolution from clients/leads

**Component Structure**:

```typescript
interface EmailThread {
  counterpartyEmail: string;
  displayName: string | null;
  lastMessageTime: string;
  lastSubject: string | null;
  totalCount: number;
  unreadCount: number;
  hasReplied: boolean;
}

interface EmailThreadsViewProps {
  onSelectThread: (email: string) => void;
  searchQuery?: string;
  filterStatus?: 'all' | 'unread' | 'replied';
}
```

### 3. Email Thread Detail Component

**File**: `components/EmailThreadDetail.tsx` (New)

**Purpose**: Display all messages in a conversation thread

**Features**:

- Chronological message display
- Visual distinction between sent/received
- Inline reply composer
- Message threading with proper headers
- Attachment display

### 4. Email Templates Manager Component

**File**: `components/EmailTemplatesManager.tsx` (New)

**Purpose**: CRUD operations for email templates

**Features**:

- Template list with search
- Template editor with rich text
- Template preview
- Usage statistics per template
- Template categories/tags

**Component Structure**:

```typescript
interface EmailTemplatesManagerProps {
  onSelectTemplate?: (template: EmailTemplate) => void;
  mode?: 'select' | 'manage';
}
```

### 5. Email Sequences Manager Component

**File**: `components/EmailSequencesManager.tsx` (New)

**Purpose**: Create and manage automated email sequences

**Features**:

- Sequence builder with drag-and-drop steps
- Step delay configuration
- Template selection per step
- Sequence activation toggle
- Enrollment management
- Analytics per sequence

**Component Structure**:

```typescript
interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  steps: SequenceStep[];
  enrollmentCount: number;
  completionRate: number;
}

interface SequenceStep {
  id: string;
  stepOrder: number;
  delayHours: number;
  templateId: string | null;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
}
```

### 6. Email Analytics Dashboard Component

**File**: `components/EmailAnalyticsDashboard.tsx` (New)

**Purpose**: Display comprehensive email metrics and insights

**Features**:

- Overview cards (sent, delivered, opened, clicked, replied)
- Time-series charts for engagement trends
- Recipient engagement leaderboard
- Template performance comparison
- Deliverability metrics
- Export functionality

**Data Visualization**:

- Use `react-native-chart-kit` or `victory-native` for charts
- Line charts for trends over time
- Bar charts for comparisons
- Pie charts for distribution

### 7. Email Scheduler Component

**File**: `components/EmailScheduler.tsx` (New)

**Purpose**: Schedule emails for future delivery

**Features**:

- Date-time picker integration
- Scheduled emails list
- Edit/cancel scheduled emails
- Timezone handling

**Component Structure**:

```typescript
interface EmailSchedulerProps {
  emailData: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  };
  onSchedule: (scheduledAt: Date) => void;
  onCancel: () => void;
}
```

### 8. Email Signature Manager Component

**File**: `components/EmailSignatureManager.tsx` (New)

**Purpose**: Create and manage email signatures

**Features**:

- Rich text editor for signature
- Preview mode
- Auto-insert toggle
- Multiple signature support (future)

## Data Models

### Enhanced email_communications Table

```sql
ALTER TABLE email_communications ADD COLUMN IF NOT EXISTS:
  - is_draft boolean DEFAULT false
  - is_scheduled boolean DEFAULT false
  - scheduled_at timestamptz
  - is_read boolean DEFAULT false
  - thread_id text  -- For grouping related emails
  - sequence_enrollment_id uuid REFERENCES sequence_enrollments(id)
  - signature_used text
  - attachment_count integer DEFAULT 0
  - total_attachment_size integer DEFAULT 0  -- in bytes
```

### New email_drafts Table

```sql
CREATE TABLE email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text,
  subject text,
  body_text text,
  body_html text,
  attachments jsonb,  -- Array of attachment metadata
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_drafts_user ON email_drafts(user_id);
CREATE INDEX idx_email_drafts_updated ON email_drafts(user_id, updated_at DESC);
```

### New email_signatures Table

```sql
CREATE TABLE email_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  html_content text NOT NULL,
  text_content text NOT NULL,
  is_default boolean DEFAULT false,
  auto_insert boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_email_signatures_user ON email_signatures(user_id);
```

### New sequence_enrollments Table

```sql
CREATE TABLE sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id uuid REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  current_step integer DEFAULT 0,
  status text CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_email_sent_at timestamptz,
  next_email_scheduled_at timestamptz,
  UNIQUE(sequence_id, contact_email)
);

CREATE INDEX idx_sequence_enrollments_user ON sequence_enrollments(user_id);
CREATE INDEX idx_sequence_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX idx_sequence_enrollments_status ON sequence_enrollments(status);
CREATE INDEX idx_sequence_enrollments_next_scheduled ON sequence_enrollments(next_email_scheduled_at)
  WHERE status = 'active';
```

### New email_analytics_cache Table

```sql
CREATE TABLE email_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type text NOT NULL,  -- 'daily_stats', 'template_performance', etc.
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id, metric_type, date_range_start, date_range_end)
);

CREATE INDEX idx_email_analytics_cache_user ON email_analytics_cache(user_id);
CREATE INDEX idx_email_analytics_cache_expires ON email_analytics_cache(expires_at);
```

## Error Handling

### Client-Side Error Handling

**Strategy**: Graceful degradation with user-friendly messages

**Implementation**:

```typescript
// Custom error boundary for email components
class EmailErrorBoundary extends React.Component {
  // Catch rendering errors and display fallback UI
}

// Hook-level error handling
function useEmailWithErrorHandling() {
  const { data, error, isError } = useQuery({
    queryKey: ['emails'],
    queryFn: fetchEmails,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isError) {
    // Log to error tracking service
    logError(error);
    // Show user-friendly message
    showAlert('Unable to load emails. Please try again.');
  }

  return { data, error, isError };
}
```

### Server-Side Error Handling

**Strategy**: Comprehensive logging with graceful failures

**SendGrid API Errors**:

- 400: Invalid request → Log and return specific validation error
- 401: Authentication failed → Check API key configuration
- 429: Rate limit → Implement exponential backoff
- 500: SendGrid error → Retry with backoff, fallback to queue

**Database Errors**:

- Connection timeout → Retry with exponential backoff
- Constraint violation → Return specific validation error
- RLS policy violation → Return authorization error

**Webhook Processing Errors**:

- Invalid signature → Log and reject
- Malformed payload → Log and return 400
- Database update failure → Log but return 200 to prevent retries

## Testing Strategy

### Unit Tests

**Components**:

- EmailComposer: Form validation, attachment handling, draft saving
- EmailThreadsView: Thread grouping, search filtering
- EmailTemplatesManager: CRUD operations, validation

**Hooks**:

- useEmails: Data fetching, caching, mutations
- useEmailSequences: Enrollment logic, scheduling calculations
- useEmailAnalytics: Metric calculations, date range handling

**Utilities**:

- Email validation functions
- Date/time formatting
- Thread grouping algorithms

### Integration Tests

**Email Sending Flow**:

1. Compose email with attachments
2. Send via SendGrid
3. Verify database record created
4. Verify webhook updates status

**Sequence Processing**:

1. Create sequence with steps
2. Enroll contact
3. Trigger scheduled processing
4. Verify emails sent at correct intervals

**Analytics Calculation**:

1. Create test email records
2. Trigger analytics generation
3. Verify metrics accuracy

### End-to-End Tests

**Critical User Flows**:

1. Send email and track delivery
2. Create and use template
3. Set up and run email sequence
4. View analytics dashboard
5. Schedule email for future delivery

**Testing Tools**:

- Jest for unit tests
- React Native Testing Library for component tests
- Supabase local development for integration tests

## Performance Considerations

### Frontend Optimization

**React Query Configuration**:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
```

**Pagination**:

- Implement infinite scroll for email lists
- Load 20-50 emails per page
- Use cursor-based pagination for better performance

**Lazy Loading**:

- Load email body content on demand
- Defer loading of analytics charts until visible
- Use React.lazy() for heavy components

**Memoization**:

```typescript
const MemoizedEmailCard = React.memo(EmailCard, (prev, next) => {
  return (
    prev.email.id === next.email.id && prev.email.status === next.email.status
  );
});
```

### Backend Optimization

**Database Indexes**:

- Composite indexes on frequently queried columns
- Partial indexes for filtered queries
- GIN indexes for JSONB columns

**Query Optimization**:

- Use database views for complex analytics queries
- Implement materialized views for expensive calculations
- Cache analytics results in email_analytics_cache table

**Webhook Processing**:

- Process events asynchronously
- Batch database updates when possible
- Use database transactions for consistency

**Cron Jobs**:

```typescript
// Process scheduled emails every minute
Deno.cron('process-scheduled-emails', '* * * * *', async () => {
  await processScheduledEmails();
});

// Process email sequences every 5 minutes
Deno.cron('process-email-sequences', '*/5 * * * *', async () => {
  await processEmailSequences();
});

// Generate analytics cache daily at 2 AM
Deno.cron('generate-analytics-cache', '0 2 * * *', async () => {
  await generateAnalyticsCache();
});
```

### SendGrid Rate Limiting

**Implementation**:

- Track API calls per second
- Implement token bucket algorithm
- Queue emails when approaching limits
- Graceful degradation with user notification

```typescript
class SendGridRateLimiter {
  private tokens: number = 100;
  private lastRefill: number = Date.now();
  private readonly maxTokens = 100;
  private readonly refillRate = 10; // tokens per second

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + timePassed * this.refillRate
    );
    this.lastRefill = now;
  }
}
```

## Security Considerations

### Authentication and Authorization

**Row Level Security (RLS)**:

- All email tables enforce user_id matching
- Sequence enrollments restricted to sequence owner
- Email events only visible to email owner

**API Security**:

- All Edge Functions require valid JWT token
- Validate user permissions before operations
- Sanitize all user inputs

### Data Protection

**Sensitive Data Handling**:

- Email content encrypted at rest (Supabase default)
- Attachments stored as base64 in transit only
- No PII in logs or error messages

**SendGrid Security**:

- API keys stored in Supabase secrets
- Webhook signature verification enabled
- HTTPS only for all communications

### Input Validation

**Email Addresses**:

```typescript
const emailSchema = z.string().email().max(255);
```

**Attachment Validation**:

```typescript
const attachmentSchema = z.object({
  uri: z.string(),
  base64: z.string(),
  mime: z.string().regex(/^(image|application)\//),
  size: z.number().max(10 * 1024 * 1024), // 10MB
});
```

**HTML Content Sanitization**:

- Use DOMPurify or similar for HTML sanitization
- Strip potentially dangerous tags and attributes
- Validate all user-generated HTML content

## Monitoring and Observability

### Metrics to Track

**Email Delivery Metrics**:

- Send success rate
- Delivery rate
- Bounce rate (hard and soft)
- Spam complaint rate
- Open rate
- Click rate
- Reply rate

**System Performance Metrics**:

- API response times
- Database query performance
- Webhook processing latency
- Cache hit rates

**User Engagement Metrics**:

- Daily active users sending emails
- Average emails per user
- Template usage frequency
- Sequence completion rates

### Logging Strategy

**Client-Side Logging**:

```typescript
// Log critical user actions
logger.info('Email sent', { emailId, recipient, hasAttachments });
logger.error('Email send failed', { error, emailData });
```

**Server-Side Logging**:

```typescript
// Structured logging in Edge Functions
console.log(
  JSON.stringify({
    level: 'info',
    message: 'Email sent via SendGrid',
    userId,
    emailId,
    sendGridMessageId,
    timestamp: new Date().toISOString(),
  })
);
```

### Error Tracking

**Integration with Error Tracking Service**:

- Sentry or similar for client-side errors
- Supabase logs for server-side errors
- Alert on critical error thresholds

## Migration Strategy

### Phase 1: Database Schema Updates

1. Create new tables (drafts, signatures, enrollments, analytics_cache)
2. Add new columns to existing tables
3. Create indexes
4. Set up RLS policies

### Phase 2: Backend Enhancements

1. Enhance existing Edge Functions
2. Create new Edge Functions
3. Set up cron jobs
4. Test webhook processing

### Phase 3: Frontend Components

1. Enhance EmailComposer
2. Create new screen components
3. Implement new hooks
4. Update navigation

### Phase 4: Testing and Rollout

1. Comprehensive testing
2. Beta testing with select users
3. Gradual rollout
4. Monitor metrics and errors

### Rollback Plan

- Database migrations are reversible
- Feature flags for new UI components
- Ability to disable new Edge Functions
- Maintain backward compatibility

## Future Enhancements

### Potential Features

1. **AI-Powered Features**:

   - Smart reply suggestions
   - Email content generation
   - Optimal send time prediction
   - Subject line optimization

2. **Advanced Analytics**:

   - A/B testing for email content
   - Predictive engagement scoring
   - Cohort analysis
   - Funnel tracking

3. **Collaboration Features**:

   - Shared email templates
   - Team inboxes
   - Email assignment and delegation
   - Collaborative drafts

4. **Integration Enhancements**:

   - Calendar integration for meeting scheduling
   - CRM sync for contact updates
   - Document attachment from cloud storage
   - Email-to-task conversion

5. **Mobile-Specific Features**:
   - Offline email composition
   - Voice-to-email dictation
   - Smart notifications with ML
   - Gesture-based email management

## Conclusion

This design provides a comprehensive blueprint for enhancing the NexaSuit email delivery system. The architecture maintains consistency with existing patterns while introducing powerful new capabilities. The phased implementation approach ensures minimal disruption to current functionality while delivering incremental value to users.

Key design principles:

- **Modularity**: Components are self-contained and reusable
- **Scalability**: Architecture supports growth in users and email volume
- **Performance**: Optimizations at every layer
- **Security**: Defense in depth with multiple security layers
- **Maintainability**: Clear separation of concerns and comprehensive documentation
