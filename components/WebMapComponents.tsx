import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// Web-specific MapView component
export function WebMapView({
  region,
  onRegionChangeComplete,
  children,
  style,
  showsUserLocation,
  showsMyLocationButton,
  ...props
}: any) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, style, { backgroundColor: colors.surface }]}
    >
      <View style={styles.placeholder}>
        <Text style={[styles.text, { color: colors.text }]}>Map View</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          Maps are not available on web platform
        </Text>
        {region && (
          <Text style={[styles.coordinates, { color: colors.textSecondary }]}>
            Lat: {region.latitude.toFixed(4)}, Lng:{' '}
            {region.longitude.toFixed(4)}
          </Text>
        )}
        <View style={styles.childrenContainer}>{children}</View>
      </View>
    </View>
  );
}

// Web-specific Marker component
export function WebMarker({
  coordinate,
  title,
  description,
  onPress,
  children,
}: any) {
  const { colors } = useTheme();

  return (
    <View style={styles.markerContainer}>
      <View style={[styles.marker, { backgroundColor: colors.primary }]}>
        <Text style={styles.markerText}>📍</Text>
      </View>
      {title && (
        <View style={[styles.markerInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.markerTitle, { color: colors.text }]}>
            {title}
          </Text>
          {description && (
            <Text
              style={[
                styles.markerDescription,
                { color: colors.textSecondary },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// Web-specific Region type
export interface WebRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  coordinates: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  childrenContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  marker: {
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
  markerText: {
    fontSize: 16,
  },
  markerInfo: {
    position: 'absolute',
    top: 40,
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  markerDescription: {
    fontSize: 10,
    marginTop: 2,
  },
});
