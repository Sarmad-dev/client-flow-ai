import React from 'react';
import { LeadForm } from '@/components/leads/LeadForm';
import { useUpdateLead, LeadRecord } from '@/hooks/useLeads';

interface LeadEditModalProps {
  visible: boolean;
  onClose: () => void;
  lead: LeadRecord | null;
  onUpdated?: (lead: LeadRecord) => void;
}

export function LeadEditModal({
  visible,
  onClose,
  lead,
  onUpdated,
}: LeadEditModalProps) {
  const updateLead = useUpdateLead();

  if (!lead) return null;

  return (
    <LeadForm
      visible={visible}
      onClose={onClose}
      initialData={{
        name: lead.name,
        company: lead.company ?? '',
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        address: lead.address ?? '',
        website: lead.website ?? '',
        businessType: lead.business_type ?? '',
        notes: lead.notes ?? '',
      }}
      onSubmit={async (form) => {
        const updatedLead = await updateLead.mutateAsync({
          id: lead.id,
          updates: {
            name: form.name,
            company: form.company,
            email: form.email,
            phone: form.phone,
            address: form.address,
            business_type: form.businessType,
            website: form.website,
            notes: form.notes,
          },
        });
        onUpdated?.(updatedLead);
      }}
    />
  );
}
