# Design Document: Enhanced Meeting Management

## Overview

The Enhanced Meeting Management system transforms NexaSuit's meeting functionality from a basic scheduling and recording tool into a comprehensive meeting intelligence platform. The system leverages AI for real-time transcription, automatic action item extraction, smart scheduling, and meeting analytics while maintaining the existing React Native architecture and Supabase backend.

### Key Design Goals

1. **Seamless Integration**: Build upon existing meeting infrastructure without breaking current functionality
2. **AI-Powered Intelligence**: Leverage OpenAI for transcription, analysis, and insights
3. **Real-Time Capabilities**: Provide live transcription and collaborative features during meetings
4. **Scalable Architecture**: Design for performance with large transcripts and multiple concurrent meetings
5. **Mobile-First Experience**: Optimize all features for mobile devices while supporting web platforms

### Technical Approach

The design follows NexaSuit's established patterns:

- React Native components with TypeScript
- Supabase for data persistence and real-time subscriptions
- React Query for server state management
- Custom hooks for business logic
- OpenAI API for AI-powered features
- Expo AV for audio/video handling

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Application                       │
├─────────────────────────────────────────────────────────────┤
│  Meeting UI Layer                                            │
│  ├── Meeting List & Calendar View                           │
│  ├── Meeting Detail & Recording Interface                   │
│  ├── Real-Time Transcription Display                        │
│  ├── Action Item Management                                 │
│  ├── Analytics Dashboard                                    │
│  └── Meeting Preparation View                               │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer (Custom Hooks)                        │
│  ├── useMeetings (enhanced)                                 │
│  ├── useMeetingTranscription                                │
│  ├── useMeetingActionItems                                  │
│  ├── useMeetingParticipants                                 │
│  ├── useMeetingAnalytics                                    │
│  ├── useMeetingTemplates                                    │
│  ├── useSmartScheduling                                     │
│  └── useMeetingNotes                                        │
├─────────────────────────────────────────────────────────────┤
│  AI Services Layer                                           │
│  ├── Real-Time Transcription Service                        │
│  ├── Action Item Extraction Service                         │
│  ├── Meeting Summary Generation                             │
│  ├── Smart Scheduling Algorithm                             │
│  └── Meeting Insights Generator                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
├─────────────────────────────────────────────────────────────┤
│  Database Tables                                             │
│  ├── meetings (enhanced)                                    │
│  ├── meeting_participants (new)                             │
│  ├── meeting_transcripts (new)                              │
│  ├── meeting_action_items (new)                             │
│  ├── meeting_notes (new)                                    │
│  ├── meeting_templates (new)                                │
│  ├── meeting_decisions (new)                                │
│  └── meeting_analytics_cache (new)                          │
├─────────────────────────────────────────────────────────────┤
│  Edge Functions                                              │
│  ├── process-meeting-transcription                          │
│  ├── extract-action-items                                   │
│  ├── generate-meeting-insights                              │
│  ├── send-meeting-notifications                             │
│  └── sync-external-calendars                                │
├─────────────────────────────────────────────────────────────┤
│  Real-Time Subscriptions                                     │
│  ├── Meeting status updates                                 │
│  ├── Transcription streaming                                │
│  ├── Participant join/leave events                          │
│  └── Action item updates                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Integrations                       │
├─────────────────────────────────────────────────────────────┤
│  ├── OpenAI API (Whisper, GPT-4)                           │
│  ├── Google Calendar API                                    │
│  ├── Zoom API                                               │
│  ├── Microsoft Teams API                                    │
│  └── Google Meet API                                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Meeting Creation Flow

1. User creates meeting via UI → MeetingForm component
2. Form validates and submits → useCreateMeeting hook
3. Hook inserts meeting record → Supabase meetings table
4. If template used → populate from meeting_templates
5. Add participants → meeting_participants table
6. Generate video conference link → external API
7. Send calendar invitations → calendar sync function
8. Return meeting object → update UI

#### Real-Time Transcription Flow

1. User starts recording → VoiceRecorder component
2. Audio chunks stream → transcription service
3. Service calls OpenAI Whisper API → real-time mode
4. Transcription segments return → meeting_transcripts table
5. Real-time subscription updates → UI displays text
6. Speaker diarization applied → label speakers
7. User can edit segments → update transcript records
8. Final transcript stored → linked to meeting

#### Action Item Extraction Flow

