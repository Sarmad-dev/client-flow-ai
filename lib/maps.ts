import Constants from 'expo-constants';

const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  business_status?: string;
  rating?: number;
  types: string[];
  phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface PlaceSearchParams {
  query: string;
  location?: {
    lat: number;
    lng: number;
  };
  radius?: number;
  type?: string;
}

export async function searchPlaces(
  params: PlaceSearchParams
): Promise<PlaceResult[]> {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error(
        'Missing Google Places API key. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'
      );
    }
    const { query, location, radius = 5000, type } = params;

    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&key=${GOOGLE_PLACES_API_KEY}`;

    if (location) {
      url += `&location=${location.lat},${location.lng}&radius=${radius}`;
    }

    if (type) {
      url += `&type=${type}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      const message = data.error_message
        ? `${data.status}: ${data.error_message}`
        : data.status;
      throw new Error(`Places API error: ${message}`);
    }

    return data.results.map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      geometry: place.geometry,
      business_status: place.business_status,
      rating: place.rating,
      types: place.types,
    }));
  } catch (error) {
    console.error('Places search error:', error);
    // throw new Error('Failed to search places');
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult> {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error(
        'Missing Google Places API key. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'
      );
    }
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,business_status,rating,types,formatted_phone_number,international_phone_number,website,opening_hours,address_component&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      const message = data.error_message
        ? `${data.status}: ${data.error_message}`
        : data.status;
      throw new Error(`Place Details API error: ${message}`);
    }

    const place = data.result;
    return {
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      geometry: place.geometry,
      business_status: place.business_status,
      rating: place.rating,
      types: place.types,
      phone_number: place.formatted_phone_number,
      international_phone_number: place.international_phone_number,
      website: place.website,
      opening_hours: place.opening_hours,
      address_components: place.address_components,
    };
  } catch (error) {
    console.error('Place details error:', error);
    throw new Error('Failed to get place details');
  }
}

export async function autocompletePlace(
  input: string,
  location?: { lat: number; lng: number }
): Promise<
  Array<{
    place_id: string;
    description: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }>
> {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error(
        'Missing Google Places API key. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'
      );
    }
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&types=establishment&key=${GOOGLE_PLACES_API_KEY}`;

    if (location) {
      url += `&location=${location.lat},${location.lng}&radius=10000`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      const message = data.error_message
        ? `${data.status}: ${data.error_message}`
        : data.status;
      throw new Error(`Autocomplete API error: ${message}`);
    }

    return data.predictions;
  } catch (error) {
    console.error('Autocomplete error:', error);
    return [];
  }
}

export async function nearbyBusinessSearch(
  location: { lat: number; lng: number },
  radius: number = 5000,
  type?: string
): Promise<PlaceResult[]> {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error(
        'Missing Google Places API key. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'
      );
    }
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&key=${GOOGLE_PLACES_API_KEY}`;

    if (type) {
      url += `&type=${type}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      const message = data.error_message
        ? `${data.status}: ${data.error_message}`
        : data.status;
      throw new Error(`Nearby Search API error: ${message}`);
    }

    return data.results.map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.vicinity,
      geometry: place.geometry,
      business_status: place.business_status,
      rating: place.rating,
      types: place.types,
    }));
  } catch (error) {
    console.error('Nearby search error:', error);
    throw new Error('Failed to search nearby businesses');
  }
}
