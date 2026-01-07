import React, { useMemo } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useCreateTask } from '@/hooks/useTasks';

interface TaskCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (task: any) => void;
  initialStatus?: string;
  initialProjectId?: string;
}

export function TaskCreateModal({
  visible,
  onClose,
  onCreated,
  initialStatus = 'pending',
  initialProjectId,
}: TaskCreateModalProps) {
  const clientsQuery = useClients();
  const projectsQuery = useProjects();

  const clients = useMemo(
    () =>
      (clientsQuery.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company ?? '',
      })),
    [clientsQuery.data]
  );

  const projects = useMemo(
    () =>
      (projectsQuery.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        client: p.client,
        lead: p.lead,
      })),
    [projectsQuery.data]
  );

  const createTask = useCreateTask();

  return (
    <TaskForm
      visible={visible}
      onClose={onClose}
      clients={clients}
      projects={projects}
      initialData={{
        selectedProject: initialProjectId,
      }}
      onSubmit={async (payload) => {
        const task = await createTask.mutateAsync({
          title: payload.title,
          description: payload.description,
          client_id: payload.client_id ?? null,
          project_id: payload.project_id ?? null,
          due_date: payload.due_date ?? null,
          tag: payload.tag,
          priority: payload.priority,
          status: initialStatus,
        } as any);
        onCreated?.(task);
      }}
    />
  );
}
