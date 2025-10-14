import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  ArrowLeft,
  Star,
  Share2,
  History,
  MoreVertical,
  Tag,
  FileText,
  Save,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SharePageDialog } from "./SharePageDialog";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import { ArticleRating } from "./ArticleRating";
import { ArticleFeedback } from "./ArticleFeedback";
import { RelatedArticles } from "./RelatedArticles";
import { AIContentSuggestions } from "./AIContentSuggestions";
import { MediaGallery } from "./MediaGallery";

interface KnowledgeBasePageEditorProps {
  pageId: string;
  onBack: () => void;
}

export function KnowledgeBasePageEditor({
  pageId,
  onBack,
}: KnowledgeBasePageEditorProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  const { data: page, isLoading } = useQuery({
    queryKey: ["knowledge-base-page", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base_pages")
        .select(`
          *,
          category:knowledge_base_categories(name, icon),
          subcategory:knowledge_base_subcategories(name, icon),
          tags:knowledge_base_page_tags(
            tag:knowledge_base_tags(*)
          ),
          versions:knowledge_base_page_versions(*)
        `)
        .eq("id", pageId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: isFavorite } = useQuery({
    queryKey: ["knowledge-base-favorite", pageId, profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return false;
      
      const { data, error } = await supabase
        .from("knowledge_base_favorites")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("page_id", pageId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!profile?.user_id,
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      // Extract HTML content if content is in JSON format
      if (typeof page.content === 'object') {
        setContent("");
      } else {
        setContent(String(page.content || ""));
      }
    }
  }, [page]);

  const updatePageMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const { error } = await supabase
        .from("knowledge_base_pages")
        .update({
          title: data.title,
          content: data.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base-page", pageId] });
      toast.success("Page saved successfully");
    },
    onError: () => {
      toast.error("Failed to save page");
    },
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: async (data: { templateName: string; templateDescription: string }) => {
      const { error } = await supabase
        .from("knowledge_base_pages")
        .update({
          is_template: true,
          template_name: data.templateName,
          template_description: data.templateDescription,
        })
        .eq("id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base-page", pageId] });
      toast.success("Saved as template successfully");
    },
    onError: () => {
      toast.error("Failed to save as template");
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        const { error } = await supabase
          .from("knowledge_base_favorites")
          .delete()
          .eq("user_id", profile?.user_id)
          .eq("page_id", pageId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("knowledge_base_favorites")
          .insert({
            user_id: profile?.user_id,
            page_id: pageId,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base-favorite", pageId] });
      toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updatePageMutation.mutateAsync({ title, content });
    setIsSaving(false);
  };

  const handleSaveAsTemplate = () => {
    const templateName = prompt("Enter template name:");
    if (!templateName) return;
    
    const templateDescription = prompt("Enter template description (optional):");
    saveAsTemplateMutation.mutate({ templateName, templateDescription: templateDescription || "" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page?.category?.name || "Uncategorized"}
            {page?.subcategory && ` / ${page.subcategory.name}`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavoriteMutation.mutate()}
          >
            <Star className={`h-4 w-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => setVersionHistoryOpen(true)}>
            <History className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                Manage Tags
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveAsTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete Page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8 max-w-7xl mx-auto">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="text-4xl font-bold border-none focus-visible:ring-0 px-0"
            />
            
            <Tabs defaultValue="edit" className="w-full">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="mt-6 space-y-6">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Start writing..."
                />
                
                <MediaGallery 
                  pageId={pageId} 
                  canEdit={true}
                />
              </TabsContent>
              
              <TabsContent value="preview" className="mt-6 space-y-6">
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
                
                <MediaGallery 
                  pageId={pageId} 
                  canEdit={false}
                />
              </TabsContent>
            </Tabs>
            
            <div className="space-y-4">
              <ArticleRating pageId={pageId} />
              <ArticleFeedback pageId={pageId} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AIContentSuggestions
              pageTitle={title}
              pageContent={content}
              onApplySuggestion={(suggestion) => {
                setContent(content + "\n\n" + suggestion);
                toast.success("Suggestion applied to content");
              }}
            />
            
            <RelatedArticles
              pageId={pageId}
              categoryId={page?.category_id || null}
              subcategoryId={page?.subcategory_id || null}
              onSelectPage={(id) => {
                // Reload page with new ID - in a real app, this would update the route
                window.location.hash = id;
                window.location.reload();
              }}
            />
          </div>
        </div>
      </div>

      <SharePageDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        pageId={pageId}
        pageTitle={title}
      />

      <VersionHistoryDialog
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        pageId={pageId}
      />
    </div>
  );
}
