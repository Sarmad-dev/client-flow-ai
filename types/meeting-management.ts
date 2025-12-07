// Enhanced Meeting Management Type Definitions
// This file contains all TypeScript interfaces for the comprehensive meeting management system

import { z } from 'zod';

// Re-export the base MeetingRecord interface from hooks for consistency
export type { MeetingRecord } from '@/hooks/useMeetings';

// ============================================================================
// Core Meeting Interfaces
// ============================================================================

/**
 * EnrichedMeeting extends the base MeetingRecord with additional fields
 * from the enhanced meeting management system
 */
export interface EnrichedMeeting {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  meeting_type: 'video' | 'phone' | 'in-person';
  start_time: string;
  end_time: string;
  location: string | null;
  agenda: string | null;
  summary: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  voice_recording_id: string | null;
  created_at: string;
  updated_at: string;

  // Enhanced fields
  google_calendar_event_id: string | null;
  zoom_meeting_id: string | null;
  teams_meeting_id: string | null;
  meet_link: string | null;
  template_id: string | null;
  engagement_score: number | null;
  preparation_sent: boolean;
  follow_up_sent: boolean;

  // Computed/joined fields
  client_name: string | null;
  participants: MeetingParticipant[];
  action_items_count: number;
  transcript_segments_count: number;
  notes_count: number;
  decisions_count: number;
}

// ============================================================================
// Meeting Participants
// ============================================================================

export interface MeetingParticipant {
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
  created_at: string;
  updated_at: string;
}

export interface ParticipantInput {
  participant_type: 'client' | 'lead' | 'team_member' | 'external';
  participant_id?: string | null;
  participant_name: string;
  participant_email?: string | null;
  role: 'organizer' | 'required' | 'optional';
}

export type AttendanceStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'tentative'
  | 'attended'
  | 'no_show';

// ============================================================================
// Transcription
// ============================================================================

