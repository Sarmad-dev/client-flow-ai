import React from 'react';
import { LeadForm } from '@/components/leads/LeadForm';
import { useCreateLead } from '@/hooks/useLeads';

interface LeadCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (lead: any) => void;
}

export function LeadCreateModal({
  visible,
  onClose,
  onCreated,
}: LeadCreateModalProps) {
  const createLead = useCreateLead();

  return (
    <LeadForm
      visible={visible}
      onClose={onClose}
      onSubmit={async (form) => {
        const lead = await createLead.mutateAsync({ ...form });
        onCreated?.(lead);
      }}
    />
  );
}
