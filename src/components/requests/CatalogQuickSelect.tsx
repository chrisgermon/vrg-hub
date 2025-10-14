import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

interface CatalogQuickSelectProps {
  onSelect: (item: any) => void;
}

export function CatalogQuickSelect({ onSelect }: CatalogQuickSelectProps) {
  return (
    <Button variant="outline" disabled>
      <Package className="h-4 w-4 mr-2" />
      Catalog (unavailable)
    </Button>
  );
}
