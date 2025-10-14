import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  categoryDescription?: string;
  categoryIcon?: string;
  isSubcategory?: boolean;
  onSuccess: () => void;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  categoryDescription,
  categoryIcon,
  isSubcategory = false,
  onSuccess,
}: EditCategoryDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(categoryName);
  const [description, setDescription] = useState(categoryDescription || "");
  const [icon, setIcon] = useState(categoryIcon || "📁");

  useEffect(() => {
    if (open) {
      setName(categoryName);
      setDescription(categoryDescription || "");
      setIcon(categoryIcon || "📁");
    }
  }, [open, categoryName, categoryDescription, categoryIcon]);

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      const table = isSubcategory ? "knowledge_base_subcategories" : "knowledge_base_categories";
      
      const { error } = await supabase
        .from(table)
        .update({
          name,
          description,
          icon,
        })
        .eq("id", categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${isSubcategory ? "Subcategory" : "Category"} updated successfully`,
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCategoryMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {isSubcategory ? "Subcategory" : "Category"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="icon">Icon (Emoji)</Label>
            <Input
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📁"
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Documentation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCategoryMutation.isPending}>
              {updateCategoryMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
