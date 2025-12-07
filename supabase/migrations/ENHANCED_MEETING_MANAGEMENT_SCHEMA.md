# Enhanced Meeting Management Schema Documentation

## Overview

This migration adds comprehensive meeting management features to NexaSuit, transforming the basic meeting functionality into a full-featured meeting intelligence platform with real-time transcription, action item extraction, participant management, analytics, and more.

## Migration File

`20250201000000_enhanced_meeting_management.sql`

## Schema Changes

### 1. Enhanced Meetings Table

**New Columns Added:**

- `zoom_meeting_id` (text) - Zoom meeting identifier for integration
- `teams_meeting_id` (text) - Microsoft Teams meeting identifier
- `meet_link` (text) - Google Meet link or other video conference URL
- `template_id` (uuid) - Reference to meeting template used
- `engagement_score` (decimal) - Calculated engagement metric (0-1)
- `preparation_sent` (boolean) - Flag for preparation notification sent
- `follow_up_sent` (boolean) - Flag for follow-up email sent

**Updated Constraints:**

- Status check constraint now includes 'in_progress' state
- Added foreign key to meeting_templates table

### 2. New Tables

#### meeting_participants

Tracks all participants in meetings including clients, leads, team members, and external attendees.

**Key Fields:**

- `participant_type` - Type of participant (client, lead, team_member, external)
- `participant_id` - Reference to the actual entity (client/lead/profile)
- `attendance_status` - Tracks invitation response and actual attendance
- `joined_at` / `left_at` - Timestamps for attendance tracking
- `duration_minutes` - Calculated participation duration

**Use Cases:**

- Track who attended meetings
- Calculate participation metrics
- Send targeted invitations and reminders
- Link meetings to clients/leads

#### meeting_transcripts

Stores real-time transcription segments with speaker identification.

**Key Fields:**

- `segment_index` - Order of transcript segments
- `speaker_id` / `speaker_name` - Speaker identification
- `text` - Transcribed text content
- `start_time` / `end_time` - Timestamps in seconds from meeting start
- `confidence` - AI confidence score (0-1)
- `is_edited` / `original_text` - Edit tracking

**Use Cases:**

- Real-time transcription display
- Searchable meeting content
- Action item extraction source
- Meeting review and analysis

**Performance:**

- Full-text search index on text column
- Unique constraint on (meeting_id, segment_index)

#### meeting_action_items

AI-extracted and manually created action items from meetings.

**Key Fields:**

- `task_id` - Link to created task in task management system
- `assignee_id` / `assignee_name` - Action item assignment
- `source_transcript_segment` - Link to transcript where item was mentioned
- `confidence` - AI extraction confidence
- `is_confirmed` - User confirmation flag

**Use Cases:**

- Automatic action item extraction
- Task creation from meetings
- Follow-up tracking
- Meeting outcome measurement

#### meeting_notes

Structured note-taking during meetings with sections.

**Key Fields:**

- `section` - Note category (key_points, decisions, questions, general)
- `content` - Note text with rich formatting support
- `timestamp_in_meeting` - When note was taken (seconds from start)

**Use Cases:**

- Structured note-taking
- Collaborative meeting documentation
- Meeting summary generation
- Historical reference

#### meeting_templates

Pre-configured meeting structures for common meeting types.

**Key Fields:**

- `is_system_template` - System vs user-created templates
- `agenda_template` - Pre-filled agenda text
- `is_recurring` - Supports recurring meetings
- `recurrence_pattern` - JSONB pattern definition

**Use Cases:**

- Quick meeting creation
- Standardized meeting formats
- Recurring meeting generation
- Best practice enforcement

**Default Templates:**

- Sales Call (30 min)
- Client Review (60 min)
- Team Sync (30 min, recurring)
- Discovery Call (45 min)
- Project Kickoff (90 min)

#### meeting_decisions

Formal decision tracking linked to meetings.

**Key Fields:**

- `decision_type` - Type of decision (approved, rejected, deferred, information)
- `agenda_item` - Link to specific agenda item
- `related_task_ids` - Array of related task IDs
- `timestamp_in_meeting` - When decision was made

**Use Cases:**

- Decision documentation
- Accountability tracking
- Historical decision reference
- Task linkage

#### meeting_analytics_cache

Cached analytics calculations for performance.

**Key Fields:**

