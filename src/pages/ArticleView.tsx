import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, User, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
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
import { useState } from "react";

export default function ArticleView() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article-view", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("id", articleId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Track that user viewed this article
      if (user?.id) {
        const { data: company } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (company?.company_id) {
          // Insert or ignore if already exists
          await supabase
            .from("news_article_views")
            .upsert({
              article_id: articleId,
              user_id: user.id,
              company_id: company.company_id,
            }, {
              onConflict: 'article_id,user_id',
              ignoreDuplicates: true
            });
        }
      }

      // Fetch author details separately
      const { data: authorData } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("user_id", data.author_id)
        .maybeSingle();

      return {
        ...data,
        author: authorData || { name: "Unknown Author", email: "" }
      };
    },
    enabled: Boolean(articleId),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("news_articles")
        .delete()
        .eq("id", articleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["news-articles"] });
      navigate("/home");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const isAuthor = user?.id === article?.author_id;
  const isAdmin = userRole === "tenant_admin" || userRole === "super_admin";
  const canManage = isAuthor || isAdmin;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <p className="text-center text-muted-foreground">Article not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => navigate("/home")}
          variant="ghost"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>

        {canManage && (
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`/news/edit/${articleId}`)}
              variant="outline"
            >
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              variant="destructive"
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <article className="space-y-6">
        {article.featured_image_url && (
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full aspect-video object-cover rounded-lg"
          />
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={article.status === "published" ? "default" : "secondary"}>
              {article.status}
            </Badge>
          </div>

          <h1 className="text-4xl font-bold">{article.title}</h1>

          {article.excerpt && (
            <p className="text-xl text-muted-foreground">{article.excerpt}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground border-y py-4">
            <span className="flex items-center gap-2">
              <User className="size-4" />
              {(article as any).author?.name || "Unknown Author"}
            </span>
            {article.published_at && (
              <span className="flex items-center gap-2">
                <Calendar className="size-4" />
                {format(new Date(article.published_at), "MMMM d, yyyy")}
              </span>
            )}
          </div>

          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </article>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
    </div>
  );
}
