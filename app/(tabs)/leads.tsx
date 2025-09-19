import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateClient } from '@/hooks/useClients';
import { useLeads, useConvertLeadToClient } from '@/hooks/useLeads';
import { LeadHeader } from '@/components/leads/LeadHeader';
import { LeadStats } from '@/components/leads/LeadStats';
import { LeadSearchBar } from '@/components/leads/LeadSearchBar';
import { LeadList } from '@/components/leads/LeadList';
import { LeadCreateModal } from '@/components/leads/LeadCreateModal';
import { LeadMapModal } from '@/components/leads/LeadMapModal';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { LeadFilterSheet } from '@/components/leads/LeadFilterSheet';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';

import type { LeadRecord } from '@/hooks/useLeads';

export default function LeadsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const leadsQuery = useLeads();
  const leads = (leadsQuery.data ?? []) as LeadRecord[];
  const loading = leadsQuery.isLoading;

  const {
    guardLeadCreation,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

  const handleCreateLead = () => {
    if (guardLeadCreation()) {
      setShowLeadForm(true);
    }
  };

  const handleLeadPress = (leadId: string) => {
    setSelectedLeadId(leadId);
    setShowLeadDetail(true);
  };

  const createClient = useCreateClient();
  const convertLeadToClient = useConvertLeadToClient();

  const handleConvertToClient = async (leadId: string) => {
    try {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      // Create the client first
      const client = await createClient.mutateAsync({
        name: lead.name,
        company: lead.company ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        whatsapp_phone: null,
        address: lead.address ?? null,
        location_lat: lead.location_lat ?? null,
        location_lng: lead.location_lng ?? null,
        google_place_id: lead.google_place_id ?? null,
        status: 'active',
        notes: `Converted from lead on ${new Date().toLocaleDateString()}`,
        last_contact_date: new Date().toISOString(),
      });

      // Then update the lead status to converted
      await convertLeadToClient.mutateAsync({
        leadId: lead.id,
        clientId: client.id,
      });

      Alert.alert('Success', 'Lead converted to client successfully!');
    } catch (error) {
      console.error('Error converting lead:', error);
      Alert.alert('Error', 'Failed to convert lead to client');
    }
  };

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (lead.company || '').toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [leads, searchQuery]
  );

  const leadStats = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      converted: leads.filter((l) => l.status === 'converted').length,
    }),
    [leads]
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading leads...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LeadHeader
        onToggleFilter={() => setShowFilter((s) => !s)}
        onOpenMap={() => setShowMapView(true)}
        onOpenForm={handleCreateLead}
      />

      <LeadStats
        total={leadStats.total}
        newCount={leadStats.new}
        qualifiedCount={leadStats.qualified}
        convertedCount={leadStats.converted}
      />

      <LeadSearchBar value={searchQuery} onChangeText={setSearchQuery} />

      <LeadCreateModal
        visible={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        onCreated={() => {
          setShowLeadForm(false);
          leadsQuery.refetch();
        }}
      />

      <LeadMapModal
        visible={showMapView}
        onClose={() => setShowMapView(false)}
        leads={leads.map((l) => ({
          id: l.id,
          name: l.name || '',
          company: l.company || '',
          address: l.address || '',
          status: l.status,
          location_lat: l.location_lat ?? undefined,
          location_lng: l.location_lng ?? undefined,
        }))}
        onLeadCreated={() => {
          setShowMapView(false);
          leadsQuery.refetch();
        }}
      />

      {selectedLeadId && (
        <LeadDetailModal
          visible={showLeadDetail}
          onClose={() => {
            setShowLeadDetail(false);
            setSelectedLeadId(null);
          }}
          leadId={selectedLeadId}
          onConvertToClient={() => handleConvertToClient(selectedLeadId)}
          onLeadUpdated={() => leadsQuery.refetch()}
        />
      )}

      {showFilter && (
        <LeadFilterSheet
          onClose={() => setShowFilter(false)}
          onApplyFilters={(filters) => {
            // TODO: wire filters to query params if needed
            setShowFilter(false);
          }}
        />
      )}

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <LeadList
          leads={filteredLeads}
          getId={(l) => (l as LeadRecord).id}
          onPress={(id) => handleLeadPress(id)}
          onConvert={(id) => handleConvertToClient(id)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsScroll: {
    paddingHorizontal: 24,
    gap: 16,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  leadList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
