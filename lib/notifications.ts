import { supabase } from './supabase';
import type { NotificationType } from '@/types/organization';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  data = {},
  actionUrl,
}: CreateNotificationParams) {
  const { data: notification, error } = await supabase.rpc(
    'create_notification',
    {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data,
      p_action_url: actionUrl,
    }
  );

  if (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }

  return notification;
}

export async function notifyTaskAssigned(
  assigneeId: string,
  taskTitle: string,
  taskId: string,
  assignedBy: string
) {
  return createNotification({
    userId: assigneeId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `You have been assigned to: ${taskTitle}`,
    data: {
      task_id: taskId,
      assigned_by: assignedBy,
    },
    actionUrl: `/tasks/${taskId}`,
  });
}

export async function notifyMeetingScheduled(
  attendeeId: string,
  meetingTitle: string,
  meetingId: string,
  scheduledBy: string
) {
  return createNotification({
    userId: attendeeId,
    type: 'meeting_scheduled',
    title: 'Meeting Scheduled',
    message: `You have been invited to: ${meetingTitle}`,
    data: {
      meeting_id: meetingId,
      scheduled_by: scheduledBy,
    },
    actionUrl: `/meetings/${meetingId}`,
  });
}

export async function notifyLeadAssigned(
  assigneeId: string,
  leadName: string,
  leadId: string,
  assignedBy: string
) {
  return createNotification({
    userId: assigneeId,
    type: 'lead_assigned',
    title: 'Lead Assigned',
    message: `You have been assigned lead: ${leadName}`,
    data: {
      lead_id: leadId,
      assigned_by: assignedBy,
    },
    actionUrl: `/leads/${leadId}`,
  });
}

export async function notifyTaskOverdue(
  userId: string,
  taskTitle: string,
  taskId: string
) {
  return createNotification({
    userId,
    type: 'task_overdue',
    title: 'Task Overdue',
    message: `Task "${taskTitle}" is overdue`,
    data: {
      task_id: taskId,
    },
    actionUrl: `/tasks/${taskId}`,
  });
}

export async function notifyMeetingReminder(
  attendeeId: string,
  meetingTitle: string,
  meetingId: string,
  startsIn: string
) {
  return createNotification({
    userId: attendeeId,
    type: 'meeting_reminder',
    title: 'Meeting Reminder',
    message: `"${meetingTitle}" starts ${startsIn}`,
    data: {
      meeting_id: meetingId,
    },
    actionUrl: `/meetings/${meetingId}`,
  });
}
