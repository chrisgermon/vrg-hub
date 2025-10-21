import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Settings, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ExternalProvidersEditor } from "@/components/directory/ExternalProvidersEditor";
import { useAuth } from "@/hooks/useAuth";

interface Brand {
  id: string;
  name: string;
  display_name: string;
}

interface ExternalProvider {
  id: string;
  name: string;
  category: string;
  url?: string;
  description?: string;
}

export default function ExternalProviders() {
  const { userRole } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const isAdmin = userRole === "tenant_admin" || userRole === "super_admin";

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchProviders();
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    setIsLoadingBrands(true);
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      toast.error("Failed to load brands");
      console.error(error);
    } else if (data) {
      setBrands(data);
      if (data.length > 0) setSelectedBrand(data[0].name);
    }
    setIsLoadingBrands(false);
  };

  const fetchProviders = async () => {
    setIsLoadingData(true);
    const brand = brands.find((b) => b.name === selectedBrand);
    if (!brand) {
      setIsLoadingData(false);
      return;
    }

    const { data, error } = await supabase
      .from("external_providers")
      .select("*")
      .eq("brand_id", brand.id)
      .eq("is_active", true)
      .order("category")
      .order("sort_order");

    if (error) {
      toast.error("Failed to load providers");
      console.error(error);
    } else if (data) {
      setProviders(data);
    }
    setIsLoadingData(false);
  };

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProviders = filteredProviders.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<string, ExternalProvider[]>);

  if (isLoadingBrands) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">External Providers</h1>
          <p className="text-muted-foreground">
            Quick access to external healthcare providers and partners
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setEditorOpen(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Edit Providers
          </Button>
        )}
      </div>

      {brands.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {brands.map((brand) => (
            <Button
              key={brand.id}
              variant={selectedBrand === brand.name ? "default" : "outline"}
              onClick={() => setSelectedBrand(brand.name)}
            >
              {brand.display_name}
            </Button>
          ))}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoadingData ? (
        <div className="text-center py-12">Loading providers...</div>
      ) : filteredProviders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No providers found matching your search"
                : "No external providers available"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedProviders).map(([category, categoryProviders]) => (
            <div key={category}>
              <h2 className="text-2xl font-semibold mb-4">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryProviders.map((provider) => (
                  <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-start justify-between">
                        <span>{provider.name}</span>
                        {provider.url && (
                          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                        )}
                      </CardTitle>
                      {provider.description && (
                        <CardDescription>{provider.description}</CardDescription>
                      )}
                    </CardHeader>
                    {provider.url && (
                      <CardContent>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(provider.url, "_blank")}
                        >
                          Visit Website
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ExternalProvidersEditor onClose={() => {
            setEditorOpen(false);
            fetchProviders();
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
