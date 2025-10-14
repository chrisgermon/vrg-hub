import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Eye, ArrowRight, Plus, Settings } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

export default function NewsViewAll() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();
  const { hasPermission } = usePermissions();
  
  const canManageNews = hasPermission('manage_news') || hasPermission('create_news_article') || hasPermission('publish_news_article');

  const { data: articles, isLoading } = useQuery({
    queryKey: ["published-news-all", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold">Company News</h1>
          <p className="text-muted-foreground mt-1">
            Stay up to date with the latest company announcements
          </p>
        </div>
        {canManageNews && (
          <div className="flex gap-2">
            <Button onClick={() => navigate("/news/new")} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
            <Button onClick={() => navigate("/news")} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </div>
        )}
      </div>

      {!articles || articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No articles published yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Card 
              key={article.id} 
              className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
              onClick={() => navigate(`/news/view/${article.id}`)}
            >
              {article.featured_image_url ? (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Eye className="h-12 w-12 text-primary/40" />
                </div>
              )}
              
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h3>
                
                {article.excerpt && (
                  <p className="text-muted-foreground line-clamp-3">
                    {article.excerpt}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  {article.published_at && (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(article.published_at), "MMM d, yyyy")}
                    </span>
                  )}
                  <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
