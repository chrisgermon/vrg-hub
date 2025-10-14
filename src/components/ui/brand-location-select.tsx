import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Brand {
  id: string;
  display_name: string;
}

interface Location {
  id: string;
  name: string;
  brand_id: string;
}

interface BrandLocationSelectProps {
  selectedBrandId?: string;
  selectedLocationId?: string;
  onBrandChange: (brandId: string) => void;
  onLocationChange: (locationId: string) => void;
  required?: boolean;
}

export function BrandLocationSelect({
  selectedBrandId,
  selectedLocationId,
  onBrandChange,
  onLocationChange,
  required = false,
}: BrandLocationSelectProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadLocations(selectedBrandId);
    } else {
      setLocations([]);
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, display_name')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadLocations = async (brandId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, brand_id')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleBrandChange = (brandId: string) => {
    onBrandChange(brandId);
    onLocationChange(''); // Reset location when brand changes
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="brand">Brand {required && '*'}</Label>
        <Select
          value={selectedBrandId}
          onValueChange={handleBrandChange}
          disabled={loadingBrands}
          required={required}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBrandId && (
        <div className="space-y-2">
          <Label htmlFor="location">Location {required && '*'}</Label>
          <Select
            value={selectedLocationId}
            onValueChange={onLocationChange}
            disabled={loadingLocations}
            required={required}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No locations available for this brand
                </div>
              ) : (
                locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
