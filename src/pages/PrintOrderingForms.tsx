import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Settings, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PrintBrand {
  id: string;
  name: string;
  form_url: string;
}

const PrintOrderingForms = () => {
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brands, setBrands] = useState<PrintBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();

  useEffect(() => {
    loadBrands();
  }, [selectedCompany?.id]);

  const loadBrands = async () => {
    if (!selectedCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('print_order_brands')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Failed to load print order brands');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedBrandData = brands.find(b => b.id === selectedBrand);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-4xl font-bold">Print Ordering Forms</h1>
              <p className="text-lg text-muted-foreground mt-1">
                Order printed materials for your brand
              </p>
            </div>
          </div>
          {userRole === 'super_admin' && (
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/companies/${selectedCompany?.id}?tab=print-brands`)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Brands
            </Button>
          )}
        </div>

        {/* Brand Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Brand</CardTitle>
            <CardDescription>
              Choose the brand you want to order printing for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="brand-select">Brand</Label>
              {brands.length > 0 ? (
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger id="brand-select">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No print ordering forms are available for your company at this time.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Iframe */}
        {selectedBrandData && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedBrandData.name} Print Order Form</CardTitle>
              <CardDescription>
                Complete the form below to place your print order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full rounded-lg overflow-hidden border bg-background">
                <iframe
                  src={selectedBrandData.form_url}
                  className="w-full h-[1200px] border-0"
                  title={`${selectedBrandData.name} Print Order Form`}
                  loading="lazy"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {brands.length > 0 && !selectedBrand && (
          <Card>
            <CardContent className="py-12 text-center">
              <Printer className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a Brand</h3>
              <p className="text-muted-foreground">
                Choose a brand from the dropdown above to view the print ordering form
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PrintOrderingForms;
