import { Platform } from 'react-native';
import type { Region as RNRegion } from 'react-native-maps';
import type { WebRegion } from './WebMapComponents';

// Platform-specific imports
let MapView: any;
let Marker: any;

if (Platform.OS === 'web') {
  // Web implementation - use web-specific components
  const { WebMapView, WebMarker, WebRegion } = require('./WebMapComponents');
  MapView = WebMapView;
  Marker = WebMarker;
} else {
  // Mobile implementation
  try {
    const ReactNativeMaps = require('react-native-maps');
    MapView = ReactNativeMaps.default || ReactNativeMaps;
    Marker = ReactNativeMaps.Marker;
  } catch (error) {
    // Fallback to web implementation if react-native-maps fails to load
    const { WebMapView, WebMarker, WebRegion } = require('./WebMapComponents');
    MapView = WebMapView;
    Marker = WebMarker;
  }
}

export { MapView, Marker };
export type Region = RNRegion | WebRegion;
