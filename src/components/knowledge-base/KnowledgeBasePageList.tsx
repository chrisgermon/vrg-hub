import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KnowledgeBasePageListProps {
  categoryId: string | null;
  subcategoryId: string | null;
  searchQuery: string;
  onSelectPage: (pageId: string) => void;
  showTemplates?: boolean;
}

export function KnowledgeBasePageList({
  categoryId,
  subcategoryId,
  searchQuery,
  onSelectPage,
  showTemplates = false,
}: KnowledgeBasePageListProps) {
  const { profile } = useAuth();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["knowledge-base-pages", profile?.company_id, categoryId, subcategoryId, searchQuery, showTemplates],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from("knowledge_base_pages")
        .select(`
          *,
          category:knowledge_base_categories(name, icon),
          subcategory:knowledge_base_subcategories(name, icon),
          tags:knowledge_base_page_tags(
            tag:knowledge_base_tags(*)
          )
        `)
        .eq("company_id", profile.company_id)
        .eq("is_archived", false)
        .eq("is_template", showTemplates);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      if (subcategoryId) {
        query = query.eq("subcategory_id", subcategoryId);
      }

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pages || pages.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No pages found</h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery
            ? "Try adjusting your search query"
            : showTemplates
            ? "Create your first template"
            : "Create your first page to get started"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pages.map((page) => (
        <Button
          key={page.id}
          variant="outline"
          className="h-auto p-4 flex flex-col items-start gap-3 hover:border-primary transition-colors"
          onClick={() => onSelectPage(page.id)}
        >
          <div className="flex items-start gap-3 w-full">
            {page.icon ? (
              <span className="text-2xl">{page.icon}</span>
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
            )}
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-medium truncate">{page.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Folder className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">
                  {page.category?.name || "Uncategorized"}
                  {page.subcategory && ` / ${page.subcategory.name}`}
                </span>
              </div>
            </div>
          </div>
          
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 w-full">
              {page.tags.slice(0, 3).map((item: any) => (
                <span
                  key={item.tag.id}
                  className="px-2 py-1 text-xs rounded-full bg-secondary"
                  style={{ backgroundColor: item.tag.color ? `${item.tag.color}20` : undefined }}
                >
                  {item.tag.name}
                </span>
              ))}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground w-full text-left">
            Updated {new Date(page.updated_at).toLocaleDateString()}
          </p>
        </Button>
      ))}
    </div>
  );
}
