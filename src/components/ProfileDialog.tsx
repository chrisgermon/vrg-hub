import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLocationSelect } from "@/components/ui/brand-location-select";
import { Loader2 } from "lucide-react";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    location: "",
    avatar_url: "",
    brand_id: "",
    location_id: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
        department: profile.department || "",
        location: profile.location || "",
        avatar_url: profile.avatar_url || "",
        brand_id: profile.brand_id || "",
        location_id: profile.location_id || "",
      });
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          department: formData.department,
          location: formData.location,
          avatar_url: formData.avatar_url,
          brand_id: formData.brand_id || null,
          location_id: formData.location_id || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return formData.email.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="Enter mobile number for notifications"
            />
            <p className="text-xs text-muted-foreground">
              This number will be used for SMS notifications
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              placeholder="Enter your department"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Enter your location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input
              id="avatar_url"
              type="url"
              value={formData.avatar_url}
              onChange={(e) =>
                setFormData({ ...formData, avatar_url: e.target.value })
              }
              placeholder="Enter avatar image URL"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-4">Primary Brand & Location</h3>
            <BrandLocationSelect
              selectedBrandId={formData.brand_id}
              selectedLocationId={formData.location_id}
              onBrandChange={(brandId) => setFormData({ ...formData, brand_id: brandId })}
              onLocationChange={(locationId) => setFormData({ ...formData, location_id: locationId })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
