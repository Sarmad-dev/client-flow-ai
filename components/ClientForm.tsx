import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MapView, Marker } from './PlatformMapView';
import type { Region } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import {
  X,
  User,
  Building,
  Search,
  Map,
  Activity as ActivityIndicator,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { searchPlaces as searchPlacesApi, PlaceResult } from '@/lib/maps';
import { useCreateClient } from '@/hooks/useClients';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomAlert } from '@/components/CustomAlert';

interface ClientFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (client: any) => void;
  initialData?: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  };
}

// Using PlaceResult type from lib/maps

export function ClientForm({
  visible,
  onClose,
  onSubmit,
  initialData,
}: ClientFormProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const createClient = useCreateClient();
  const [mode, setMode] = useState<'manual' | 'map'>('manual');
  const [name, setName] = useState(initialData?.name || '');
  const [company, setCompany] = useState(initialData?.company || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    if (!company.trim()) {
      Alert.alert('Error', 'Please enter a company name');
      return;
    }

    setIsCreating(true);

    try {
      const clientData = {
        name: name.trim(),
        company: company.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: selectedPlace
          ? selectedPlace.formatted_address
          : address.trim() || null,
        location_lat: selectedPlace?.geometry.location.lat || null,
        location_lng: selectedPlace?.geometry.location.lng || null,
        google_place_id: selectedPlace?.place_id || null,
        notes: notes.trim() || null,
        status: 'prospect' as const,
        last_contact_date: new Date().toISOString(),
      };

      const client = await createClient.mutateAsync(clientData);

      Alert.alert('Success', 'Client created successfully!');
      onSubmit(client);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating client:', error);
      Alert.alert('Error', 'Failed to create client. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName(initialData?.name || '');
    setCompany(initialData?.company || '');
    setEmail(initialData?.email || '');
    setPhone(initialData?.phone || '');
    setAddress(initialData?.address || '');
    setNotes(initialData?.notes || '');
    setSelectedPlace(null);
    setSearchQuery('');
    setSearchResults([]);
    setMode('manual');
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission denied',
          'Location permission is required to use the map feature'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchPlacesApi({
        query,
        location: {
          lat: mapRegion.latitude,
          lng: mapRegion.longitude,
        },
        radius: 10000,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert(
        'Search Error',
        'Failed to search for businesses. Please try again.'
      );
    }
  };

  const selectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setCompany(place.name);
    setAddress(place.formatted_address);
    setMapRegion({
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setSearchResults([]);
    setSearchQuery('');
  };

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
          <Text style={[styles.title, { color: colors.text }]}>Add Client</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              { backgroundColor: colors.surface },
              mode === 'manual' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setMode('manual')}
          >
            <User
              size={20}
              color={mode === 'manual' ? '#FFFFFF' : colors.text}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.modeText,
                { color: mode === 'manual' ? '#FFFFFF' : colors.text },
              ]}
            >
              Manual Entry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              { backgroundColor: colors.surface },
              mode === 'map' && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              setMode('map');
              getCurrentLocation();
            }}
          >
            <Map
              size={20}
              color={mode === 'map' ? '#FFFFFF' : colors.text}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.modeText,
                { color: mode === 'map' ? '#FFFFFF' : colors.text },
              ]}
            >
              Find on Map
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'map' ? (
          <View style={styles.mapContainer}>
            {/* Search Bar */}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Search size={20} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search for businesses..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  handleSearch(text);
                }}
              />
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View
                style={[
                  styles.searchResults,
                  { backgroundColor: colors.surface },
                ]}
              >
                <ScrollView style={styles.resultsList}>
                  {searchResults.map((place) => (
                    <TouchableOpacity
                      key={place.place_id}
                      style={styles.resultItem}
                      onPress={() => selectPlace(place)}
                    >
                      <Building
                        size={16}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                      <View style={styles.resultInfo}>
                        <Text
                          style={[styles.resultName, { color: colors.text }]}
                        >
                          {place.name}
                        </Text>
                        <Text
                          style={[
                            styles.resultAddress,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {place.formatted_address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Map */}
            <MapView
              style={styles.map}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
            >
              {selectedPlace && (
                <Marker
                  coordinate={{
                    latitude: selectedPlace.geometry.location.lat,
                    longitude: selectedPlace.geometry.location.lng,
                  }}
                  title={selectedPlace.name}
                  description={selectedPlace.formatted_address}
                />
              )}
            </MapView>

            {/* Selected Place Info */}
            {selectedPlace && (
              <View
                style={[
                  styles.selectedPlaceInfo,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[styles.selectedPlaceName, { color: colors.text }]}
                >
                  {selectedPlace.name}
                </Text>
                <Text
                  style={[
                    styles.selectedPlaceAddress,
                    { color: colors.textSecondary },
                  ]}
                >
                  {selectedPlace.formatted_address}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Manual Entry Form */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Contact Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Enter contact name..."
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Company *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Enter company name..."
                placeholderTextColor={colors.textSecondary}
                value={company}
                onChangeText={setCompany}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Enter email address..."
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Enter phone number..."
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Address
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Enter address..."
                placeholderTextColor={colors.textSecondary}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Add notes about this client..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Add Client</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  searchResults: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsList: {
    padding: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultAddress: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  map: {
    flex: 1,
    marginHorizontal: 24,
    borderRadius: 12,
  },
  selectedPlaceInfo: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPlaceName: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedPlaceAddress: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  textArea: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
