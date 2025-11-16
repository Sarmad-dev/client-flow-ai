# Implementation Plan

- [x] 1. Database Schema Setup

  - Create new database tables and enhance existing ones for email management features
  - Run migrations to add email_drafts, email_signatures, sequence_enrollments, and email_analytics_cache tables
  - Add new columns to email_communications table (is_draft, is_scheduled, scheduled_at, is_read, thread_id, sequence_enrollment_id, signature_used, attachment_count, total_attachment_size)
  - Create all necessary indexes for performance optimization
  - Set up Row Level Security (RLS) policies for all new tables
  - _Requirements: 2.3, 3.1, 7.2, 9.2_

- [x] 2. Email Drafts Functionality

- [x] 2.1 Create email drafts database operations

  - Implement useEmailDrafts hook with queries for fetching, creating, updating, and deleting drafts
  - Add auto-save functionality with debouncing (30-second intervals)
  - Implement draft list view with last modified timestamps
  - _Requirements: 7.4, 7.5, 7.6_

- [x] 2.2 Integrate draft functionality into EmailComposer

  - Add draft loading capability to EmailComposer component
  - Implement auto-save trigger on content changes
  - Add "Save as Draft" button to composer UI
  - Handle draft-to-send conversion
  - _Requirements: 7.1, 7.4_

- [x] 2.3 Add draft management screen

  - Create DraftsListScreen component to display all saved drafts
  - Implement draft search and filtering
  - Add swipe-to-delete functionality for drafts
  - _Requirements: 7.5, 7.6, 7.7_

- [x] 3. Email Signature Management

- [x] 3.1 Create signature database operations and hooks

  - Implement useEmailSignatures hook for CRUD operations
  - Add signature storage in profiles or dedicated table
  - Implement default signature selection logic
  - _Requirements: 9.1, 9.2, 9.6_

- [x] 3.2 Build EmailSignatureManager component

  - Create signature editor with rich text support
  - Add signature preview functionality
  - Implement auto-insert toggle setting
  - Add signature to user settings screen
  - _Requirements: 9.1, 9.3, 9.4_

- [x] 3.3 Integrate signatures into EmailComposer

  - Auto-append signature to email body when enabled
  - Allow manual removal of signature per email
  - Store signature_used field in email_communications
  - _Requirements: 9.4, 9.5, 9.7_

- [x] 4. Enhanced Email Composer UI

- [x] 4.1 Improve recipient autocomplete

  - Implement fuzzy search for recipient suggestions
  - Display contact names with email addresses
  - Add visual indicators for clients vs leads
  - Optimize autocomplete performance with debouncing
  - _Requirements: 1.2_

- [x] 4.2 Enhance attachment handling

  - Add file type validation (images, PDFs, documents)
  - Implement file size validation (10MB per file, 5 files max)
  - Display file type icons for non-image attachments
  - Show total attachment size indicator
  - Add attachment preview thumbnails
  - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 4.3 Improve AI enhancement feature

  - Update AI enhancement button visibility logic
  - Add loading state during enhancement
  - Improve error handling for AI failures
  - Add character counter for enhancement threshold
  - _Requirements: 1.5, 1.6_

- [x] 4.4 Add send confirmation and success feedback

  - Implement loading indicator during send
  - Show success message with sent email details
  - Add option to view sent email after sending
  - Improve error messages for send failures
  - _Requirements: 1.8_

- [x] 5. Email Templates Management

- [x] 5.1 Create email templates CRUD operations

  - Enhance useEmailTemplates hook with full CRUD operations
  - Add template search and filtering functionality
  - Implement template usage tracking
  - _Requirements: 2.1, 2.6_

- [x] 5.2 Build EmailTemplatesManager component

  - Create template list view with search
  - Implement template editor with rich text support
  - Add template preview functionality
  - Build template creation and edit forms
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 5.3 Add template deletion with validation

  - Implement delete confirmation dialog
  - Check for template usage in active sequences
  - Prevent deletion of templates in use
  - _Requirements: 2.5, 2.7_

- [x] 5.4 Integrate templates into EmailComposer

  - Enhance template selection UI in composer
  - Add confirmation dialog when applying template over existing content
  - Improve template preview in selection list
  - _Requirements: 1.3, 2.3_

- [x] 6. Email Scheduling Functionality

- [x] 6.1 Create scheduled email database operations

  - Add scheduled_at column handling in email_communications

  - Implement useScheduledEmails hook for managing scheduled emails
  - Add queries for fetching pending scheduled emails
  - _Requirements: 7.2, 7.8_

- [x] 6.2 Build EmailScheduler component

  - Create date-time picker for schedule selection
  - Add timezone handling and display
  - Implement schedule validation (future dates only)
  - Build scheduled emails list view
  - _Requirements: 7.1, 7.2, 7.8_