export interface TranscriptSegment {
  id: string;
  meeting_id: string;
  segment_index: number;
  speaker_id: string | null;
  speaker_name: string | null;
  text: string;
  start_time: number; // seconds from meeting start
  end_time: number; // seconds from meeting start
  confidence: number; // 0-1
  is_edited: boolean;
  original_text: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Action Items
// ============================================================================

export interface MeetingActionItem {
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
  created_at: string;
  updated_at: string;
}

export interface ActionItemSuggestion {
  title: string;
  description: string;
  suggested_assignee: string | null;
  suggested_due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  source_segment_id: string;
  context: string;
}

export interface ConfirmedActionItem {
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// ============================================================================
// Meeting Notes
// ============================================================================

export interface MeetingNotes {
  id: string;
  meeting_id: string;
  user_id: string;
  section: 'key_points' | 'decisions' | 'questions' | 'general';
  content: string;
  timestamp_in_meeting: number | null; // seconds from meeting start
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Meeting Templates
// ============================================================================

export interface MeetingTemplate {
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
  created_at: string;
  updated_at: string;
}

export interface MeetingTemplateInput {
  name: string;
  description?: string | null;
  meeting_type: 'video' | 'phone' | 'in-person';
  default_duration_minutes: number;
  agenda_template?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days?: string[]; // For weekly: ['monday', 'wednesday']
  day_of_month?: number; // For monthly
  end_date?: string;
}

// ============================================================================
// Meeting Decisions
// ============================================================================

export interface MeetingDecision {
  id: string;
  meeting_id: string;
  decision_type: 'approved' | 'rejected' | 'deferred' | 'information';
  title: string;
  description: string | null;
  agenda_item: string | null;
  impact: string | null;
  related_task_ids: string[];
  decided_by: string | null;
  timestamp_in_meeting: number | null; // seconds from meeting start
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Meeting Analytics
// ============================================================================

export interface MeetingMetrics {
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

export interface MeetingTrends {
  meetings_over_time: Array<{ date: string; count: number }>;
  duration_trend: Array<{ date: string; total_minutes: number }>;
  completion_rate_trend: Array<{ date: string; rate: number }>;
}

export interface MeetingInsight {
  type: 'suggestion' | 'warning' | 'achievement';
  title: string;
  description: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================================================
// Smart Scheduling
// ============================================================================

export interface TimeSlot {
  start_time: Date;
  end_time: Date;
  available_participants: string[];
  unavailable_participants: string[];
  score: number; // 0-1, higher is better
  conflicts: Conflict[];
}

export interface Conflict {
  participant_id: string;
  participant_name: string;
  conflicting_event: string;
  event_time: Date;
}

// ============================================================================
// Filter and Search Interfaces
// ============================================================================

export interface AnalyticsFilters {
  date_range: DateRange;
  client_ids?: string[];
  participant_ids?: string[];
  meeting_types?: ('video' | 'phone' | 'in-person')[];
  statuses?: ('scheduled' | 'in_progress' | 'completed' | 'cancelled')[];
}

export interface DateRange {
  start: string;
  end: string;
  preset?:
    | 'today'
    | 'yesterday'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'last_quarter'
    | 'this_year'
    | 'last_year'
    | 'custom';
}

export interface MeetingSearchFilters {
  query?: string;
  date_range?: DateRange;
  client_ids?: string[];
  participant_ids?: string[];
  statuses?: ('scheduled' | 'in_progress' | 'completed' | 'cancelled')[];
  meeting_types?: ('video' | 'phone' | 'in-person')[];
  has_transcript?: boolean;
  has_action_items?: boolean;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: MeetingSearchFilters;
  created_at: string;
}

// ============================================================================
// Export and Reporting
// ============================================================================

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'csv' | 'txt';
  include_summary: boolean;
  include_transcript: boolean;
  include_action_items: boolean;
  include_participants: boolean;
  include_notes: boolean;
  include_decisions: boolean;
  include_analytics: boolean;
}

export interface BulkExportOptions extends ExportOptions {
  filters: MeetingSearchFilters;
}

export interface ShareableLink {
  id: string;
  meeting_id: string;
  token: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

// ============================================================================
// Preparation and Follow-up
// ============================================================================

export interface MeetingPreparation {
  meeting_id: string;
  client_info: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
  lead_info: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
  previous_meetings: Array<{
    id: string;
    title: string;
    date: string;
    summary: string | null;
  }>;
  open_action_items: Array<{
    id: string;
    title: string;
    due_date: string | null;
    status: string;
  }>;
  ai_talking_points: string[];
}

export interface FollowUpData {
  meeting_id: string;
  summary: string;
  action_items: MeetingActionItem[];
  participants: MeetingParticipant[];
  next_meeting_suggestion: Date | null;
}

// ============================================================================
// Notifications
// ============================================================================

export interface MeetingNotification {
  id: string;
  user_id: string;
  meeting_id: string;
  type:
    | 'confirmation'
    | 'reminder'
    | 'status_change'
    | 'action_item_assignment'
    | 'preparation'
    | 'follow_up';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ============================================================================
// Recording Management
// ============================================================================

export interface MeetingRecording {
  id: string;
  meeting_id: string;
  file_path: string;
  file_size_bytes: number;
  duration_seconds: number;
  is_encrypted: boolean;
  created_at: string;
}

export interface StorageUsage {
  total_recordings: number;
  total_size_bytes: number;
  total_size_mb: number;
  storage_limit_mb: number;
  usage_percentage: number;
  oldest_recording: MeetingRecording | null;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const MeetingParticipantSchema = z.object({
  participant_type: z.enum(['client', 'lead', 'team_member', 'external']),
  participant_id: z.string().uuid().nullable().optional(),
  participant_name: z.string().min(1, 'Participant name is required'),
  participant_email: z.string().email().nullable().optional(),
  role: z.enum(['organizer', 'required', 'optional']),
});

export const MeetingTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().nullable().optional(),
  meeting_type: z.enum(['video', 'phone', 'in-person']),
  default_duration_minutes: z
    .number()
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours'),
  agenda_template: z.string().nullable().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().min(1),
      days: z.array(z.string()).optional(),
      day_of_month: z.number().min(1).max(31).optional(),
      end_date: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const ActionItemSchema = z.object({
  title: z.string().min(1, 'Action item title is required'),
  description: z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  assignee_name: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export const MeetingNotesSchema = z.object({
  section: z.enum(['key_points', 'decisions', 'questions', 'general']),
  content: z.string().min(1, 'Note content is required'),
  timestamp_in_meeting: z.number().nullable().optional(),
});

export const MeetingDecisionSchema = z.object({
  decision_type: z.enum(['approved', 'rejected', 'deferred', 'information']),
  title: z.string().min(1, 'Decision title is required'),
  description: z.string().nullable().optional(),
  agenda_item: z.string().nullable().optional(),
  impact: z.string().nullable().optional(),
  related_task_ids: z.array(z.string().uuid()).optional(),
  decided_by: z.string().nullable().optional(),
  timestamp_in_meeting: z.number().nullable().optional(),
});

export const EnhancedMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required'),
  description: z.string().nullable().optional(),
  meeting_type: z.enum(['video', 'phone', 'in-person']),
  start_time: z.string(),
  end_time: z.string(),
  location: z.string().nullable().optional(),
  agenda: z.string().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
});

// ============================================================================
// Real-time Update Interfaces
// ============================================================================

export interface MeetingUpdate {
  type:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'status_changed'
    | 'participant_joined'
    | 'participant_left'
    | 'transcript_updated'
    | 'action_item_added';
  meeting_id: string;
  user_id: string;
  timestamp: string;
  changes?: Record<string, any>;
  meeting?: EnrichedMeeting;
}

// ============================================================================
// Error Handling
// ============================================================================

export enum MeetingErrorType {
  TRANSCRIPTION_FAILED = 'transcription_failed',
  AI_API_RATE_LIMIT = 'ai_api_rate_limit',
  CALENDAR_SYNC_FAILED = 'calendar_sync_failed',
  VIDEO_LINK_GENERATION_FAILED = 'video_link_generation_failed',
  STORAGE_QUOTA_EXCEEDED = 'storage_quota_exceeded',
  RECORDING_CORRUPTED = 'recording_corrupted',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
  VALIDATION_ERROR = 'validation_error',
}

export interface MeetingError extends Error {
  type: MeetingErrorType;
  meeting_id?: string;
  details?: Record<string, any>;
  retry_count?: number;
}
