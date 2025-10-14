import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface NewsFeedModuleProps {
  title?: string;
  maxItems?: number;
}

export function NewsFeedModule({ 
  title = "Latest News", 
  maxItems = 4
}: NewsFeedModuleProps) {
  const navigate = useNavigate();
  const { company } = useAuth();

  // Fetch real news articles from database
  const { data: articles } = useQuery({
    queryKey: ["published-news-articles", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("company_id", company.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const displayNews = articles || [];

  return (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
        <Button 
          variant="link" 
          className="text-primary hover:text-primary/80"
          onClick={() => navigate("/news/view-all")}
        >
          See all
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {displayNews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No published articles yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="w-[180px] font-semibold">Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayNews.map((article: any) => (
                <TableRow 
                  key={article.id}
                  onClick={() => navigate(`/news/view/${article.id}`)}
                  className="cursor-pointer hover:bg-accent/50 transition-colors duration-200"
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{article.title}</span>
                      {article.excerpt && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {article.excerpt}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(article.published_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