- [x] 6.3 Enhance send-scheduled-emails Edge Function

  - Update function to process scheduled emails from database
  - Add error handling and retry logic
  - Implement logging for scheduled email processing
  - Add batch processing for multiple scheduled emails
  - _Requirements: 7.3_

- [x] 6.4 Add schedule management UI

  - Implement edit scheduled email functionality
  - Add cancel scheduled email with confirmation
  - Show countdown timer for upcoming scheduled emails
  - _Requirements: 7.8_

- [-] 7. Email Threads View

- [x] 7.1 Create email threading logic

  - Implement useEmailThreads hook to group emails by counterparty
  - Add thread_id generation and management
  - Implement contact name resolution from clients/leads
  - Calculate unread counts per thread
  - _Requirements: 4.1, 4.3_

- [x] 7.2 Build EmailThreadsView component

  - Create thread list with last message preview

  - Add unread indicators and badges
  - Implement thread search functionality
  - Add sorting options (recent, unread, name)
  - _Requirements: 4.1, 4.2, 4.6_

- [x] 7.3 Create EmailThreadDetail component

  - Display all messages in chronological order
  - Add visual distinction for sent vs received messages
  - Implement message expansion/collapse
  - Show attachment indicators
  - _Requirements: 4.2, 4.5_

- [x] 7.4 Add inline reply functionality

  - Implement reply composer within thread view
  - Auto-populate recipient and threading headers
  - Add proper In-Reply-To and References headers
  - _Requirements: 4.4_

- [ ] 7.5 Implement thread notifications

  - Add unread message tracking
  - Update thread list on new messages
  - Implement real-time updates via Supabase subscriptions
  - _Requirements: 4.5, 4.7_

- [x] 8. Email Sequences and Campaigns

- [x] 8.1 Create sequence database operations

  - Implement useEmailSequences hook for sequence CRUD
  - Add sequence_enrollments table operations
  - Create useSequenceEnrollments hook
  - _Requirements: 3.1, 3.4_

- [x] 8.2 Build EmailSequencesManager component

  - Create sequence list view with status indicators
  - Implement sequence creation form
  - Add sequence step builder with drag-and-drop
  - Build step configuration UI (delay, template, content)
  - _Requirements: 3.1, 3.2_

- [x] 8.3 Implement sequence activation and validation

  - Add sequence validation before activation
  - Check all steps have valid content
  - Validate delay configurations
  - Implement activation toggle
  - _Requirements: 3.3_

- [x] 8.4 Create sequence enrollment functionality

  - Build enrollment UI for adding contacts to sequences
  - Implement bulk enrollment from client/lead lists
  - Add enrollment status tracking
  - _Requirements: 3.4_

- [x] 8.5 Build process-email-sequences Edge Function

  - Create new Edge Function to process active sequences
  - Implement scheduling logic based on delay hours
  - Add automatic email sending for due sequence steps
  - Handle sequence completion and unenrollment
  - _Requirements: 3.5_

- [x] 8.6 Implement sequence reply handling

  - Add webhook logic to detect replies to sequence emails
  - Auto-unenroll contacts who reply
  - Update sequence_enrollments status
  - _Requirements: 3.6_

- [x] 8.7 Add sequence unsubscribe handling

  - Implement unsubscribe detection in webhooks
  - Stop all active sequences for unsubscribed contacts
  - Add to suppression list
  - _Requirements: 3.7_

- [x] 8.8 Create sequence analytics view

  - Display enrollment count per sequence
  - Calculate and show completion rate
  - Show open rate and reply rate per sequence
  - Add sequence performance comparison
  - _Requirements: 3.8_

- [x] 9. Email Deliverability Monitoring

- [x] 9.1 Create deliverability metrics hooks

  - Implement useEmailStats hook for overall metrics
  - Add useDeliverabilityMetrics hook for detailed tracking
  - Calculate delivery rate, bounce rate, spam rate
  - _Requirements: 5.1, 5.2_

- [x] 9.2 Build DeliverabilityDashboard component

  - Create overview cards for key metrics
  - Add daily trend charts for deliverability
  - Implement bounce type breakdown (hard vs soft)
  - Show warning indicators for high bounce rates
  - _Requirements: 5.1, 5.2, 5.8_

- [x] 9.3 Enhance webhook bounce handling

  - Update sendgrid-webhook function to capture bounce types
  - Store bounce reasons in email_events
  - Implement hard bounce detection
  - _Requirements: 5.3, 5.4_