- `period_start` / `period_end` - Time period for cached data
- `metrics` - JSONB containing calculated metrics

**Use Cases:**

- Fast analytics dashboard loading
- Reduce database query load
- Historical trend analysis
- Performance optimization

## Security (Row Level Security)

All new tables have RLS enabled with policies that:

1. **meeting_participants, meeting_transcripts, meeting_action_items, meeting_decisions**

   - Users can only access records for meetings they own
   - All CRUD operations check meeting ownership

2. **meeting_notes**

   - Users can read notes for their meetings
   - Users can only modify their own notes

3. **meeting_templates**

   - Users can read their own templates and system templates
   - Users can only modify their own templates (not system templates)

4. **meeting_analytics_cache**
   - Users can only access their own cached analytics

## Performance Optimizations

### Indexes Created

**meeting_participants:**

- meeting_id (foreign key lookup)
- participant_id (entity lookup)
- participant_type (filtering)
- attendance_status (filtering)

**meeting_transcripts:**

- meeting_id (foreign key lookup)
- (meeting_id, segment_index) (ordered retrieval)
- speaker_id (speaker filtering)
- Full-text search on text column (GIN index)

**meeting_action_items:**

- meeting_id (foreign key lookup)
- task_id (task linkage)
- assignee_id (assignee filtering)
- status (status filtering)
- due_date (date-based queries)

**meeting_notes:**

- meeting_id (foreign key lookup)
- user_id (user filtering)
- section (section filtering)

**meeting_templates:**

- user_id (user templates)
- is_system_template (system template filtering)

**meeting_decisions:**

- meeting_id (foreign key lookup)
- decision_type (type filtering)

**meeting_analytics_cache:**

- user_id (user lookup)
- (user_id, period_start, period_end) (period lookup)

**meetings (additional):**

- template_id (template usage)
- status (status filtering)
- engagement_score (sorting/filtering)

## Triggers

All new tables have `updated_at` triggers that automatically update the timestamp on record modification.

## Data Integrity

### Foreign Key Constraints

- All meeting-related tables cascade delete when meeting is deleted
- Template deletion sets meeting.template_id to NULL
- Task deletion sets action_item.task_id to NULL
- Transcript deletion sets action_item.source_transcript_segment to NULL

### Check Constraints

- Participant types limited to valid values
- Attendance status limited to valid values
- Meeting types limited to valid values
- Decision types limited to valid values
- Priority levels limited to valid values
- Note sections limited to valid values

### Unique Constraints

- (meeting_id, segment_index) on transcripts - ensures ordered segments
- (user_id, period_start, period_end) on analytics cache - prevents duplicate caches

## Migration Verification

Run the verification script to ensure all changes were applied:

```sql
\i supabase/migrations/verify_enhanced_meeting_management.sql
```

This will check:

- All new columns exist on meetings table
- All new tables were created
- RLS is enabled on all tables
- All indexes were created
- All RLS policies exist
- All triggers are active
- System templates were inserted

## Rollback Considerations

If rollback is needed, the following should be dropped in reverse order:

1. Drop foreign key constraint on meetings.template_id
2. Drop all triggers
3. Drop all indexes
4. Drop all RLS policies
5. Drop all new tables
6. Remove new columns from meetings table
7. Restore original status check constraint

## Requirements Validated

This schema supports the following requirements from the design document:

- **Requirement 1.5**: Transcript storage with timestamps
- **Requirement 3.1**: Multiple participant support
- **Requirement 3.4**: Participation duration tracking
- **Requirement 7.1**: Structured note-taking
- **Requirement 12.1**: Decision recording
- **Requirement 15.1**: Recording metadata storage

## Next Steps

After this migration:

1. Update TypeScript types to match new schema
2. Create custom hooks for data access (useMeetingParticipants, useMeetingTranscription, etc.)
3. Implement UI components for new features
4. Set up OpenAI integration for transcription and extraction
5. Implement analytics calculation functions
6. Create notification system for meeting events
7. Build export and reporting functionality

## Notes

- System templates are inserted with `user_id = NULL` and `is_system_template = true`
- The full-text search index on transcripts uses English language configuration
- Analytics cache uses JSONB for flexible metric storage
- Recurrence patterns use JSONB for flexible pattern definitions
- All timestamps use `timestamptz` for proper timezone handling
