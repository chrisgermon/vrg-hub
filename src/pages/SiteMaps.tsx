import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  brand_id: string;
  brands?: {
    display_name: string;
  };
}

interface Brand {
  id: string;
  display_name: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: -25.2744, // Australia center
  lng: 133.7751,
};

export default function SiteMaps() {
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, display_name')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      return data as Brand[];
    },
  });

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', selectedBrand],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select(`
          *,
          brands:brand_id(display_name)
        `)
        .eq('is_active', true);

      if (selectedBrand !== 'all') {
        query = query.eq('brand_id', selectedBrand);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return data as Location[];
    },
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Adjust map bounds when locations change
  const fitBounds = useCallback(() => {
    if (!map || !locations || locations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    let hasValidCoords = false;

    locations.forEach((location) => {
      // For demo purposes, using approximate coordinates based on city/state
      // In production, you'd want to geocode the addresses or store lat/lng
      const coords = getCoordinatesForLocation(location);
      if (coords) {
        bounds.extend(coords);
        hasValidCoords = true;
      }
    });

    if (hasValidCoords) {
      map.fitBounds(bounds);
    }
  }, [map, locations]);

  // Helper function to get coordinates (simplified - in production use geocoding)
  const getCoordinatesForLocation = (location: Location): google.maps.LatLngLiteral | null => {
    // This is a simplified demo - in production, you'd geocode addresses
    // or store lat/lng in the database
    if (!location.city && !location.state) return null;
    
    // Example: Return approximate coordinates based on state
    // You should implement proper geocoding or store coordinates in DB
    const stateCoords: Record<string, google.maps.LatLngLiteral> = {
      'NSW': { lat: -33.8688, lng: 151.2093 },
      'VIC': { lat: -37.8136, lng: 144.9631 },
      'QLD': { lat: -27.4698, lng: 153.0251 },
      'SA': { lat: -34.9285, lng: 138.6007 },
      'WA': { lat: -31.9505, lng: 115.8605 },
      'TAS': { lat: -42.8821, lng: 147.3272 },
      'NT': { lat: -12.4634, lng: 130.8456 },
      'ACT': { lat: -35.2809, lng: 149.1300 },
    };

    return location.state ? stateCoords[location.state.toUpperCase()] || defaultCenter : defaultCenter;
  };

  if (loadError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load Google Maps. Please make sure the GOOGLE_MAPS_API_KEY is configured.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Site Maps</h1>
        <p className="text-muted-foreground mt-2">
          View all business locations on the map
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Map
              </CardTitle>
              <CardDescription>
                {selectedBrand === 'all' 
                  ? `Showing all ${locations?.length || 0} locations`
                  : `Showing ${locations?.length || 0} ${brands?.find(b => b.id === selectedBrand)?.display_name} locations`
                }
              </CardDescription>
            </div>
            <div className="w-[200px]">
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands?.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {locationsLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={5}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                  streetViewControl: false,
                  mapTypeControl: true,
                  fullscreenControl: true,
                }}
              >
                {locations?.map((location) => {
                  const coords = getCoordinatesForLocation(location);
                  if (!coords) return null;

                  return (
                    <Marker
                      key={location.id}
                      position={coords}
                      onClick={() => setSelectedLocation(location)}
                      title={location.name}
                    />
                  );
                })}

                {selectedLocation && (
                  <InfoWindow
                    position={getCoordinatesForLocation(selectedLocation)!}
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <div className="p-2">
                      <h3 className="font-semibold text-sm mb-1">{selectedLocation.name}</h3>
                      {selectedLocation.brands && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {selectedLocation.brands.display_name}
                        </p>
                      )}
                      {selectedLocation.address && (
                        <p className="text-xs">{selectedLocation.address}</p>
                      )}
                      {(selectedLocation.city || selectedLocation.state || selectedLocation.zip_code) && (
                        <p className="text-xs">
                          {[selectedLocation.city, selectedLocation.state, selectedLocation.zip_code]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {selectedLocation.phone && (
                        <p className="text-xs mt-1">
                          <strong>Phone:</strong> {selectedLocation.phone}
                        </p>
                      )}
                      {selectedLocation.email && (
                        <p className="text-xs">
                          <strong>Email:</strong> {selectedLocation.email}
                        </p>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note: Location coordinates are approximate. For accurate mapping, geocode addresses or store latitude/longitude in the database.
        </AlertDescription>
      </Alert>
    </div>
  );
}
