import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ArticlesList from "@/components/news/ArticlesList";
import ArticlePermissionsManager from "@/components/news/ArticlePermissionsManager";
import { useAuth } from "@/hooks/useAuth";

export default function NewsManagement() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "tenant_admin" || userRole === "super_admin";

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          {isAdmin && <TabsTrigger value="permissions">Permissions</TabsTrigger>}
        </TabsList>

        <TabsContent value="articles">
          <ArticlesList />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="permissions">
            <ArticlePermissionsManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
