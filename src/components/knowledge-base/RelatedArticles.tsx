import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RelatedArticlesProps {
  pageId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  onSelectPage?: (pageId: string) => void;
}

export function RelatedArticles({ pageId, categoryId, subcategoryId, onSelectPage }: RelatedArticlesProps) {
  const { data: relatedPages, isLoading } = useQuery({
    queryKey: ["related-articles", pageId, categoryId, subcategoryId],
    queryFn: async () => {
      let query = supabase
        .from("knowledge_base_pages")
        .select("id, title, icon, updated_at")
        .neq("id", pageId)
        .eq("is_archived", false)
        .limit(5);

      // First try to get articles from the same subcategory
      if (subcategoryId) {
        query = query.eq("subcategory_id", subcategoryId);
      } else if (categoryId) {
        // Otherwise, get articles from the same category
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!(categoryId || subcategoryId),
  });

  if (isLoading || !relatedPages || relatedPages.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Related Articles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {relatedPages.map((page) => (
            <Button
              key={page.id}
              variant="ghost"
              className="w-full justify-start h-auto p-3 text-left"
              onClick={() => onSelectPage?.(page.id)}
            >
              <div className="flex items-start gap-3 w-full">
                {page.icon ? (
                  <span className="text-xl">{page.icon}</span>
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{page.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(page.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
