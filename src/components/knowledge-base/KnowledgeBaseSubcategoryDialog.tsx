import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface KnowledgeBaseSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  onSuccess: () => void;
}

export function KnowledgeBaseSubcategoryDialog({
  open,
  onOpenChange,
  categoryId,
  onSuccess,
}: KnowledgeBaseSubcategoryDialogProps) {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📂");

  const createSubcategoryMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id || !profile?.user_id || !categoryId) {
        throw new Error("Missing required data");
      }

      const { error } = await supabase
        .from("knowledge_base_subcategories")
        .insert({
          category_id: categoryId,
          company_id: profile.company_id,
          name,
          description,
          icon,
          created_by: profile.user_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subcategory created successfully");
      setName("");
      setDescription("");
      setIcon("📂");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      console.error("Error creating subcategory:", error);
      toast.error("Failed to create subcategory");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a subcategory name");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category first");
      return;
    }
    createSubcategoryMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Subcategory</DialogTitle>
            <DialogDescription>
              Add a subcategory to organize pages within a category
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📂"
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Getting Started"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this subcategory..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSubcategoryMutation.isPending}
            >
              {createSubcategoryMutation.isPending ? "Creating..." : "Create Subcategory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
