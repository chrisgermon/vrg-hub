import { HardwareCatalogManager } from '@/components/hardware-catalog/HardwareCatalogManager';

export default function Catalog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hardware Catalog</h1>
        <p className="text-muted-foreground">Manage pre-configured hardware items for quick selection</p>
      </div>

      <HardwareCatalogManager />
    </div>
  );
}
