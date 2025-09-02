import React, { useMemo } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { useClients } from '@/hooks/useClients';
import { useCreateTask } from '@/hooks/useTasks';

interface TaskCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (task: any) => void;
}

export function TaskCreateModal({
  visible,
  onClose,
  onCreated,
}: TaskCreateModalProps) {
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
  const createTask = useCreateTask();

  return (
    <TaskForm
      visible={visible}
      onClose={onClose}
      clients={clients}
      onSubmit={async (payload) => {
        const task = await createTask.mutateAsync({
          title: payload.title,
          description: payload.description,
          client_id:
            payload.client_id ?? payload.clientId ?? payload.selectedClient,
          due_date: payload.due_date ?? payload.dueDate ?? null,
          tag: payload.tag,
          priority: payload.priority,
          status: 'pending',
        } as any);
        onCreated?.(task);
      }}
    />
  );
}
