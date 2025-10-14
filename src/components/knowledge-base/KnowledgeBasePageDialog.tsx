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
import { toast } from "sonner";

interface KnowledgeBasePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  subcategoryId: string | null;
  onSuccess: (pageId: string) => void;
}

export function KnowledgeBasePageDialog({
  open,
  onOpenChange,
  categoryId,
  subcategoryId,
  onSuccess,
}: KnowledgeBasePageDialogProps) {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📄");

  const createPageMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id || !profile?.user_id || !categoryId) {
        throw new Error("Missing required data");
      }

      const { data, error } = await supabase
        .from("knowledge_base_pages")
        .insert({
          category_id: categoryId,
          subcategory_id: subcategoryId,
          company_id: profile.company_id,
          title,
          icon,
          content: "<p>Start writing...</p>",
          created_by: profile.user_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTitle("");
      setIcon("📄");
      onOpenChange(false);
      onSuccess(data.id);
    },
    onError: (error) => {
      console.error("Error creating page:", error);
      toast.error("Failed to create page");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a page title");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category first");
      return;
    }
    createPageMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Add a new document or page to your knowledge base
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📄"
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Installation Guide"
                required
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
              disabled={createPageMutation.isPending}
            >
              {createPageMutation.isPending ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
