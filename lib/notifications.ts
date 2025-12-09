import { supabase } from './supabase';
import type { NotificationType } from '@/types/organization';

interface CreateNotificationParams {
  userId: string; // This should be the profile.id, not auth user_id
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

/**
 * Create a notification for a user
 * @param params Notification parameters
 * @returns The created notification or null if failed
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || {},
        action_url: params.actionUrl || null,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Get profile ID from auth user ID
 * @param authUserId The auth.users.id
 * @returns The profile.id or null if not found
 */
export async function getProfileId(authUserId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .single();

    if (error || !data) {
      console.error('Error fetching profile ID:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error fetching profile ID:', error);
    return null;
  }
}

/**
 * Notify user about task assignment
 */
export async function notifyTaskAssigned(params: {
  assigneeUserId: string; // profile.id
  taskId: string;
  taskTitle: string;
  assignedByName: string;
}) {
  return createNotification({
    userId: params.assigneeUserId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `${params.assignedByName} assigned you to "${params.taskTitle}"`,
    data: { task_id: params.taskId },
    actionUrl: `/tasks/${params.taskId}`,
  });
}

/**
 * Notify user about task completion
 */
export async function notifyTaskCompleted(params: {
  userId: string; // profile.id
  taskId: string;
  taskTitle: string;
  completedByName: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'task_completed',
    title: 'Task Completed',
    message: `${params.completedByName} completed "${params.taskTitle}"`,
    data: { task_id: params.taskId },
    actionUrl: `/tasks/${params.taskId}`,
  });
}

/**
 * Notify user about overdue task
 */
export async function notifyTaskOverdue(params: {
  userId: string; // profile.id
  taskId: string;
  taskTitle: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'task_overdue',
    title: 'Task Overdue',
    message: `Task "${params.taskTitle}" is now overdue`,
    data: { task_id: params.taskId },
    actionUrl: `/tasks/${params.taskId}`,
  });
}

/**
 * Notify user about new comment on task
 */
export async function notifyCommentAdded(params: {
  userId: string; // profile.id
  taskId: string;
  taskTitle: string;
  commenterName: string;
  commentPreview: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'comment_added',
    title: 'New Comment',
    message: `${params.commenterName} commented on "${params.taskTitle}": ${params.commentPreview}`,
    data: { task_id: params.taskId },
    actionUrl: `/tasks/${params.taskId}`,
  });
}

/**
 * Notify user about meeting scheduled
 */
export async function notifyMeetingScheduled(params: {
  userId: string; // profile.id
  meetingId: string;
  meetingTitle: string;
  startTime: string;
  organizer: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'meeting_scheduled',
    title: 'Meeting Scheduled',
    message: `${params.organizer} scheduled "${
      params.meetingTitle
    }" for ${new Date(params.startTime).toLocaleString()}`,
    data: { meeting_id: params.meetingId },
    actionUrl: `/meetings/${params.meetingId}`,
  });
}

/**
 * Notify user about upcoming meeting
 */
export async function notifyMeetingReminder(params: {
  userId: string; // profile.id
  meetingId: string;
  meetingTitle: string;
  startTime: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'meeting_reminder',
    title: 'Meeting Reminder',
    message: `"${params.meetingTitle}" starts at ${new Date(
      params.startTime
    ).toLocaleString()}`,
    data: { meeting_id: params.meetingId },
    actionUrl: `/meetings/${params.meetingId}`,
  });
}

/**
 * Notify user about cancelled meeting
 */
export async function notifyMeetingCancelled(params: {
  userId: string; // profile.id
  meetingId: string;
  meetingTitle: string;
  cancelledBy: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'meeting_cancelled',
    title: 'Meeting Cancelled',
    message: `${params.cancelledBy} cancelled "${params.meetingTitle}"`,
    data: { meeting_id: params.meetingId },
  });
}

/**
 * Notify user about lead assignment
 */
export async function notifyLeadAssigned(params: {
  userId: string; // profile.id
  leadId: string;
  leadName: string;
  assignedByName: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'lead_assigned',
    title: 'New Lead Assigned',
    message: `${params.assignedByName} assigned you lead "${params.leadName}"`,
    data: { lead_id: params.leadId },
    actionUrl: `/leads/${params.leadId}`,
  });
}

/**
 * Notify user about client update
 */
export async function notifyClientUpdated(params: {
  userId: string; // profile.id
  clientId: string;
  clientName: string;
  updatedByName: string;
  updateType: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'client_updated',
    title: 'Client Updated',
    message: `${params.updatedByName} updated ${params.updateType} for "${params.clientName}"`,
    data: { client_id: params.clientId },
    actionUrl: `/clients/${params.clientId}`,
  });
}

/**
 * Notify user about mention in comment
 */
export async function notifyMention(params: {
  userId: string; // profile.id
  taskId: string;
  taskTitle: string;
  mentionedByName: string;
  commentPreview: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${params.mentionedByName} mentioned you in "${params.taskTitle}": ${params.commentPreview}`,
    data: { task_id: params.taskId },
    actionUrl: `/tasks/${params.taskId}`,
  });
}
