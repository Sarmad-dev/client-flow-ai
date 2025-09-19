import React from 'react';
import { ClientForm } from '../ClientForm';
import { useUpdateClient, ClientRecord } from '@/hooks/useClients';

interface ClientEditModalProps {
  visible: boolean;
  onClose: () => void;
  client: ClientRecord | null;
  onUpdated?: (client: ClientRecord) => void;
}

export function ClientEditModal({
  visible,
  onClose,
  client,
  onUpdated,
}: ClientEditModalProps) {
  const updateClient = useUpdateClient();

  if (!client) return null;

  return (
    <ClientForm
      visible={visible}
      onClose={onClose}
      initialData={{
        name: client.name,
        company: client.company ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
        notes: client.notes ?? '',
      }}
      onSubmit={async (formData) => {
        const updatedClient = await updateClient.mutateAsync({
          id: client.id,
          name: formData.name,
          company: formData.company,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
        });
        onUpdated?.(updatedClient);
      }}
    />
  );
}
