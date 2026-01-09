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
  ActivityIndicator,
} from 'react-native';
import { MapView, Marker } from '../PlatformMapView';
import * as Location from 'expo-location';
import { X, Building, Search, Map, User, Star } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { searchPlaces, getPlaceDetails, PlaceResult } from '@/lib/maps';
import { useForm, Controller } from 'react-hook-form';
import { LeadFormData, leadSchema } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LeadFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    form: LeadFormData & { selectedPlace: PlaceResult | null }
  ) => Promise<void> | void;
  initialData?: Partial<LeadFormData>;
}

export function LeadForm({
  visible,
  onClose,
  onSubmit,
  initialData,
}: LeadFormProps) {
  const { colors } = useTheme();
  const { canCreateLead } = useSubscription();

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: initialData?.name || '',
      company: initialData?.company || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      website: initialData?.website || '',
      businessType: initialData?.businessType || '',
      notes: initialData?.notes || '',
    },
  });

  const [mode, setMode] = useState<'manual' | 'map'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const submitForm = async (data: LeadFormData) => {
    if (!canCreateLead()) {
      Alert.alert('Error', 'You have reached the maximum number of leads');
      return;
    }
    console.log('data', data);
    if (!data.name?.trim() && !data.company?.trim()) {
      Alert.alert(
        'Error',
        'Please enter either a contact name or company name'
      );
      return;
    }
    setIsCreating(true);
    try {
      await onSubmit({ ...data, selectedPlace });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating lead:', error);
      Alert.alert('Error', 'Failed to create lead. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    reset();
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
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPlaces({
        query,
        location: {
          lat: mapRegion.latitude,
          lng: mapRegion.longitude,
        },
        radius: 10000,
      });
      setSearchResults(results);
    } catch (error: any) {
      console.error('Error searching places:', error);
      Alert.alert(
        'Search Error',
        error?.message || 'Failed to search for businesses. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const normalizePhone = (phone?: string, countryCode?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits; // already has country code
    // basic heuristic: prepend country code if provided
    if (countryCode) {
      return `+${countryCode}${digits}`;
    }
    return digits;
  };

  const getCountryCallingCode = (
    addressComponents?: PlaceResult['address_components']
  ): string | undefined => {
    if (!addressComponents) return undefined;
    const countryComp = addressComponents.find((c) =>
      c.types.includes('country')
    );
    const iso2 = countryComp?.short_name; // e.g., US, IN, GB
    if (!iso2) return undefined;
    // Minimal map to cover common cases. Extend as needed or replace with libphonenumber if added later.
    const isoToCalling: Record<string, string> = {
      US: '1',
      CA: '1',
      MX: '52',
      GB: '44',
      FR: '33',
      DE: '49',
      ES: '34',
      IT: '39',
      NL: '31',
      BE: '32',
      CH: '41',
      SE: '46',
      NO: '47',
      DK: '45',
      FI: '358',
      PT: '351',
      IE: '353',
      AU: '61',
      NZ: '64',
      IN: '91',
      JP: '81',
      CN: '86',
      SG: '65',
      AE: '971',
      SA: '966',
      ZA: '27',
      BR: '55',
      AR: '54',
      CL: '56',
      CO: '57',
      PE: '51',
      NG: '234',
      KE: '254',
      EG: '20',
      TR: '90',
      RU: '7',
      KR: '82',
      ID: '62',
      TH: '66',
      MY: '60',
      PH: '63',
    };
    return isoToCalling[iso2];
  };

  const selectPlace = async (place: PlaceResult) => {
    try {
      // Get detailed place information
      const detailedPlace = await getPlaceDetails(place.place_id);

      setSelectedPlace(detailedPlace);
      setValue('company', detailedPlace.name);
      setValue('address', detailedPlace.formatted_address);
      setValue('website', detailedPlace.website || '');
      // Prefer international phone if provided; otherwise normalize using country calling code
      const callingCode = getCountryCallingCode(
        detailedPlace.address_components
      );
      const normalizedPhone = detailedPlace.international_phone_number
        ? detailedPlace.international_phone_number.replace(/\s+/g, '')
        : normalizePhone(detailedPlace.phone_number, callingCode);
      setValue('phone', normalizedPhone);

      // Set business type from place types
      if (detailedPlace.types && detailedPlace.types.length > 0) {
        const businessType = detailedPlace.types[0].replace(/_/g, ' ');
        setValue('businessType', businessType);
      }

      setMapRegion({
        latitude: detailedPlace.geometry.location.lat,
        longitude: detailedPlace.geometry.location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setSearchResults([]);
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', error?.message || 'Failed to get business details');
    }
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
          <Text style={[styles.title, { color: colors.text }]}>Add Lead</Text>
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
                onChangeText={handleSearch}
              />
              {isSearching && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View
                style={[
                  styles.searchResults,
                  { backgroundColor: colors.surface },
                ]}
              >
                <ScrollView style={styles.resultsList} nestedScrollEnabled>
                  {searchResults.map((place) => (
                    <TouchableOpacity
                      key={place.place_id}
                      style={[
                        styles.resultItem,
                        { borderBottomColor: colors.border },
                      ]}
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
                        {place.rating && (
                          <View style={styles.resultRating}>
                            <Star
                              size={12}
                              color={colors.warning}
                              strokeWidth={2}
                              fill={colors.warning}
                            />
                            <Text
                              style={[
                                styles.ratingText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {place.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
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
              showsUserLocation
              showsMyLocationButton
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
              {searchResults.map((place) => (
                <Marker
                  key={place.place_id}
                  coordinate={{
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                  }}
                  title={place.name}
                  description={place.formatted_address}
                  onPress={() => selectPlace(place)}
                />
              ))}
            </MapView>

            {/* Selected Place Info */}
            {selectedPlace && (
              <View
                style={[
                  styles.selectedPlaceInfo,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.placeHeader}>
                  <Building size={20} color={colors.primary} strokeWidth={2} />
                  <View style={styles.placeInfo}>
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
                  {selectedPlace.rating && (
                    <View style={styles.placeRating}>
                      <Star
                        size={16}
                        color={colors.warning}
                        strokeWidth={2}
                        fill={colors.warning}
                      />
                      <Text style={[styles.ratingText, { color: colors.text }]}>
                        {selectedPlace.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
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
                Contact Name
              </Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
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
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.name && (
                      <Text style={{ color: 'red' }}>
                        {errors.name.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Company *
              </Text>
              <Controller
                control={control}
                name="company"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
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
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.company && (
                      <Text style={{ color: 'red' }}>
                        {errors.company.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Business Type
              </Text>
              <Controller
                control={control}
                name="businessType"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder="e.g., Restaurant, Tech Company..."
                      placeholderTextColor={colors.textSecondary}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {errors.businessType && (
                      <Text style={{ color: 'red' }}>
                        {errors.businessType.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
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
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {errors.email && (
                      <Text style={{ color: 'red' }}>
                        {errors.email.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
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
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="phone-pad"
                    />
                    {errors.phone && (
                      <Text style={{ color: 'red' }}>
                        {errors.phone.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Website
              </Text>
              <Controller
                control={control}
                name="website"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder="Enter website URL..."
                      placeholderTextColor={colors.textSecondary}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                    {errors.website && (
                      <Text style={{ color: 'red' }}>
                        {errors.website.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Address
              </Text>
              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
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
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      multiline
                    />
                    {errors.address && (
                      <Text style={{ color: 'red' }}>
                        {errors.address.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surface,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder="Add notes about this lead..."
                      placeholderTextColor={colors.textSecondary}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      multiline
                      numberOfLines={4}
                    />
                    {errors.notes && (
                      <Text style={{ color: 'red' }}>
                        {errors.notes.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>
          </ScrollView>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface }]}
            onPress={onClose}
            disabled={isCreating}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit(submitForm)}
            disabled={
              isCreating ||
              (!getValues('name')?.trim() && !getValues('company')?.trim())
            }
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Add Lead</Text>
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
    borderBottomWidth: 1,
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
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
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
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeInfo: {
    flex: 1,
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
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
