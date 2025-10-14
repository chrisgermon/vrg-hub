import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Star, FileText, Folder, LayoutGrid, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { KnowledgeBaseCategorySidebar } from "@/components/knowledge-base/KnowledgeBaseCategorySidebar";
import { KnowledgeBasePageEditor } from "@/components/knowledge-base/KnowledgeBasePageEditor";
import { KnowledgeBasePageList } from "@/components/knowledge-base/KnowledgeBasePageList";
import { KnowledgeBaseCategoryDialog } from "@/components/knowledge-base/KnowledgeBaseCategoryDialog";
import { KnowledgeBasePageDialog } from "@/components/knowledge-base/KnowledgeBasePageDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export default function KnowledgeBase() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ["knowledge-base-categories", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("knowledge_base_categories")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const { data: favorites } = useQuery({
    queryKey: ["knowledge-base-favorites", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      
      const { data, error } = await supabase
        .from("knowledge_base_favorites")
        .select(`
          *,
          page:knowledge_base_pages(*)
        `)
        .eq("user_id", profile.user_id);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const { data: recentPages } = useQuery({
    queryKey: ["knowledge-base-recent", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("knowledge_base_pages")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const handleCreateCategory = () => {
    setIsCategoryDialogOpen(true);
  };

  const handleCreatePage = () => {
    if (!selectedCategoryId) {
      toast.error("Please select a category first");
      return;
    }
    setIsPageDialogOpen(true);
  };

  const handleCategoryCreated = () => {
    refetchCategories();
    toast.success("Category created successfully");
  };

  const handlePageCreated = (pageId: string) => {
    toast.success("Page created successfully");
    setSelectedPageId(pageId);
  };

  if (selectedPageId) {
    return (
      <KnowledgeBasePageEditor
        pageId={selectedPageId}
        onBack={() => setSelectedPageId(null)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <KnowledgeBaseCategorySidebar
          categories={categories || []}
          selectedCategoryId={selectedCategoryId}
          selectedSubcategoryId={selectedSubcategoryId}
          onSelectCategory={setSelectedCategoryId}
          onSelectSubcategory={setSelectedSubcategoryId}
          onRefresh={refetchCategories}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <KnowledgeBaseCategorySidebar
              categories={categories || []}
              selectedCategoryId={selectedCategoryId}
              selectedSubcategoryId={selectedSubcategoryId}
              onSelectCategory={(id) => {
                setSelectedCategoryId(id);
                setIsSidebarOpen(false);
              }}
              onSelectSubcategory={(id) => {
                setSelectedSubcategoryId(id);
                setIsSidebarOpen(false);
              }}
              onRefresh={refetchCategories}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="flex items-center gap-2 p-3 md:p-4">
            {isMobile && (
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size={isMobile ? "icon" : "default"}
                onClick={handleCreateCategory}
                className="shrink-0"
              >
                <Folder className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Category</span>}
              </Button>
              <Button 
                size={isMobile ? "icon" : "default"}
                onClick={handleCreatePage}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Page</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-3 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 md:mb-6 w-full md:w-auto grid grid-cols-2 md:inline-flex">
              <TabsTrigger value="all" className="gap-1 md:gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">All Pages</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1 md:gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Favorites</span>
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-1 md:gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Recent</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-1 md:gap-2">
                <Folder className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <KnowledgeBasePageList
                categoryId={selectedCategoryId}
                subcategoryId={selectedSubcategoryId}
                searchQuery={searchQuery}
                onSelectPage={setSelectedPageId}
                showTemplates={false}
              />
            </TabsContent>

            <TabsContent value="favorites" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites?.map((fav) => (
                  <div
                    key={fav.id}
                    className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                    onClick={() => setSelectedPageId(fav.page_id)}
                  >
                    <div className="flex items-start gap-3">
                      {fav.page?.icon && (
                        <span className="text-2xl">{fav.page.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{fav.page?.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Updated {new Date(fav.page?.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!favorites || favorites.length === 0) && (
                  <p className="text-muted-foreground col-span-full text-center py-8">
                    No favorites yet. Star pages to see them here.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="recent" className="mt-0">
              <div className="space-y-2">
                {recentPages?.map((page) => (
                  <div
                    key={page.id}
                    className="p-3 border rounded-lg hover:border-primary cursor-pointer transition-colors flex items-center gap-3"
                    onClick={() => setSelectedPageId(page.id)}
                  >
                    {page.icon && <span className="text-xl">{page.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{page.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Updated {new Date(page.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <KnowledgeBasePageList
                categoryId={selectedCategoryId}
                subcategoryId={selectedSubcategoryId}
                searchQuery={searchQuery}
                onSelectPage={setSelectedPageId}
                showTemplates={true}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <KnowledgeBaseCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSuccess={handleCategoryCreated}
      />

      <KnowledgeBasePageDialog
        open={isPageDialogOpen}
        onOpenChange={setIsPageDialogOpen}
        categoryId={selectedCategoryId}
        subcategoryId={selectedSubcategoryId}
        onSuccess={handlePageCreated}
      />
    </div>
  );
}
