import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, ArrowLeft, Trash2 } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ArticleEditor() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const { user, company, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const isEditing = !!articleId;
  const isSuperAdmin = userRole === "super_admin";
  const canDelete = hasPermission('manage_news') || hasPermission('delete_news_article');

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(company?.id || "");

  // Fetch companies for super admin
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch existing article if editing
  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article", articleId],
    queryFn: async () => {
      if (!articleId) return null;
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("id", articleId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setExcerpt(article.excerpt || "");
      setContent(article.content);
      setStatus(article.status as "draft" | "published" | "archived");
      setFeaturedImageUrl(article.featured_image_url || "");
      setSelectedCompanyId(article.company_id);
    }
  }, [article]);

  useEffect(() => {
    if (company?.id && !selectedCompanyId) {
      setSelectedCompanyId(company.id);
    }
  }, [company]);

  const handleImageUpload = async (file: File) => {
    const companyId = selectedCompanyId || company?.id;
    if (!companyId) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from("news-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("news-images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFeaturedImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeaturedImage(file);
    const url = await handleImageUpload(file);
    if (url) {
      setFeaturedImageUrl(url);
      toast.success("Featured image uploaded");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!title || !content) throw new Error("Title and content are required");
      
      const companyId = selectedCompanyId || company?.id;
      if (!companyId) throw new Error("Company not selected");

      const articleData = {
        title,
        excerpt,
        content,
        status: isDraft ? "draft" : status,
        featured_image_url: featuredImageUrl || null,
        author_id: user.id,
        company_id: companyId,
        published_at: !isDraft && status === "published" ? new Date().toISOString() : null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("news_articles")
          .update(articleData)
          .eq("id", articleId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("news_articles")
          .insert([articleData]);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, isDraft) => {
      queryClient.invalidateQueries({ queryKey: ["news-articles"] });
      toast.success(isDraft ? "Draft saved" : "Article published successfully");
      navigate("/news");
    },
    onError: (error: any) => {
      toast.error("Failed to save article: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!articleId) throw new Error("No article to delete");
      
      const { error } = await supabase
        .from("news_articles")
        .delete()
        .eq("id", articleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-articles"] });
      toast.success("Article deleted successfully");
      navigate("/news");
    },
    onError: (error: any) => {
      toast.error("Failed to delete article: " + error.message);
    },
  });

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link", "image", "video"],
      ["blockquote", "code-block"],
      [{ color: [] }, { background: [] }],
      ["clean"],
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button
          onClick={() => navigate("/news")}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Articles
        </Button>
        <h1 className="text-4xl font-bold">
          {isEditing ? "Edit Article" : "Create New Article"}
        </h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Article Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSuperAdmin && (
              <div>
                <Label htmlFor="company">Company *</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title"
              />
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary (optional)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="featured-image">Featured Image</Label>
              <div className="space-y-2">
                <Input
                  id="featured-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageChange}
                  disabled={uploading}
                />
                {featuredImageUrl && (
                  <img
                    src={featuredImageUrl}
                    alt="Featured"
                    className="w-full max-w-md rounded-lg border"
                  />
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={status} 
                onValueChange={(v) => setStatus(v as "draft" | "published" | "archived")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content *</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              className="min-h-[400px]"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-between">
          {isEditing && canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Article
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Article</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this article? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <div className="flex gap-3 ml-auto">
            <Button
              onClick={() => saveMutation.mutate(true)}
              variant="outline"
              disabled={saveMutation.isPending || !title || !content}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending || !title || !content}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {status === "published" ? "Publish" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
