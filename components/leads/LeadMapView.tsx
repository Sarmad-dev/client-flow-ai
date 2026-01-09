import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapView, Marker, Region } from '../PlatformMapView';
import * as Location from 'expo-location';
import {
  X,
  MapPin,
  Navigation,
  Search,
  Building,
  Star,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useCreateLead } from '@/hooks/useLeads';
import { searchPlaces, getPlaceDetails, PlaceResult } from '@/lib/maps';

interface Lead {
  id: string;
  name: string;
  company: string;
  location_lat?: number;
  location_lng?: number;
  address: string;
  status: string;
}

interface LeadMapViewProps {
  visible: boolean;
  onClose: () => void;
  leads: Lead[];
  onLeadCreated: (lead: any) => void;
}

export function LeadMapView({
  visible,
  onClose,
  leads,
  onLeadCreated,
}: LeadMapViewProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const createLead = useCreateLead();
  const [region, setRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

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
          lat: region.latitude,
          lng: region.longitude,
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
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaceSelect = async (place: PlaceResult) => {
    try {
      const detailedPlace = await getPlaceDetails(place.place_id);
      setSelectedPlace(detailedPlace);
      setRegion({
        latitude: detailedPlace.geometry.location.lat,
        longitude: detailedPlace.geometry.location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  const createLeadFromPlace = async (place: PlaceResult) => {
    try {
      const lead = await createLead.mutateAsync({
        name: place.name,
        company: place.name,
        address: place.formatted_address,
        selectedPlace: {
          place_id: place.place_id,
          formatted_address: place.formatted_address,
          geometry: {
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
          },
          rating: place.rating,
        },
        website: place.website || '',
        phone: place.phone_number || '',
        businessType: place.types?.[0]?.replace(/_/g, ' ') || '',
        source: 'map_search',
      } as any);

      Alert.alert('Success', 'Lead created from map selection!');
      onLeadCreated(lead);
      setSelectedPlace(null);
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error creating lead from place:', error);
      Alert.alert('Error', 'Failed to create lead from map selection');
    }
  };

  const leadsWithLocation = leads.filter(
    (lead) => lead.location_lat && lead.location_lng
  );

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
            Lead Discovery
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[styles.searchContainer, { backgroundColor: colors.surface }]}
        >
          <Search size={20} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for businesses to add as leads..."
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
            style={[styles.searchResults, { backgroundColor: colors.surface }]}
          >
            <ScrollView style={styles.resultsList} nestedScrollEnabled>
              {searchResults.map((place) => (
                <TouchableOpacity
                  key={place.place_id}
                  style={[
                    styles.resultItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handlePlaceSelect(place)}
                >
                  <Building size={16} color={colors.primary} strokeWidth={2} />
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: colors.text }]}>
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
                  <TouchableOpacity
                    style={[
                      styles.addLeadButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      createLeadFromPlace(place);
                    }}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Map */}
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {/* Existing Leads */}
          {leadsWithLocation.map((lead) => (
            <Marker
              key={lead.id}
              coordinate={{
                latitude: lead.location_lat!,
                longitude: lead.location_lng!,
              }}
              title={lead.name}
              description={lead.company}
              onPress={() => setSelectedLead(lead)}
            >
              <View
                style={[
                  styles.leadMarker,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Building size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
            </Marker>
          ))}

          {/* Search Results */}
          {searchResults.map((place) => (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              }}
              title={place.name}
              description={place.formatted_address}
              onPress={() => handlePlaceSelect(place)}
            >
              <View
                style={[
                  styles.searchMarker,
                  { backgroundColor: colors.primary },
                ]}
              >
                <MapPin size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
            </Marker>
          ))}

          {/* Selected Place */}
          {selectedPlace && (
            <Marker
              coordinate={{
                latitude: selectedPlace.geometry.location.lat,
                longitude: selectedPlace.geometry.location.lng,
              }}
              title={selectedPlace.name}
              description={selectedPlace.formatted_address}
            >
              <View
                style={[
                  styles.selectedMarker,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Star size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Current Location Button */}
        <TouchableOpacity
          style={[styles.locationButton, { backgroundColor: colors.surface }]}
          onPress={getCurrentLocation}
        >
          <Navigation size={20} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>

        {/* Selected Lead Info */}
        {selectedLead && (
          <View style={[styles.leadInfo, { backgroundColor: colors.surface }]}>
            <View style={styles.leadHeader}>
              <View
                style={[
                  styles.leadAvatar,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text style={styles.leadInitial}>
                  {selectedLead.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.leadDetails}>
                <Text style={[styles.leadName, { color: colors.text }]}>
                  {selectedLead.name}
                </Text>
                <Text
                  style={[styles.leadCompany, { color: colors.textSecondary }]}
                >
                  {selectedLead.company}
                </Text>
                <Text
                  style={[styles.leadAddress, { color: colors.textSecondary }]}
                >
                  {selectedLead.address}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedLead(null)}
                style={styles.closeLeadInfo}
              >
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Selected Place Info */}
        {selectedPlace && (
          <View style={[styles.placeInfo, { backgroundColor: colors.surface }]}>
            <View style={styles.placeHeader}>
              <Building size={20} color={colors.primary} strokeWidth={2} />
              <View style={styles.placeDetails}>
                <Text style={[styles.placeName, { color: colors.text }]}>
                  {selectedPlace.name}
                </Text>
                <Text
                  style={[styles.placeAddress, { color: colors.textSecondary }]}
                >
                  {selectedPlace.formatted_address}
                </Text>
                {selectedPlace.rating && (
                  <View style={styles.placeRating}>
                    <Star
                      size={14}
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
              <TouchableOpacity
                style={[
                  styles.addPlaceButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => createLeadFromPlace(selectedPlace)}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.stats, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statsText, { color: colors.text }]}>
            Showing {leadsWithLocation.length} leads with locations •{' '}
            {searchResults.length} search results
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
  addLeadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    top: 100,
    right: 24,
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
  leadMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedMarker: {
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
  leadInfo: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  leadDetails: {
    flex: 1,
    marginLeft: 16,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
  },
  leadCompany: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  leadAddress: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  closeLeadInfo: {
    padding: 4,
  },
  placeInfo: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  placeDetails: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeAddress: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  placeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addPlaceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
