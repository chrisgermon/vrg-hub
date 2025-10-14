import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Eye, Edit, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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

export default function ArticlesList() {
  const navigate = useNavigate();
  const { user, company, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const isSuperAdmin = userRole === "super_admin";
  
  const canCreate = hasPermission('manage_news') || hasPermission('create_news_article');
  const canEdit = hasPermission('manage_news') || hasPermission('publish_news_article');
  const canDelete = hasPermission('manage_news') || hasPermission('delete_news_article');

  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ["news-articles", company?.id],
    queryFn: async () => {
      let query = supabase
        .from("news_articles")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Super admins can see all articles, others only their company
      if (!isSuperAdmin && company?.id) {
        query = query.eq("company_id", company.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("news_articles")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Article deleted");
      refetch();
    } catch (error: any) {
      toast.error("Failed to delete article: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      published: "default",
      draft: "secondary",
      archived: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">News Articles</h2>
            <p className="text-muted-foreground mt-1">
              Manage company news and announcements
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => navigate("/news/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          )}
        </div>

        {!articles || articles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No articles yet</p>
              {canCreate && (
                <Button onClick={() => navigate("/news/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Article
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {articles.map((article: any) => (
              <Card key={article.id}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {article.featured_image_url && (
                      <img
                        src={article.featured_image_url}
                        alt={article.title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{article.title}</h3>
                            {getStatusBadge(article.status)}
                          </div>
                          {article.excerpt && (
                            <p className="text-muted-foreground line-clamp-2 mb-3">
                              {article.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(article.created_at), "MMM d, yyyy")}
                            </span>
                            {article.published_at && (
                              <span>
                                Published: {format(new Date(article.published_at), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {article.status === "published" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/news/view/${article.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/news/edit/${article.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteId(article.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
