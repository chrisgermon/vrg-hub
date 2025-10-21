import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  display_name: string;
}

interface ExternalProvider {
  id?: string;
  brand_id: string;
  name: string;
  category: string;
  url?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

interface ExternalProvidersEditorProps {
  onClose: () => void;
}

export function ExternalProvidersEditor({ onClose }: ExternalProvidersEditorProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingProvider, setEditingProvider] = useState<ExternalProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchData();
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    
    if (data) {
      setBrands(data);
      if (data.length > 0) setSelectedBrand(data[0].id);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("external_providers")
      .select("*")
      .eq("brand_id", selectedBrand)
      .order("category")
      .order("sort_order");

    if (data) {
      setProviders(data);
      const uniqueCategories = [...new Set(data.map(p => p.category))];
      setCategories(uniqueCategories);
    }
    setIsLoading(false);
  };

  const saveProvider = async (provider: ExternalProvider) => {
    const { error } = provider.id
      ? await supabase.from("external_providers").update(provider).eq("id", provider.id)
      : await supabase.from("external_providers").insert([provider]);

    if (error) {
      toast.error("Failed to save provider");
      console.error(error);
    } else {
      toast.success("Provider saved successfully");
      fetchData();
      setEditingProvider(null);
    }
  };

  const deleteProvider = async (id: string) => {
    const { error } = await supabase.from("external_providers").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete provider");
    } else {
      toast.success("Provider deleted successfully");
      fetchData();
    }
  };

  const groupedProviders = providers.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<string, ExternalProvider[]>);

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Manage External Providers</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Brand</Label>
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue />
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

        <Button
          onClick={() =>
            setEditingProvider({
              brand_id: selectedBrand,
              name: "",
              category: categories[0] || "",
              url: "",
              description: "",
              sort_order: providers.length,
              is_active: true,
            })
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            {Object.entries(groupedProviders).map(([category, categoryProviders]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categoryProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{provider.name}</div>
                        {provider.url && (
                          <div className="text-sm text-muted-foreground">{provider.url}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProvider(provider)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => provider.id && deleteProvider(provider.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider?.id ? "Edit Provider" : "Add Provider"}
            </DialogTitle>
          </DialogHeader>
          {editingProvider && (
            <ProviderForm
              provider={editingProvider}
              categories={categories}
              onSave={saveProvider}
              onCancel={() => setEditingProvider(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProviderFormProps {
  provider: ExternalProvider;
  categories: string[];
  onSave: (provider: ExternalProvider) => void;
  onCancel: () => void;
}

function ProviderForm({ provider, categories, onSave, onCancel }: ProviderFormProps) {
  const [formData, setFormData] = useState(provider);
  const [customCategory, setCustomCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const categoryToUse = customCategory || formData.category;
    onSave({ ...formData, category: categoryToUse });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Provider Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Category *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => {
            setFormData({ ...formData, category: value });
            setCustomCategory("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select or type new category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Or enter new category"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Website URL</Label>
        <Input
          type="url"
          value={formData.url || ""}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://example.com"
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div>
        <Label>Sort Order</Label>
        <Input
          type="number"
          value={formData.sort_order}
          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
