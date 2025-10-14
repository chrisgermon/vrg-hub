import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Folder, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { CategoryContextMenu } from "./CategoryContextMenu";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface KnowledgeBaseCategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onSelectSubcategory: (id: string | null) => void;
  onRefresh: () => void;
}

export function KnowledgeBaseCategorySidebar({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onSelectSubcategory,
  onRefresh,
}: KnowledgeBaseCategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    isSubcategory: boolean;
  } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{
    id: string;
    name: string;
    isSubcategory: boolean;
  } | null>(null);

  const { data: subcategories, refetch: refetchSubcategories } = useQuery({
    queryKey: ["knowledge-base-subcategories", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      
      const { data, error } = await supabase
        .from("knowledge_base_subcategories")
        .select("*")
        .eq("category_id", selectedCategoryId)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategoryId,
  });

  const handleRefresh = () => {
    refetchSubcategories();
    onRefresh();
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (categoryId: string) => {
    toggleCategory(categoryId);
    onSelectCategory(categoryId);
    onSelectSubcategory(null);
  };

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Knowledge Base</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <Button
            variant={selectedCategoryId === null ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              onSelectCategory(null);
              onSelectSubcategory(null);
            }}
          >
            <Folder className="h-4 w-4 mr-2" />
            All Documents
          </Button>
          
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const isSelected = selectedCategoryId === category.id;
            
            return (
              <div key={category.id}>
                <CategoryContextMenu
                  categoryId={category.id}
                  categoryName={category.name}
                  onEdit={() => setEditingCategory({
                    id: category.id,
                    name: category.name,
                    description: (category as any).description,
                    icon: category.icon,
                    isSubcategory: false,
                  })}
                  onDelete={() => setDeletingCategory({
                    id: category.id,
                    name: category.name,
                    isSubcategory: false,
                  })}
                >
                  <Button
                    variant={isSelected ? "secondary" : "ghost"}
                    className="w-full justify-start group"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-1 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1 shrink-0" />
                    )}
                    {category.icon && (
                      <span className="mr-2">{category.icon}</span>
                    )}
                    {!category.icon && <Folder className="h-4 w-4 mr-2 shrink-0" />}
                    <span className="truncate flex-1 text-left">{category.name}</span>
                  </Button>
                </CategoryContextMenu>
                
                {isExpanded && isSelected && subcategories && subcategories.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {subcategories.map((subcategory) => (
                      <CategoryContextMenu
                        key={subcategory.id}
                        categoryId={subcategory.id}
                        categoryName={subcategory.name}
                        onEdit={() => setEditingCategory({
                          id: subcategory.id,
                          name: subcategory.name,
                          description: subcategory.description,
                          icon: subcategory.icon,
                          isSubcategory: true,
                        })}
                        onDelete={() => setDeletingCategory({
                          id: subcategory.id,
                          name: subcategory.name,
                          isSubcategory: true,
                        })}
                      >
                        <Button
                          variant={selectedSubcategoryId === subcategory.id ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSubcategory(subcategory.id);
                          }}
                        >
                          {subcategory.icon && (
                            <span className="mr-2 text-sm">{subcategory.icon}</span>
                          )}
                          {!subcategory.icon && <Folder className="h-3 w-3 mr-2 shrink-0" />}
                          <span className="truncate">{subcategory.name}</span>
                        </Button>
                      </CategoryContextMenu>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {editingCategory && (
        <EditCategoryDialog
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          categoryId={editingCategory.id}
          categoryName={editingCategory.name}
          categoryDescription={editingCategory.description}
          categoryIcon={editingCategory.icon}
          isSubcategory={editingCategory.isSubcategory}
          onSuccess={handleRefresh}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          categoryId={deletingCategory.id}
          categoryName={deletingCategory.name}
          isSubcategory={deletingCategory.isSubcategory}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