- [x] 9.4 Implement suppression list management

  - Create useSuppressionList hook for list operations
  - Build SuppressionListView component
  - Add manual email suppression functionality
  - Implement suppression removal with confirmation
  - _Requirements: 5.5, 5.6, 5.7_

- [x] 9.5 Add automatic suppression on hard bounces

  - Update webhook to auto-add hard bounces to suppression list
  - Prevent sending to suppressed addresses
  - Add suppression reason tracking
  - _Requirements: 5.4_

- [x] 10. Email Analytics and Reporting

- [x] 10.1 Create analytics data hooks

  - Implement useEmailAnalytics hook with date range support
  - Add useEmailActivity hook for time-series data
  - Create useTemplatePerformance hook
  - Implement useRecipientEngagement hook
  - _Requirements: 6.1, 6.2, 6.4, 6.6_

- [x] 10.2 Build EmailAnalyticsDashboard component

  - Create overview section with key metrics cards
  - Add date range selector
  - Implement metric cards (sent, delivered, opened, clicked, replied)
  - _Requirements: 6.1, 6.2_

- [x] 10.3 Add engagement trend charts

  - Implement line chart for daily engagement metrics
  - Add bar chart for day-of-week analysis
  - Create hour-of-day heatmap for optimal send times
  - _Requirements: 6.3_

- [x] 10.4 Create recipient engagement leaderboard

  - Build ranked list of most engaged contacts
  - Add sorting by opens, clicks, replies
  - Show engagement scores per contact
  - _Requirements: 6.4_

- [x] 10.5 Implement template performance view

  - Display template usage statistics
  - Calculate average open rate per template
  - Show average click rate per template
  - Add template comparison functionality
  - _Requirements: 6.6_

- [x] 10.6 Add analytics export functionality

  - Implement CSV export for email communications
  - Include all relevant fields and metrics
  - Add date range filtering for exports
  - _Requirements: 6.5_

- [x] 10.7 Create analytics caching system

  - Implement email_analytics_cache table usage
  - Add generate-email-analytics Edge Function
  - Set up daily cron job for cache generation
  - Implement cache invalidation logic
  - _Requirements: 6.1, 6.2_

- [ ]\* 10.8 Add multiple open tracking

  - Update webhook to record each open event
  - Display total open count per email
  - Show open timestamps in email detail view
  - _Requirements: 6.7_

- [x] 11. Email Search and Filtering

- [x] 11.1 Implement email search functionality

  - Create useEmailSearch hook with full-text search
  - Add search across subject, body, sender, recipient
  - Implement search result highlighting
  - _Requirements: 10.1, 10.5_

- [x] 11.2 Build email filter UI

  - Create filter panel with multiple criteria
  - Add date range filter
  - Implement direction filter (sent/received)
  - Add status filter
  - Add client/lead filter
  - _Requirements: 10.2_

- [x] 11.3 Implement combined search and filter

  - Allow simultaneous search and filter application
  - Update results in real-time
  - Add filter chip display
  - _Requirements: 10.3_

- [x] 11.4 Add email sorting options

  - Implement sort by date, subject, recipient, status
  - Add ascending/descending toggle
  - Persist sort preferences
  - _Requirements: 10.4_

- [x] 11.5 Create saved search filters

  - Implement filter preset saving
  - Add preset management UI
  - Allow quick filter preset application
  - _Requirements: 10.6_

- [ ]\* 11.6 Add empty state handling

  - Display helpful message when no results found
  - Suggest search modifications
  - Add quick action buttons
  - _Requirements: 10.7_

- [ ] 12. Bulk Email Operations
- [ ] 12.1 Implement email selection functionality

  - Add checkbox selection to email lists
  - Implement select all/none functionality
  - Show selection count indicator
  - _Requirements: 11.1_

- [ ] 12.2 Create bulk action toolbar

  - Build toolbar that appears on selection
  - Add bulk delete action
  - Add bulk mark as read/unread action
  - Add bulk export action
  - _Requirements: 11.1, 11.3, 11.4_

- [ ] 12.3 Implement bulk delete with confirmation

  - Show confirmation dialog with count
  - Process deletion in batches
  - Update UI after completion
  - _Requirements: 11.2_

- [ ] 12.4 Add bulk status update

  - Implement batch update for read/unread status
  - Show progress indicator for large batches
  - _Requirements: 11.3_

- [ ]\* 12.5 Implement bulk tagging/labeling

  - Create email labels/tags system
  - Add bulk label application
  - Build label management UI
  - _Requirements: 11.5_

- [ ] 12.6 Add bulk operation safeguards

  - Implement warning for operations over 100 emails
  - Add batch processing for large operations
  - Show success message with affected count
  - _Requirements: 11.6, 11.7_

