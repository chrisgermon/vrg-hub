import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Brand {
  id: string;
  display_name: string;
  logo_url: string | null;
}

interface Location {
  id: string;
  name: string;
  brand_id: string;
}

export function FirstTimeSetupDialog() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"brand" | "location">("brand");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    // Show dialog if user is logged in but hasn't set brand/location
    if (user && profile && !profile.brand_id) {
      setOpen(true);
      loadBrands();
    }
  }, [user, profile]);

  useEffect(() => {
    if (selectedBrandId && step === "location") {
      loadLocations(selectedBrandId);
    }
  }, [selectedBrandId, step]);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, display_name, logo_url")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error loading brands:", error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadLocations = async (brandId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, brand_id")
        .eq("brand_id", brandId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
  };

  const handleNextToLocation = () => {
    if (!selectedBrandId) {
      toast({
        title: "Please select a brand",
        description: "You must select a brand to continue",
        variant: "destructive",
      });
      return;
    }
    setStep("location");
  };

  const handleSubmit = async () => {
    if (!selectedLocationId) {
      toast({
        title: "Please select a location",
        description: "You must select a location to continue",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          brand_id: selectedBrandId,
          location_id: selectedLocationId,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Setup complete",
        description: "Your profile has been configured successfully.",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        // Don't allow closing without completing setup
        if (profile?.brand_id) {
          setOpen(value);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[600px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step === "brand" ? "Select Your Brand" : "Select Your Location"}
          </DialogTitle>
          <DialogDescription>
            {step === "brand"
              ? "Choose your primary brand to get started."
              : "Choose your primary location within the selected brand."}
          </DialogDescription>
        </DialogHeader>

        {step === "brand" ? (
          <div className="space-y-6">
            {loadingBrands ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => handleBrandSelect(brand.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:border-primary/50",
                      selectedBrandId === brand.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    {selectedBrandId === brand.id && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.display_name}
                        className="h-16 w-auto object-contain mb-3"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mb-3">
                        <span className="text-2xl font-bold text-muted-foreground">
                          {brand.display_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-center">
                      {brand.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleNextToLocation}
                disabled={!selectedBrandId || loadingBrands}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {loadingLocations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <RadioGroup
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                  className="space-y-2"
                >
                  {locations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No locations available for this brand
                    </div>
                  ) : (
                    locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      >
                        <RadioGroupItem value={location.id} id={location.id} />
                        <Label
                          htmlFor={location.id}
                          className="flex-1 cursor-pointer"
                        >
                          {location.name}
                        </Label>
                      </div>
                    ))
                  )}
                </RadioGroup>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep("brand")}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !selectedLocationId}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Complete Setup
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
