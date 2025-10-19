import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  latitude?: number | null;
  longitude?: number | null;
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
  const [geocodedLocations, setGeocodedLocations] = useState<Map<string, google.maps.LatLngLiteral>>(new Map());
  const [geocoding, setGeocoding] = useState(false);

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

  // Geocode a single location
  const geocodeLocation = async (location: Location): Promise<google.maps.LatLngLiteral | null> => {
    // Check if already geocoded
    if (geocodedLocations.has(location.id)) {
      return geocodedLocations.get(location.id)!;
    }

    // Check if coordinates are stored in database
    if (location.latitude && location.longitude) {
      const coords = { lat: location.latitude, lng: location.longitude };
      setGeocodedLocations(prev => new Map(prev).set(location.id, coords));
      return coords;
    }

    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          address: location.address,
          city: location.city,
          state: location.state,
          zipCode: location.zip_code,
        },
      });

      if (error) throw error;

      if (data && data.lat && data.lng) {
        const coords = { lat: data.lat, lng: data.lng };
        setGeocodedLocations(prev => new Map(prev).set(location.id, coords));
        return coords;
      }
    } catch (error) {
      console.error(`Failed to geocode location ${location.name}:`, error);
    }

    return null;
  };

  // Geocode all locations when they load
  useEffect(() => {
    if (!locations || locations.length === 0) return;

    const geocodeAll = async () => {
      setGeocoding(true);
      let geocodedCount = 0;
      
      for (const location of locations) {
        const coords = await geocodeLocation(location);
        if (coords) geocodedCount++;
      }
      
      setGeocoding(false);
      if (geocodedCount > 0) {
        toast.success(`Successfully geocoded ${geocodedCount} of ${locations.length} locations`);
      }
    };

    geocodeAll();
  }, [locations]);

  // Get coordinates for a location
  const getCoordinatesForLocation = (location: Location): google.maps.LatLngLiteral | null => {
    // Try geocoded coordinates first
    if (geocodedLocations.has(location.id)) {
      return geocodedLocations.get(location.id)!;
    }
    
    // Try database coordinates
    if (location.latitude && location.longitude) {
      return { lat: location.latitude, lng: location.longitude };
    }
    
    return null;
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
                {geocoding && ' (Geocoding addresses...)'}
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

      {geocoding && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Geocoding location addresses using Google Maps API...
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Locations are geocoded using Google's Geocoding API for accurate positioning on the map.
        </AlertDescription>
      </Alert>
    </div>
  );
}