- [ ] 13. Email Notification Preferences
- [ ] 13.1 Create notification settings database schema

  - Add email_notification_preferences table or use profiles
  - Store preferences for each notification type
  - Add quiet hours configuration
  - _Requirements: 12.1, 12.6_

- [ ] 13.2 Build EmailNotificationSettings component

  - Create settings UI for all notification types
  - Add toggle switches for each notification
  - Implement quiet hours time picker
  - Add notification preview/test functionality
  - _Requirements: 12.1_

- [ ] 13.3 Implement notification triggers

  - Add push notification on new received email
  - Add notification on first email open
  - Add notification on email click
  - Add notification on email reply
  - _Requirements: 12.2, 12.3, 12.4, 12.5_

- [ ] 13.4 Add quiet hours enforcement

  - Check quiet hours before sending notifications
  - Queue notifications during quiet hours
  - Deliver queued notifications after quiet hours end
  - _Requirements: 12.6_

- [ ]\* 13.5 Implement notification grouping

  - Group multiple notifications of same type
  - Add summary notifications for bulk events
  - Implement notification priority levels
  - _Requirements: 12.7_

- [ ] 14. Enhanced Webhook Processing
- [ ] 14.1 Improve sendgrid-webhook function

  - Add comprehensive event type handling
  - Implement better error logging
  - Add event deduplication logic
  - Improve signature verification
  - _Requirements: 5.3, 6.7_

- [ ] 14.2 Enhance inbound-email function

  - Improve email parsing for various formats
  - Add better header extraction
  - Implement attachment handling for inbound emails
  - Add spam filtering logic
  - _Requirements: 4.5_

- [ ] 14.3 Add webhook retry mechanism

  - Implement exponential backoff for failed webhooks
  - Add dead letter queue for persistent failures
  - Create webhook processing monitoring
  - _Requirements: 5.3_

- [ ]\* 14.4 Create webhook testing utilities

  - Build webhook simulator for development
  - Add webhook event replay functionality
  - Implement webhook debugging tools
  - _Requirements: Testing_

- [ ] 15. UI/UX Polish and Integration
- [ ] 15.1 Create email navigation structure

  - Add email screens to app navigation
  - Create email tab or menu section
  - Implement deep linking for email views
  - _Requirements: 1.1, 4.1_

- [ ] 15.2 Implement loading states and skeletons

  - Add skeleton screens for email lists
  - Implement loading indicators for all async operations
  - Add pull-to-refresh functionality
  - _Requirements: 1.8_

- [ ] 15.3 Add error boundaries and fallbacks

  - Implement error boundaries for email components
  - Create user-friendly error messages
  - Add retry functionality for failed operations
  - _Requirements: Error Handling_

- [ ] 15.4 Optimize performance

  - Implement virtualized lists for large email collections
  - Add image lazy loading for attachments
  - Optimize React Query cache configuration
  - Implement pagination for email lists
  - _Requirements: Performance_

- [ ] 15.5 Add accessibility features

  - Implement proper ARIA labels
  - Add keyboard navigation support
  - Ensure proper color contrast
  - Add screen reader support
  - _Requirements: Accessibility_

- [ ]\* 15.6 Create onboarding and help

  - Add email feature tour for new users
  - Create contextual help tooltips
  - Build email feature documentation
  - _Requirements: UX_

- [ ] 16. Testing and Quality Assurance
- [ ] 16.1 Write unit tests for hooks

  - Test useEmails hook with all operations
  - Test useEmailSequences hook logic
  - Test useEmailAnalytics calculations
  - Test useEmailDrafts auto-save functionality
  - _Requirements: Testing Strategy_

- [ ] 16.2 Write component tests

  - Test EmailComposer form validation
  - Test EmailThreadsView rendering and interactions
  - Test EmailTemplatesManager CRUD operations
  - Test EmailSequencesManager step builder
  - _Requirements: Testing Strategy_

- [ ] 16.3 Write integration tests

  - Test complete email send flow
  - Test webhook event processing
  - Test sequence enrollment and processing
  - Test analytics calculation accuracy
  - _Requirements: Testing Strategy_

- [ ] 16.4 Perform end-to-end testing

  - Test critical user flows manually
  - Verify SendGrid integration
  - Test on multiple devices and screen sizes
  - Verify offline behavior
  - _Requirements: Testing Strategy_

- [ ] 16.5 Conduct performance testing

  - Test with large email volumes (1000+ emails)
  - Measure query performance
  - Test webhook processing under load
  - Verify memory usage and leaks
  - _Requirements: Performance_

- [ ] 16.6 Security testing
  - Verify RLS policies work correctly
  - Test input validation and sanitization
  - Verify webhook signature validation
  - Test authentication and authorization
  - _Requirements: Security_