1. Meeting completes → trigger extraction function
2. Function retrieves transcript → meeting_transcripts
3. AI analyzes content → extract action items
4. Identified items presented → user review UI
5. User confirms/edits items → meeting_action_items table
6. Create tasks → tasks table with meeting link
7. Assign to participants → task_assignments
8. Send notifications → notification service

## Components and Interfaces

### Core Components

#### MeetingDetailEnhanced Component

```typescript
interface MeetingDetailEnhancedProps {
  meeting: EnrichedMeeting;
  visible: boolean;
  onClose: () => void;
  onUpdate: (meeting: EnrichedMeeting) => void;
}

// Features:
// - Tabbed interface (Overview, Transcript, Action Items, Notes, Analytics)
// - Real-time transcription display during recording
// - Action item management with task creation
// - Participant list with attendance tracking
// - Meeting notes editor with rich text
// - Quick actions (reschedule, add participants, export)
```

#### MeetingTranscriptionView Component

```typescript
interface MeetingTranscriptionViewProps {
  meetingId: string;
  isLive: boolean;
  onActionItemDetected: (item: ActionItemSuggestion) => void;
}

// Features:
// - Real-time transcript display with timestamps
// - Speaker identification and labeling
// - Inline editing capabilities
// - Highlight and annotate text
// - Search within transcript
// - Export transcript
```

#### ActionItemManager Component

```typescript
interface ActionItemManagerProps {
  meetingId: string;
  extractedItems: ActionItemSuggestion[];
  onConfirm: (items: ConfirmedActionItem[]) => void;
}

// Features:
// - List of AI-extracted action items
// - Edit item details (title, assignee, due date)
// - Link to existing tasks or create new
// - Assign to participants
// - Set priority and tags
// - Bulk actions
```

#### MeetingAnalyticsDashboard Component

```typescript
interface MeetingAnalyticsDashboardProps {
  userId: string;
  dateRange: DateRange;
  filters: AnalyticsFilters;
}

// Features:
// - Meeting count and duration metrics
// - Meeting type distribution chart
// - Client meeting frequency
// - Action item completion rate
// - Engagement scores
// - Trend visualizations
```

#### MeetingTemplateSelector Component

```typescript
interface MeetingTemplateSelectorProps {
  onSelect: (template: MeetingTemplate) => void;
  onCreateNew: () => void;
}

// Features:
// - Grid of available templates
// - Template preview
// - Custom template creation
// - Template editing
// - Default templates (Sales Call, Client Review, Team Sync, etc.)
```

#### SmartSchedulingAssistant Component

```typescript
interface SmartSchedulingAssistantProps {
  participants: Participant[];
  duration: number;
  onTimeSelected: (time: Date) => void;
}

// Features:
// - Calendar availability visualization
// - Suggested time slots
// - Conflict detection
// - Time zone handling
// - Participant availability status
```

#### MeetingNotesEditor Component

```typescript
interface MeetingNotesEditorProps {
  meetingId: string;
  initialNotes?: MeetingNotes;
  onSave: (notes: MeetingNotes) => void;
}

// Features:
// - Rich text editor
// - Structured sections (Key Points, Decisions, Questions)
// - Timestamp insertion
// - Formatting toolbar
// - Auto-save
// - Collaborative editing indicators
```

### Custom Hooks

#### useMeetingTranscription

```typescript
interface UseMeetingTranscriptionReturn {
  transcript: TranscriptSegment[];
  isTranscribing: boolean;
  startTranscription: (audioStream: MediaStream) => Promise<void>;
  stopTranscription: () => Promise<void>;
  updateSegment: (segmentId: string, text: string) => Promise<void>;
  searchTranscript: (query: string) => TranscriptSegment[];
}

function useMeetingTranscription(
  meetingId: string
): UseMeetingTranscriptionReturn;
```

#### useMeetingActionItems

```typescript
interface UseMeetingActionItemsReturn {
  actionItems: MeetingActionItem[];
  suggestions: ActionItemSuggestion[];
  isExtracting: boolean;
  extractActionItems: (transcriptId: string) => Promise<void>;
  confirmActionItem: (item: ActionItemSuggestion) => Promise<void>;
  createTaskFromItem: (item: MeetingActionItem) => Promise<Task>;
  updateActionItem: (
    id: string,
    updates: Partial<MeetingActionItem>
  ) => Promise<void>;
}

function useMeetingActionItems(meetingId: string): UseMeetingActionItemsReturn;
```

#### useMeetingParticipants

