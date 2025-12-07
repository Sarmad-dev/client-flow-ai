-- Verification script for Enhanced Meeting Management Schema
-- Run this to verify all tables, columns, indexes, and policies were created correctly

-- ============================================================================
-- Verify meetings table enhancements
-- ============================================================================

SELECT 
  'meetings table columns' as verification,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'meetings'
  AND column_name IN (
    'zoom_meeting_id',
    'teams_meeting_id', 
    'meet_link',
    'template_id',
    'engagement_score',
    'preparation_sent',
    'follow_up_sent'
  )
ORDER BY column_name;

-- ============================================================================
-- Verify new tables exist
-- ============================================================================

SELECT 
  'new tables' as verification,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'meeting_participants',
    'meeting_transcripts',
    'meeting_action_items',
    'meeting_notes',
    'meeting_templates',
    'meeting_decisions',
    'meeting_analytics_cache'
  )
ORDER BY table_name;

-- ============================================================================
-- Verify RLS is enabled
-- ============================================================================

SELECT 
  'RLS enabled' as verification,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'meeting_participants',
    'meeting_transcripts',
    'meeting_action_items',
    'meeting_notes',
    'meeting_templates',
    'meeting_decisions',
    'meeting_analytics_cache'
  )
ORDER BY tablename;

-- ============================================================================
-- Verify indexes were created
-- ============================================================================

SELECT 
  'indexes' as verification,
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_meeting_participants%'
    OR indexname LIKE 'idx_meeting_transcripts%'
    OR indexname LIKE 'idx_meeting_action_items%'
    OR indexname LIKE 'idx_meeting_notes%'
    OR indexname LIKE 'idx_meeting_templates%'
    OR indexname LIKE 'idx_meeting_decisions%'
    OR indexname LIKE 'idx_meeting_analytics_cache%'
    OR indexname LIKE 'idx_meetings_template_id%'
    OR indexname LIKE 'idx_meetings_status%'
    OR indexname LIKE 'idx_meetings_engagement_score%'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- Verify RLS policies
-- ============================================================================

SELECT 
  'RLS policies' as verification,
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'meeting_participants',
    'meeting_transcripts',
    'meeting_action_items',
    'meeting_notes',
    'meeting_templates',
    'meeting_decisions',
    'meeting_analytics_cache'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- Verify triggers
-- ============================================================================

SELECT 
  'triggers' as verification,
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'meeting_participants',
    'meeting_transcripts',
    'meeting_action_items',
    'meeting_notes',
    'meeting_templates',
    'meeting_decisions',
    'meeting_analytics_cache'
  )
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- Verify system templates were inserted
-- ============================================================================

SELECT 
  'system templates' as verification,
  name,
  meeting_type,
  default_duration_minutes,
  is_system_template
FROM meeting_templates
WHERE is_system_template = true
ORDER BY name;

-- ============================================================================
-- Count records in each new table
-- ============================================================================

SELECT 'meeting_participants' as table_name, COUNT(*) as record_count FROM meeting_participants
UNION ALL
SELECT 'meeting_transcripts', COUNT(*) FROM meeting_transcripts
UNION ALL
SELECT 'meeting_action_items', COUNT(*) FROM meeting_action_items
UNION ALL
SELECT 'meeting_notes', COUNT(*) FROM meeting_notes
UNION ALL
SELECT 'meeting_templates', COUNT(*) FROM meeting_templates
UNION ALL
SELECT 'meeting_decisions', COUNT(*) FROM meeting_decisions
UNION ALL
SELECT 'meeting_analytics_cache', COUNT(*) FROM meeting_analytics_cache;
