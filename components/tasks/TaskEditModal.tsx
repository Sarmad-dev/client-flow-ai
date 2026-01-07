import React, { useMemo } from 'react';
import { TaskForm } from './TaskForm';
import { useClients } from '@/hooks/useClients';
import { useUpdateTask, TaskRecord } from '@/hooks/useTasks';

interface TaskEditModalProps {
  visible: boolean;
  onClose: () => void;
  task: TaskRecord | null;
  onUpdated?: (task: TaskRecord) => void;
}

export function TaskEditModal({
  visible,
  onClose,
  task,
  onUpdated,
}: TaskEditModalProps) {
  const clientsQuery = useClients();
  const clients = useMemo(
    () =>
      (clientsQuery.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company ?? '',
      })),
    [clientsQuery.data]
  );
  const updateTask = useUpdateTask();

  if (!task) return null;

  return (
    <TaskForm
      visible={visible}
      onClose={onClose}
      clients={clients}
      initialData={{
        title: task.title,
        description: task.description ?? '',
        selectedClient: task.client_id ?? '',
        dueDate: task.due_date ? new Date(task.due_date) : new Date(),
        selectedTag: task.tag,
        priority: task.priority,
      }}
      onSubmit={async (payload) => {
        const updatedTask = await updateTask.mutateAsync({
          id: task.id,
          title: payload.title,
          description: payload.description,
          client_id:
            payload.client_id ?? payload.clientId ?? payload.selectedClient,
          due_date: payload.due_date ?? payload.dueDate ?? null,
          tag: payload.tag,
          priority: payload.priority,
          status: payload.status ?? task.status,
        } as any);
        onUpdated?.(updatedTask);
      }}
    />
  );
}
