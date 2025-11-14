import React from 'react';
import { Platform } from 'react-native';

// Platform-specific imports
let MapView: any;
let Marker: any;
let Region: any;

if (Platform.OS === 'web') {
  // Web implementation - use web-specific components
  const { WebMapView, WebMarker, WebRegion } = require('./WebMapComponents');
  MapView = WebMapView;
  Marker = WebMarker;
  Region = WebRegion;
} else {
  // Mobile implementation
  try {
    const ReactNativeMaps = require('react-native-maps');
    MapView = ReactNativeMaps.default;
    Marker = ReactNativeMaps.Marker;
    Region = ReactNativeMaps.Region;
  } catch (error) {
    // Fallback to web implementation if react-native-maps fails to load
    const { WebMapView, WebMarker, WebRegion } = require('./WebMapComponents');
    MapView = WebMapView;
    Marker = WebMarker;
    Region = WebRegion;
  }
}

export { MapView, Marker, Region };
