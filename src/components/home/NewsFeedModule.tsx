import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsFeedModuleProps {
  title?: string;
  maxItems?: number;
}

export function NewsFeedModule({ 
  title = "Latest News", 
  maxItems = 4
}: NewsFeedModuleProps) {
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['news-articles-feed', maxItems],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('id, title, excerpt, published_at, slug, featured_image_url')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(maxItems);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-md h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load news articles.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Newspaper className="h-4 w-4" />
            <AlertDescription>
              No news articles published yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
          <Link to="/news/view-all" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              to={`/news/${article.slug || article.id}`}
              className="block group"
            >
              <div className="flex gap-3 items-start">
                {article.featured_image_url && (
                  <img 
                    src={article.featured_image_url} 
                    alt={article.title}
                    className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {article.excerpt}
                    </p>
                  )}
                  {article.published_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}