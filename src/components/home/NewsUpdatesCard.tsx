import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Newspaper } from "lucide-react";
import { Link } from "react-router-dom";

export function NewsUpdatesCard() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["news-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, excerpt, published_at, featured_image_url")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          News & Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/news/${article.id}`}
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {article.published_at && format(new Date(article.published_at), "MMM d, yyyy")}
                </p>
              </Link>
            ))}
            <Link
              to="/news"
              className="block text-sm text-primary hover:underline font-medium pt-2"
            >
              View All →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No news available</p>
        )}
      </CardContent>
    </Card>
  );
}
