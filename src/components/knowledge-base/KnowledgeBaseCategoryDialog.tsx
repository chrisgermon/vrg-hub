import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface KnowledgeBaseCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function KnowledgeBaseCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: KnowledgeBaseCategoryDialogProps) {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");
  const [parentCategoryId, setParentCategoryId] = useState<string>("none");

  // Fetch existing categories for parent selection
  const { data: categories } = useQuery({
    queryKey: ["knowledge-base-categories", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("knowledge_base_categories")
        .select("id, name, icon")
        .eq("company_id", profile.company_id)
        .eq("is_archived", false)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id && open,
  });

  // Update icon when parent category changes
  const handleParentChange = (value: string) => {
    setParentCategoryId(value);
    // Change default icon based on whether it's a subcategory
    if (value !== "none" && icon === "📁") {
      setIcon("📂");
    } else if (value === "none" && icon === "📂") {
      setIcon("📁");
    }
  };

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id || !profile?.user_id) {
        throw new Error("User not authenticated");
      }

      // If parent category is selected, create as subcategory
      if (parentCategoryId && parentCategoryId !== "none") {
        const { error } = await supabase
          .from("knowledge_base_subcategories")
          .insert({
            category_id: parentCategoryId,
            company_id: profile.company_id,
            name,
            description,
            icon,
            created_by: profile.user_id,
          });

        if (error) throw error;
      } else {
        // Create as top-level category
        const { error } = await supabase
          .from("knowledge_base_categories")
          .insert({
            company_id: profile.company_id,
            name,
            description,
            icon,
            created_by: profile.user_id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      const message = parentCategoryId && parentCategoryId !== "none" ? "Subcategory created successfully" : "Category created successfully";
      toast.success(message);
      setName("");
      setDescription("");
      setIcon("📁");
      setParentCategoryId("none");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    createCategoryMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              {parentCategoryId 
                ? "Create a subcategory within an existing category"
                : "Create a top-level category or subcategory"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category (Optional)</Label>
              <Select value={parentCategoryId} onValueChange={handleParentChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="None (Top-level category)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-md z-50">
                  <SelectItem value="none">None (Top-level category)</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select a parent to create this as a subcategory
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder={parentCategoryId ? "📂" : "📁"}
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={parentCategoryId !== "none" ? "e.g., Getting Started" : "e.g., Product Documentation"}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this category contain?"
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
              disabled={createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