```typescript
interface UseMeetingParticipantsReturn {
  participants: MeetingParticipant[];
  addParticipant: (participant: ParticipantInput) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  updateAttendance: (
    participantId: string,
    status: AttendanceStatus
  ) => Promise<void>;
  sendInvitations: () => Promise<void>;
}

function useMeetingParticipants(
  meetingId: string
): UseMeetingParticipantsReturn;
```

#### useMeetingAnalytics

```typescript
interface UseMeetingAnalyticsReturn {
  metrics: MeetingMetrics;
  trends: MeetingTrends;
  insights: MeetingInsight[];
  isLoading: boolean;
  refreshAnalytics: () => Promise<void>;
  exportReport: (format: 'pdf' | 'csv') => Promise<string>;
}

function useMeetingAnalytics(
  filters: AnalyticsFilters
): UseMeetingAnalyticsReturn;
```

#### useMeetingTemplates

```typescript
interface UseMeetingTemplatesReturn {
  templates: MeetingTemplate[];
  createTemplate: (template: MeetingTemplateInput) => Promise<MeetingTemplate>;
  updateTemplate: (
    id: string,
    updates: Partial<MeetingTemplate>
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  applyTemplate: (templateId: string, meetingId: string) => Promise<void>;
}

function useMeetingTemplates(): UseMeetingTemplatesReturn;
```

#### useSmartScheduling

```typescript
interface UseSmartSchedulingReturn {
  suggestedTimes: TimeSlot[];
  isAnalyzing: boolean;
  findAvailability: (participants: string[], duration: number) => Promise<void>;
  checkConflicts: (time: Date) => Promise<Conflict[]>;
  scheduleOptimal: () => Promise<Date>;
}

function useSmartScheduling(meetingId: string): UseSmartSchedulingReturn;
```

## Data Models

### Enhanced Meetings Table

```sql
CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  meeting_type text DEFAULT 'video' CHECK (meeting_type IN ('video', 'phone', 'in-person')),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  agenda text,
  summary text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  google_calendar_event_id text,
  zoom_meeting_id text,
  teams_meeting_id text,
  meet_link text,
  voice_recording_id uuid,
  template_id uuid REFERENCES meeting_templates(id),
  engagement_score decimal(3,2),
  preparation_sent boolean DEFAULT false,
  follow_up_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Meeting Participants Table

```sql
CREATE TABLE meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  participant_type text NOT NULL CHECK (participant_type IN ('client', 'lead', 'team_member', 'external')),
  participant_id uuid, -- References clients, leads, or profiles
  participant_name text NOT NULL,
  participant_email text,
  role text, -- organizer, required, optional
  attendance_status text DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'accepted', 'declined', 'tentative', 'attended', 'no_show')),
  joined_at timestamptz,
  left_at timestamptz,
  duration_minutes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Meeting Transcripts Table

```sql
CREATE TABLE meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  speaker_id text,
  speaker_name text,
  text text NOT NULL,
  start_time decimal(10,3), -- seconds from meeting start
  end_time decimal(10,3),
  confidence decimal(3,2),
  is_edited boolean DEFAULT false,
  original_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, segment_index)
);
```

### Meeting Action Items Table

```sql
CREATE TABLE meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  assignee_name text,
  due_date timestamptz,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  source_transcript_segment uuid REFERENCES meeting_transcripts(id),
  confidence decimal(3,2),
  is_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Meeting Notes Table

```sql
CREATE TABLE meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('key_points', 'decisions', 'questions', 'general')),
  content text NOT NULL,
  timestamp_in_meeting decimal(10,3), -- seconds from meeting start
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Meeting Templates Table

