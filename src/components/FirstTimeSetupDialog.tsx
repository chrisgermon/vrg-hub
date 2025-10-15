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
import { BrandLocationSelect } from "@/components/ui/brand-location-select";
import { Loader2 } from "lucide-react";

export function FirstTimeSetupDialog() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  useEffect(() => {
    // Show dialog if user is logged in but hasn't set brand/location
    if (user && profile && !profile.brand_id) {
      setOpen(true);
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBrandId || !selectedLocationId) {
      toast({
        title: "Missing information",
        description: "Please select both a brand and location",
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
    <Dialog open={open} onOpenChange={(value) => {
      // Don't allow closing without completing setup
      if (profile?.brand_id) {
        setOpen(value);
      }
    }}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome! Let's set up your profile</DialogTitle>
          <DialogDescription>
            Please select your primary brand and location to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <BrandLocationSelect
            selectedBrandId={selectedBrandId}
            selectedLocationId={selectedLocationId}
            onBrandChange={setSelectedBrandId}
            onLocationChange={setSelectedLocationId}
            required
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !selectedBrandId || !selectedLocationId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
