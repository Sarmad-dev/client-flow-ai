import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientRecord } from '@/hooks/useClients';

interface ClientListProps {
  clients: ClientRecord[];
  onPress: (id: string) => void;
  getId: (client: ClientRecord) => string;
}

export function ClientList({ clients, onPress, getId }: ClientListProps) {
  return (
    <View style={styles.clientList}>
      {clients.map((client) => (
        <ClientCard
          key={getId(client)}
          client={client}
          onPress={() => onPress(getId(client))}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clientList: { paddingHorizontal: 24, paddingBottom: 24 },
});