```sql
CREATE TABLE meeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  meeting_type text DEFAULT 'video',
  default_duration_minutes integer DEFAULT 60,
  agenda_template text,
  is_system_template boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb, -- {frequency: 'weekly', interval: 1, days: ['monday']}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Meeting Decisions Table

```sql
CREATE TABLE meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  decision_type text CHECK (decision_type IN ('approved', 'rejected', 'deferred', 'information')),
  title text NOT NULL,
  description text,
  agenda_item text,
  impact text,
  related_task_ids uuid[],
  decided_by text,
  timestamp_in_meeting decimal(10,3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Meeting Analytics Cache Table

```sql
CREATE TABLE meeting_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metrics jsonb NOT NULL, -- Cached analytics data
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);
```

### TypeScript Interfaces

```typescript
interface EnrichedMeeting extends MeetingRecord {
  client_name: string | null;
  participants: MeetingParticipant[];
  action_items_count: number;
  transcript_segments_count: number;
  notes_count: number;
  decisions_count: number;
}

interface MeetingParticipant {
  id: string;
  meeting_id: string;
  participant_type: 'client' | 'lead' | 'team_member' | 'external';
  participant_id: string | null;
  participant_name: string;
  participant_email: string | null;
  role: 'organizer' | 'required' | 'optional';
  attendance_status:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'tentative'
    | 'attended'
    | 'no_show';
  joined_at: string | null;
  left_at: string | null;
  duration_minutes: number | null;
}

interface TranscriptSegment {
  id: string;
  meeting_id: string;
  segment_index: number;
  speaker_id: string | null;
  speaker_name: string | null;
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  is_edited: boolean;
  original_text: string | null;
}

interface MeetingActionItem {
  id: string;
  meeting_id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  source_transcript_segment: string | null;
  confidence: number;
  is_confirmed: boolean;
}

interface ActionItemSuggestion {
  title: string;
  description: string;
  suggested_assignee: string | null;
  suggested_due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  source_segment_id: string;
  context: string;
}

interface MeetingNotes {
  id: string;
  meeting_id: string;
  user_id: string;
  section: 'key_points' | 'decisions' | 'questions' | 'general';
  content: string;
  timestamp_in_meeting: number | null;
  created_at: string;
}

interface MeetingTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  meeting_type: 'video' | 'phone' | 'in-person';
  default_duration_minutes: number;
  agenda_template: string | null;
  is_system_template: boolean;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
}

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days?: string[]; // For weekly: ['monday', 'wednesday']
  day_of_month?: number; // For monthly
  end_date?: string;
}

interface MeetingDecision {
  id: string;
  meeting_id: string;
  decision_type: 'approved' | 'rejected' | 'deferred' | 'information';
  title: string;
  description: string | null;
  agenda_item: string | null;
  impact: string | null;
  related_task_ids: string[];
  decided_by: string | null;
  timestamp_in_meeting: number | null;
}

interface MeetingMetrics {
  total_meetings: number;
  total_duration_minutes: number;
  average_duration_minutes: number;
  meetings_by_type: Record<string, number>;
  meetings_by_status: Record<string, number>;
  action_items_created: number;
  action_items_completed: number;
  average_engagement_score: number;
  most_frequent_participants: Array<{ name: string; count: number }>;
}

interface MeetingTrends {
  meetings_over_time: Array<{ date: string; count: number }>;
  duration_trend: Array<{ date: string; total_minutes: number }>;
  completion_rate_trend: Array<{ date: string; rate: number }>;
}

interface MeetingInsight {
  type: 'suggestion' | 'warning' | 'achievement';
  title: string;
  description: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
}

interface TimeSlot {
  start_time: Date;
  end_time: Date;
  available_participants: string[];
  unavailable_participants: string[];
  score: number; // 0-1, higher is better
  conflicts: Conflict[];
}

interface Conflict {
  participant_id: string;
  participant_name: string;
  conflicting_event: string;
  event_time: Date;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Transcription Initiation

_For any_ meeting recording that is started, the transcription service should be initiated and produce transcript segments
**Validates: Requirements 1.1**

### Property 2: Speaker Differentiation

_For any_ audio input with multiple speakers, the transcription system should produce segments with distinct speaker identifiers
**Validates: Requirements 1.3**

### Property 3: Transcript Edit Preservation

_For any_ transcript segment that is edited, the system should store both the edited version and preserve the original text
**Validates: Requirements 1.4**

### Property 4: Transcript Completeness

_For any_ completed transcription, all segments should have valid timestamps (start_time and end_time)
**Validates: Requirements 1.5**

### Property 5: Action Item Extraction Attempt

_For any_ meeting transcript, the system should attempt action item extraction and return a result (even if empty)
**Validates: Requirements 2.1**

### Property 6: Action Item Structure

_For any_ extracted action item, it should contain at minimum a title field and optionally assignee and due_date fields
**Validates: Requirements 2.2**

### Property 7: Task Creation from Action Item

_For any_ confirmed action item, a corresponding task should be created with matching title, description, and due date
**Validates: Requirements 2.4**

### Property 8: Entity Linking

_For any_ action item that mentions a client or lead name, if that entity exists in the system, the created task should be linked to that entity's ID
**Validates: Requirements 2.5**

### Property 9: Multiple Participants Support

_For any_ meeting, the system should support adding multiple participant records of different types (client, lead, team_member)
**Validates: Requirements 3.1**

### Property 10: Attendance Tracking

_For any_ participant join event during a meeting, the attendance_status should be updated and joined_at timestamp recorded
**Validates: Requirements 3.3**

### Property 11: Participation Duration Recording

_For any_ completed meeting, all participants who attended should have a duration_minutes value calculated from joined_at and left_at
**Validates: Requirements 3.4**

### Property 12: Analytics Calculation Accuracy

_For any_ set of meetings in a given period, the total duration should equal the sum of individual meeting durations
**Validates: Requirements 4.1**

### Property 13: Meeting Distribution Aggregation

_For any_ set of meetings, the sum of meetings across all distribution categories (by type, status, client) should equal the total meeting count
**Validates: Requirements 4.2**

### Property 14: Engagement Score Determinism

_For any_ meeting with fixed inputs (duration, action_items_count, completion_rate), the engagement score calculation should produce the same result
**Validates: Requirements 4.3**

### Property 15: Percentage Change Calculation

_For any_ two time periods with meeting metrics, the percentage change calculation should be mathematically correct: ((new - old) / old) \* 100
**Validates: Requirements 4.5**

### Property 16: Template Application

_For any_ meeting template, applying it to a new meeting should populate the meeting's agenda, duration, and meeting_type fields with the template's values
**Validates: Requirements 5.2**

### Property 17: Recurring Meeting Generation

_For any_ template with a recurrence pattern, generating recurring meetings should create the correct number of instances based on the pattern's frequency and interval
**Validates: Requirements 5.5**

### Property 18: Availability Analysis

_For any_ set of participants and requested duration, the scheduling algorithm should return time slots where at least one participant is available
**Validates: Requirements 6.1**

### Property 19: Maximum Availability Optimization

_For any_ scheduling scenario with no perfect availability, the suggested times should be sorted by the number of available participants (descending)
**Validates: Requirements 6.2**

### Property 20: Time Zone Conversion

_For any_ participant with a specified time zone, suggested meeting times should be converted correctly to their local time
**Validates: Requirements 6.3**

### Property 21: Scheduling Score Consistency

_For any_ time slot, the availability score should be calculated consistently based on available participants, preferences, and historical patterns
**Validates: Requirements 6.4**

### Property 22: Note Timestamping

_For any_ note created during a meeting, it should automatically receive a timestamp_in_meeting value representing seconds from meeting start
**Validates: Requirements 7.2**

### Property 23: Notes and Summary Combination

_For any_ completed meeting with both manual notes and AI summary, the combined output should include content from both sources
**Validates: Requirements 7.4**

### Property 24: Unique Meeting Link Generation

_For any_ video meeting created, the generated meeting link should be unique and not conflict with existing meeting links
**Validates: Requirements 8.1**

### Property 25: Calendar Invitation Link Inclusion

_For any_ video meeting with a generated link, the calendar invitation should contain that link in the location or description field
**Validates: Requirements 8.5**

### Property 26: Follow-up Email Generation

_For any_ meeting that transitions to completed status, a follow-up email should be generated containing the summary and action items
**Validates: Requirements 9.1**

### Property 27: Follow-up Recipient Completeness

_For any_ follow-up email, the recipient list should include all participants from the meeting_participants table
**Validates: Requirements 9.2**

### Property 28: Action Item Assignment Notifications

_For any_ action item with an assignee_id, a notification should be created and sent to that assignee
**Validates: Requirements 9.3**

### Property 29: Follow-up Meeting Suggestion

_For any_ completed meeting with action items, if any action item has a due date, the system should suggest a follow-up meeting date based on the earliest due date
**Validates: Requirements 9.5**

### Property 30: Full-Text Search Coverage

_For any_ search query, the results should include meetings where the query matches any of: title, description, transcript text, or summary
**Validates: Requirements 10.1**

### Property 31: Filter Application Correctness

_For any_ filter criteria applied (date range, client, status, type), only meetings matching ALL criteria should be returned
**Validates: Requirements 10.2**

### Property 32: Search Context Extraction

_For any_ transcript search match, the returned result should include surrounding context (e.g., 50 characters before and after the match)
**Validates: Requirements 10.3**

### Property 33: Saved Search Persistence

_For any_ search that is saved, retrieving it later should return the exact same filter criteria that were saved
**Validates: Requirements 10.5**

### Property 34: Preparation Data Compilation

_For any_ meeting with a client_id or lead_id, the preparation data should include that entity's basic information and contact details
**Validates: Requirements 11.1**

### Property 35: Historical Meeting Retrieval

_For any_ meeting with participants, the system should retrieve all previous meetings that share at least one participant
**Validates: Requirements 11.2**

### Property 36: Related Action Items Retrieval

_For any_ meeting with participants, the system should retrieve all open action items and tasks where the assignee matches a meeting participant
**Validates: Requirements 11.3**

### Property 37: AI Talking Points Generation

_For any_ meeting with a client/lead that has previous interactions, the AI should generate at least one suggested talking point
**Validates: Requirements 11.5**

### Property 38: Decision-Agenda Linking

_For any_ decision recorded with an agenda_item value, that decision should be retrievable when querying by that agenda item
**Validates: Requirements 12.3**

### Property 39: Decision-Task Linking

_For any_ decision with related_task_ids, all specified task IDs should exist in the tasks table
**Validates: Requirements 12.5**

### Property 40: Meeting Confirmation Notifications

_For any_ meeting that is created with status 'scheduled', a notification should be sent to all participants
**Validates: Requirements 13.1**

### Property 41: Status Change Notifications

_For any_ meeting that changes status to 'cancelled' or has its start_time updated, notifications should be sent to all participants
**Validates: Requirements 13.3**

### Property 42: Assignment Notifications

_For any_ action item that is assigned (assignee_id is set), a notification should be created for that assignee
**Validates: Requirements 13.4**

### Property 43: Export Completeness

_For any_ meeting export, the generated document should include sections for summary, transcript, action items, and participants (if they exist)
**Validates: Requirements 14.1**

### Property 44: Bulk Export Filter Respect

_For any_ bulk export with date range filters, only meetings within that date range should be included in the export
**Validates: Requirements 14.2**

### Property 45: Report Analytics Inclusion

_For any_ generated report, it should include at least one analytics metric (total meetings, duration, or distribution)
**Validates: Requirements 14.3**

### Property 46: Secure Sharing Expiration

_For any_ shareable link created with an expiration date, accessing the link after the expiration should return an error or access denied
**Validates: Requirements 14.5**

### Property 47: Transcript-Audio Synchronization

_For any_ transcript segment with start_time and end_time, playing the audio at that timestamp should correspond to the transcript text
**Validates: Requirements 15.3**

### Property 48: Storage Usage Accuracy

_For any_ user's recordings, the calculated storage usage should equal the sum of all recording file sizes
**Validates: Requirements 15.4**

## Error Handling

### Transcription Errors

**Scenario**: Audio quality is poor or contains no speech

- **Handling**: Return empty transcript with confidence score of 0
- **User Feedback**: Display message indicating transcription quality issues
- **Recovery**: Allow manual transcript entry or re-recording

**Scenario**: OpenAI API rate limit exceeded

- **Handling**: Queue transcription request for retry with exponential backoff
- **User Feedback**: Show "Processing..." status with estimated wait time
- **Recovery**: Process queued requests when rate limit resets

**Scenario**: Network failure during real-time transcription

- **Handling**: Buffer audio locally and resume when connection restored
- **User Feedback**: Show offline indicator
- **Recovery**: Sync buffered audio when online

### Action Item Extraction Errors

**Scenario**: AI fails to extract any action items from transcript

- **Handling**: Return empty array, allow manual action item creation
- **User Feedback**: Suggest manual review of transcript
- **Recovery**: User can manually create action items

**Scenario**: Extracted action item has invalid assignee name

- **Handling**: Create action item without assignee_id, flag for review
- **User Feedback**: Highlight unmatched assignee for user correction
- **Recovery**: User can assign to correct participant

### Scheduling Errors

**Scenario**: No availability found for any participants

- **Handling**: Return all time slots with availability scores
- **User Feedback**: Show "No perfect match" message with best alternatives
- **Recovery**: User can manually select time or adjust participant list

**Scenario**: Calendar API integration fails

- **Handling**: Create meeting without external calendar sync
- **User Feedback**: Show warning that calendar invitation wasn't sent
- **Recovery**: Provide manual calendar export option

### Storage Errors

**Scenario**: Storage quota exceeded

- **Handling**: Prevent new recordings, show storage management UI
- **User Feedback**: Display storage usage and suggest recordings to delete
- **Recovery**: User deletes old recordings or upgrades storage

**Scenario**: Recording file corruption

- **Handling**: Mark recording as corrupted, preserve transcript if available
- **User Feedback**: Show error message, offer transcript-only view
- **Recovery**: No automatic recovery, transcript remains accessible

### Data Consistency Errors

**Scenario**: Meeting deleted while transcription in progress

- **Handling**: Cancel transcription, clean up partial data
- **User Feedback**: Silent cleanup, no user action needed
- **Recovery**: Automatic cleanup of orphaned records

**Scenario**: Participant removed while action item assigned to them

- **Handling**: Keep action item, mark assignee as "removed participant"
- **User Feedback**: Show warning in action item list
- **Recovery**: User can reassign to active participant

## Testing Strategy

### Unit Testing

**Component Testing**:

- Test each React component in isolation with mock data
- Verify prop handling and state management
- Test error states and edge cases
- Use React Testing Library for component tests

**Hook Testing**:

- Test custom hooks with React Hooks Testing Library
- Mock Supabase client and API calls
- Verify query invalidation and cache updates
- Test error handling and loading states

**Utility Function Testing**:

- Test AI service functions with mocked OpenAI responses
- Test date/time calculations and time zone conversions
- Test analytics calculations with known inputs
- Test search and filter logic

**Example Unit Tests**:

```typescript
// Test transcript edit preservation
test('editing transcript preserves original', async () => {
  const segment = createMockSegment({ text: 'original' });
  await updateSegment(segment.id, 'edited');
  const updated = await getSegment(segment.id);
  expect(updated.text).toBe('edited');
  expect(updated.original_text).toBe('original');
  expect(updated.is_edited).toBe(true);
});

// Test action item task creation
test('confirmed action item creates task', async () => {
  const actionItem = createMockActionItem();
  const task = await createTaskFromActionItem(actionItem);
  expect(task.title).toBe(actionItem.title);
  expect(task.description).toBe(actionItem.description);
  expect(task.due_date).toBe(actionItem.due_date);
});

// Test analytics calculation
test('total duration equals sum of meetings', () => {
  const meetings = [{ duration: 30 }, { duration: 45 }, { duration: 60 }];
  const metrics = calculateMetrics(meetings);
  expect(metrics.total_duration_minutes).toBe(135);
});
```

### Property-Based Testing

The system will use **fast-check** (JavaScript/TypeScript property-based testing library) to verify universal properties across randomly generated inputs.

**Configuration**:

- Minimum 100 iterations per property test
- Use custom generators for domain-specific types
- Seed tests for reproducibility
- Tag each test with corresponding design property number

**Property Test Examples**:

```typescript
// Property 3: Transcript Edit Preservation
test('Property 3: Transcript edit preservation', () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.uuid(),
        text: fc.string({ minLength: 1, maxLength: 500 }),
        meeting_id: fc.uuid(),
      }),
      fc.string({ minLength: 1, maxLength: 500 }),
      async (segment, newText) => {
        const original = segment.text;
        await updateTranscriptSegment(segment.id, newText);
        const updated = await getTranscriptSegment(segment.id);

        expect(updated.text).toBe(newText);
        expect(updated.original_text).toBe(original);
        expect(updated.is_edited).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 12: Analytics Calculation Accuracy
test('Property 12: Total duration equals sum', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc
          .record({
            id: fc.uuid(),
            start_time: fc.date(),
            end_time: fc.date(),
          })
          .filter((m) => m.end_time > m.start_time)
      ),
      (meetings) => {
        const durations = meetings.map(
          (m) => (m.end_time.getTime() - m.start_time.getTime()) / 60000
        );
        const expectedTotal = durations.reduce((sum, d) => sum + d, 0);

        const metrics = calculateMeetingMetrics(meetings);

        expect(
          Math.abs(metrics.total_duration_minutes - expectedTotal)
        ).toBeLessThan(0.01);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 18: Availability Analysis
test('Property 18: Availability analysis returns valid slots', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.uuid(),
          name: fc.string(),
          availability: fc.array(
            fc.record({
              start: fc.date(),
              end: fc.date(),
            })
          ),
        }),
        { minLength: 1, maxLength: 10 }
      ),
      fc.integer({ min: 15, max: 120 }),
      async (participants, duration) => {
        const slots = await findAvailableTimeSlots(participants, duration);

        // All returned slots should have at least one available participant
        slots.forEach((slot) => {
          expect(slot.available_participants.length).toBeGreaterThan(0);
        });
      }
    ),
    { numRuns: 100 }
  );
});

