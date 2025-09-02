import React from 'react';
import { ClientForm } from '@/components/ClientForm';
import { useCreateClient } from '@/hooks/useClients';

interface ClientCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (client: any) => void;
}

export function ClientCreateModal({
  visible,
  onClose,
  onCreated,
}: ClientCreateModalProps) {
  const createClient = useCreateClient();
  return (
    <ClientForm
      visible={visible}
      onClose={onClose}
      onSubmit={async (payload) => {
        const client = await createClient.mutateAsync({
          name: payload.name,
          company: payload.company ?? null,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          address: payload.address ?? null,
          notes: payload.notes ?? null,
          status: 'prospect',
        } as any);
        onCreated?.(client);
      }}
    />
  );
}
