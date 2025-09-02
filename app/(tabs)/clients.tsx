import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClientHeader } from '@/components/clients/ClientHeader';
import { ClientSearchBar } from '@/components/clients/ClientSearchBar';
import { ClientList } from '@/components/clients/ClientList';
import { ClientCreateModal } from '@/components/clients/ClientCreateModal';
import { ClientMapModal } from '@/components/clients/ClientMapModal';
import { ClientDetailModal } from '@/components/clients/ClientDetailModal';
import { useClients, ClientRecord } from '@/hooks/useClients';

export default function ClientsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showClientDetail, setShowClientDetail] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const clientsQuery = useClients();
  const clients = clientsQuery.data ?? [];
  const loading = clientsQuery.isLoading;

  const handleCreateClient = () => {
    // refetch handled by react-query
  };

  const handleClientPress = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowClientDetail(true);
  };

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (client?.company || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      ),
    [clients, searchQuery]
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading clients...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ClientHeader
        onOpenMap={() => setShowMapView(true)}
        onOpenForm={() => setShowClientForm(true)}
      />
      <ClientSearchBar value={searchQuery} onChangeText={setSearchQuery} />

      <ClientCreateModal
        visible={showClientForm}
        onClose={() => setShowClientForm(false)}
        onCreated={handleCreateClient}
      />

      <ClientMapModal
        visible={showMapView}
        onClose={() => setShowMapView(false)}
        clients={clients}
      />

      {selectedClientId && (
        <ClientDetailModal
          visible={showClientDetail}
          onClose={() => {
            setShowClientDetail(false);
            setSelectedClientId(null);
          }}
          clientId={selectedClientId}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ClientList
          clients={filteredClients}
          getId={(client: ClientRecord) => client.id}
          onPress={(id) => handleClientPress(id)}
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
  loadingText: { fontSize: 16, fontWeight: '500' },
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
  clientList: { paddingHorizontal: 24, paddingBottom: 24 },
});
