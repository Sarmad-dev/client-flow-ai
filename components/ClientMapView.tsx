import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleMaps } from 'expo-maps';

// Temporary: Define Region type for compatibility during migration
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
import * as Location from 'expo-location';
import { X, Building, Search, Map, Navigation } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Client {
  id: string;
  name: string;
  company: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  address: string;
}

interface ClientMapViewProps {
  visible: boolean;
  onClose: () => void;
  clients: Client[];
}

export function ClientMapView({
  visible,
  onClose,
  clients,
}: ClientMapViewProps) {
  const { colors } = useTheme();
  const [region, setRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const clientsWithLocation = clients.filter((client) => client.location);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Client Locations
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          <GoogleMaps.View
            style={styles.map}
            cameraPosition={{
              coordinates: {
                latitude: region.latitude,
                longitude: region.longitude,
              },
              zoom: 12,
            }}
            markers={clientsWithLocation.map((client) => ({
              id: client.id,
              coordinates: {
                latitude: client.location!.latitude,
                longitude: client.location!.longitude,
              },
              title: client.name,
              snippet: client.company,
            }))}
            onMarkerClick={(marker) => {
              const client = clientsWithLocation.find(
                (c) => c.id === marker.id
              );
              if (client) setSelectedClient(client);
            }}
          />

          {/* Current Location Button */}
          <TouchableOpacity
            style={[styles.locationButton, { backgroundColor: colors.surface }]}
            onPress={getCurrentLocation}
          >
            <Navigation size={20} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Selected Client Info */}
        {selectedClient && (
          <View
            style={[styles.clientInfo, { backgroundColor: colors.surface }]}
          >
            <View style={styles.clientHeader}>
              <View
                style={[
                  styles.clientAvatar,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.clientInitial}>
                  {selectedClient.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.clientDetails}>
                <Text style={[styles.clientName, { color: colors.text }]}>
                  {selectedClient.name}
                </Text>
                <Text
                  style={[
                    styles.clientCompany,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectedClient.company}
                </Text>
                <Text
                  style={[
                    styles.clientAddress,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectedClient.address}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedClient(null)}
                style={styles.closeClientInfo}
              >
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.stats, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsText, { color: colors.text }]}>
            Showing {clientsWithLocation.length} of {clients.length} clients
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clientInfo: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  clientDetails: {
    flex: 1,
    marginLeft: 16,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
  },
  clientCompany: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  clientAddress: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  closeClientInfo: {
    padding: 4,
  },
  stats: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
