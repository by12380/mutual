import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon issue with Leaflet + bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Component that handles map click events and repositions the map
 */
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

/**
 * Component that flies the map to a new center position
 */
function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 13, { duration: 1 });
    }
  }, [center, map]);
  return null;
}

/**
 * Reverse geocode coordinates to a human-readable location name
 */
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();
    const addr = data.address;

    // Build a readable location string
    const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || '';
    const state = addr.state || '';
    const country = addr.country || '';

    const parts = [city, state, country].filter(Boolean);
    return parts.join(', ') || data.display_name || 'Unknown location';
  } catch {
    return 'Unknown location';
  }
}

/**
 * Search for locations using Nominatim geocoding
 */
async function searchLocation(query) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    return await response.json();
  } catch {
    return [];
  }
}

/**
 * LocationPicker component
 * 
 * Props:
 * - value: { name: string, lat: number, lng: number } | null
 * - onChange: (location: { name: string, lat: number, lng: number } | null) => void
 * - compact: boolean - if true, shows a smaller version suitable for forms
 */
export default function LocationPicker({ value, onChange, compact = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(
    value?.lat && value?.lng
      ? [value.lat, value.lng]
      : [39.8283, -98.5795] // Default: center of US
  );
  const [markerPos, setMarkerPos] = useState(
    value?.lat && value?.lng ? [value.lat, value.lng] : null
  );
  const [geocoding, setGeocoding] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value?.lat && value?.lng) {
      setMarkerPos([value.lat, value.lng]);
      setMapCenter([value.lat, value.lng]);
    }
  }, [value]);

  // Debounced search
  const handleSearchInput = useCallback((query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchLocation(query);
      setSearchResults(results);
      setSearching(false);
    }, 400);
  }, []);

  // Handle selecting a search result
  const handleSelectResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address;

    const city = addr?.city || addr?.town || addr?.village || addr?.hamlet || addr?.county || '';
    const state = addr?.state || '';
    const country = addr?.country || '';
    const name = [city, state, country].filter(Boolean).join(', ') || result.display_name;

    setMarkerPos([lat, lng]);
    setMapCenter([lat, lng]);
    setSearchQuery('');
    setSearchResults([]);
    onChange({ name, lat, lng });
  };

  // Handle clicking on the map
  const handleMapClick = async (latlng) => {
    const { lat, lng } = latlng;
    setMarkerPos([lat, lng]);
    setGeocoding(true);

    const name = await reverseGeocode(lat, lng);
    setGeocoding(false);
    onChange({ name, lat, lng });
  };

  // Try to get user's current location
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setMarkerPos([lat, lng]);
        setMapCenter([lat, lng]);
        setGeocoding(true);

        const name = await reverseGeocode(lat, lng);
        setGeocoding(false);
        onChange({ name, lat, lng });
        setShowMap(true);
      },
      () => {
        // Silently fail if user denies location access
      }
    );
  };

  const handleClear = () => {
    setMarkerPos(null);
    setSearchQuery('');
    setSearchResults([]);
    onChange(null);
  };

  return (
    <div className="w-full">
      {/* Display current location */}
      {value?.name && !showMap && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="flex-1 truncate">{value.name}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-primary-500 hover:text-primary-700 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search + action buttons */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => setShowMap(true)}
              className="input-field pl-9"
              placeholder="Search for a city or place..."
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleUseMyLocation}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex-shrink-0"
            title="Use my location"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
            </svg>
          </button>

          {!compact && (
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className={`px-3 py-2 rounded-lg transition-colors flex-shrink-0 ${
                showMap
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={showMap ? 'Hide map' : 'Show map'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0 border-gray-100"
              >
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700 line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geocoding indicator */}
      {geocoding && (
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-500 border-t-transparent" />
          Getting location name...
        </div>
      )}

      {/* Map */}
      {showMap && (
        <div className={`mt-3 rounded-lg overflow-hidden border border-gray-200 ${compact ? 'h-48' : 'h-64'}`}>
          <MapContainer
            center={mapCenter}
            zoom={value?.lat ? 13 : 4}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationSelect={handleMapClick} />
            <MapFlyTo center={mapCenter} />
            {markerPos && <Marker position={markerPos} />}
          </MapContainer>
        </div>
      )}

      {showMap && (
        <p className="text-xs text-gray-500 mt-1">Click on the map to select your location</p>
      )}
    </div>
  );
}
