import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, Search } from 'lucide-react';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  model_number?: string;
  vendor?: string;
  unit_price?: number;
  currency: string;
  category?: string;
}

interface CatalogQuickSelectProps {
  onSelect: (item: CatalogItem) => void;
}

export function CatalogQuickSelect({ onSelect }: CatalogQuickSelectProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCatalogItems();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredItems(
        items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.vendor?.toLowerCase().includes(query) ||
            item.model_number?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, items]);

  const fetchCatalogItems = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch active catalog items
      const { data, error } = await supabase
        .from('hardware_catalog')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error: any) {
      console.error('Error fetching catalog:', error);
      toast.error('Failed to load catalog items');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: CatalogItem) => {
    onSelect(item);
    setOpen(false);
    setSearchQuery('');
    toast.success(`Added ${item.name} to request`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Package className="h-4 w-4" />
          Quick Select from Catalog
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Hardware Catalog</DialogTitle>
          <DialogDescription>
            Select pre-configured items from your company's hardware catalog
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, vendor, model, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading catalog...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No items match your search' : 'No catalog items available'}
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.model_number || '-'}</TableCell>
                    <TableCell className="text-sm">{item.vendor || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {item.unit_price 
                        ? `${item.currency} ${item.unit_price.toFixed(2)}` 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSelect(item)}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