// Property 30: Full-Text Search Coverage
test('Property 30: Search covers all fields', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.uuid(),
          title: fc.string(),
          description: fc.string(),
          summary: fc.string(),
          transcript: fc.string(),
        })
      ),
      fc.string({ minLength: 3 }),
      async (meetings, query) => {
        const results = await searchMeetings(query);

        // Every result should contain the query in at least one field
        results.forEach((result) => {
          const matchesTitle = result.title.includes(query);
          const matchesDesc = result.description?.includes(query);
          const matchesSummary = result.summary?.includes(query);
          const matchesTranscript = result.transcript?.includes(query);

          expect(
            matchesTitle || matchesDesc || matchesSummary || matchesTranscript
          ).toBe(true);
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

**Custom Generators**:

```typescript
// Generator for valid meeting records
const meetingGenerator = fc
  .record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    start_time: fc.date(),
    end_time: fc.date(),
    status: fc.constantFrom(
      'scheduled',
      'in_progress',
      'completed',
      'cancelled'
    ),
    meeting_type: fc.constantFrom('video', 'phone', 'in-person'),
  })
  .filter((m) => m.end_time > m.start_time);

// Generator for transcript segments
const transcriptSegmentGenerator = fc
  .record({
    id: fc.uuid(),
    meeting_id: fc.uuid(),
    segment_index: fc.integer({ min: 0, max: 1000 }),
    speaker_id: fc.option(fc.string(), { nil: null }),
    text: fc.string({ minLength: 1, maxLength: 500 }),
    start_time: fc.float({ min: 0, max: 7200 }),
    end_time: fc.float({ min: 0, max: 7200 }),
    confidence: fc.float({ min: 0, max: 1 }),
  })
  .filter((s) => s.end_time > s.start_time);

// Generator for action items
const actionItemGenerator = fc.record({
  id: fc.uuid(),
  meeting_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string(), { nil: null }),
  assignee_id: fc.option(fc.uuid(), { nil: null }),
  due_date: fc.option(fc.date(), { nil: null }),
  priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
  status: fc.constantFrom('pending', 'confirmed', 'completed', 'cancelled'),
  confidence: fc.float({ min: 0, max: 1 }),
});
```

### Integration Testing

**Database Integration**:

- Test Supabase queries with test database
- Verify RLS policies work correctly
- Test real-time subscriptions
- Test transaction handling

**API Integration**:

- Test OpenAI API calls with test API key
- Mock external calendar APIs (Google, Zoom)
- Test webhook handling
- Test rate limiting and retry logic

**End-to-End Flows**:

- Complete meeting lifecycle (create → record → transcribe → extract → follow-up)
- Multi-participant meeting with attendance tracking
- Template application and recurring meeting generation
- Search and export workflows

### Performance Testing

**Transcription Performance**:

- Test real-time transcription with various audio lengths
- Measure latency from audio to transcript display
- Test concurrent transcription sessions

**Analytics Performance**:

- Test analytics calculation with large datasets (1000+ meetings)
- Measure query performance for complex filters
- Test caching effectiveness

**Search Performance**:

- Test full-text search with large transcript corpus
- Measure search response time
- Test pagination and result limiting

### Accessibility Testing

**Screen Reader Compatibility**:

- Test all components with screen readers
- Verify ARIA labels and roles
- Test keyboard navigation

**Visual Accessibility**:

- Test color contrast ratios
- Verify text sizing and spacing
- Test with various zoom levels

## Implementation Notes

### Phase 1: Foundation (Weeks 1-2)

- Database schema updates
- Enhanced meeting hooks
- Basic participant management
- Transcript storage structure

### Phase 2: Core Features (Weeks 3-5)

- Real-time transcription integration
- Action item extraction
- Meeting notes functionality
- Template system

### Phase 3: Intelligence (Weeks 6-7)

- Smart scheduling algorithm
- Meeting analytics
- AI-powered insights
- Preparation assistance

### Phase 4: Integration (Week 8)

- Video conferencing APIs
- Calendar synchronization
- Notification system
- Follow-up automation

### Phase 5: Polish (Week 9-10)

- Export and reporting
- Search optimization
- Performance tuning
- Comprehensive testing

### Technical Considerations

**Real-Time Transcription**:

- Use WebSocket or Server-Sent Events for streaming
- Implement chunked audio processing
- Handle network interruptions gracefully
- Buffer audio locally during connectivity issues

**Scalability**:

- Implement pagination for large transcript lists
- Use database indexes on frequently queried fields
- Cache analytics calculations
- Implement lazy loading for meeting details

**Security**:

- Encrypt recordings at rest
- Implement secure sharing with token-based access
- Validate all user inputs
- Implement rate limiting on AI API calls

**Mobile Optimization**:

- Optimize audio recording for mobile devices
- Implement efficient transcript rendering
- Use virtualized lists for large datasets
- Minimize battery usage during recording

**Offline Support**:

- Cache meeting data for offline viewing
- Queue actions for sync when online
- Store recordings locally until uploaded
- Provide offline indicators
