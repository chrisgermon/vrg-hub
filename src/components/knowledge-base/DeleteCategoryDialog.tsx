import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  isSubcategory?: boolean;
  onSuccess: () => void;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  isSubcategory = false,
  onSuccess,
}: DeleteCategoryDialogProps) {
  const { toast } = useToast();

  const deleteCategoryMutation = useMutation({
    mutationFn: async () => {
      const table = isSubcategory ? "knowledge_base_subcategories" : "knowledge_base_categories";
      
      // Soft delete by setting is_archived to true
      const { error } = await supabase
        .from(table)
        .update({ is_archived: true })
        .eq("id", categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${isSubcategory ? "Subcategory" : "Category"} deleted successfully`,
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteCategoryMutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {isSubcategory ? "Subcategory" : "Category"}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{categoryName}"? This will archive the {isSubcategory ? "subcategory" : "category"} and all its pages. This action can be undone by a system administrator.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteCategoryMutation.isPending}
          >
            {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
