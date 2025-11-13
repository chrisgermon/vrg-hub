import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, Users, BookOpen } from "lucide-react";
import { ContributorDashboard } from "@/components/newsletter/ContributorDashboard";
import { EditorDashboard } from "@/components/newsletter/EditorDashboard";
import { AssignmentManagement } from "@/components/newsletter/AssignmentManagement";
import { TemplateManagement } from "@/components/newsletter/TemplateManagement";

export default function MonthlyNewsletter() {
  const { user } = useAuth();
  const [isEditor, setIsEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEditorRole();
  }, [user]);

  const checkEditorRole = async () => {
    if (!user) return;

    try {
      const { data: roles, error } = await supabase
        .from("rbac_user_roles")
        .select(`
          role:rbac_roles(name)
        `)
        .eq("user_id", user.id);

      console.log("Newsletter - User roles:", roles);
      console.log("Newsletter - Query error:", error);

      const hasEditorRole = roles?.some((r: any) =>
        ["manager", "tenant_admin", "super_admin"].includes(r.role?.name)
      );
      
      console.log("Newsletter - Has editor role:", hasEditorRole);
      setIsEditor(hasEditorRole || false);
    } catch (error) {
      console.error("Error checking role:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Monthly Newsletter</h1>
          <p className="text-muted-foreground">
            Collaborate on the company monthly newsletter
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/docs/NEWSLETTER_GUIDE.md', '_blank')}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          View Guide
        </Button>
      </div>

      <Tabs defaultValue="contribute" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="contribute">
            <FileText className="h-4 w-4 mr-2" />
            My Contributions
          </TabsTrigger>
        {isEditor && (
          <>
            <TabsTrigger value="editor">
              <Users className="h-4 w-4 mr-2" />
              Editor View
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Users className="h-4 w-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
          </>
        )}
        </TabsList>

        <TabsContent value="contribute" className="space-y-4">
          <ContributorDashboard />
        </TabsContent>

        {isEditor && (
          <>
            <TabsContent value="editor" className="space-y-4">
              <EditorDashboard />
            </TabsContent>
            <TabsContent value="assignments" className="space-y-4">
              <AssignmentManagement />
            </TabsContent>
            <TabsContent value="templates" className="space-y-4">
              <TemplateManagement />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}