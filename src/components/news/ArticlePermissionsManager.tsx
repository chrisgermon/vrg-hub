import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus, X } from "lucide-react";

export default function ArticlePermissionsManager() {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Fetch users from the company
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["company-users", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("company_id", company.id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Fetch users with article permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["article-permissions", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("news_article_permissions")
        .select("*")
        .eq("company_id", company.id);

      if (permissionsError) throw permissionsError;

      // Fetch user details for each permission
      const userIds = permissionsData.map(p => p.user_id);
      if (userIds.length === 0) return [];

      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      if (usersError) throw usersError;

      // Merge the data
      return permissionsData.map(permission => ({
        ...permission,
        user: usersData.find(u => u.user_id === permission.user_id) || { name: "Unknown", email: "" }
      }));
    },
    enabled: !!company?.id,
  });

  const addPermissionMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!company?.id) throw new Error("Company not found");

      const { error } = await supabase
        .from("news_article_permissions")
        .insert([{ user_id: userId, company_id: company.id }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-permissions"] });
      toast.success("Permission granted");
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast.error("Failed to grant permission: " + error.message);
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("news_article_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-permissions"] });
      toast.success("Permission removed");
    },
    onError: (error: any) => {
      toast.error("Failed to remove permission: " + error.message);
    },
  });

  const availableUsers = users?.filter(
    (user) => !permissions?.some((p: any) => p.user_id === user.user_id)
  ) || [];

  if (usersLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Article Management Permissions</CardTitle>
        <CardDescription>
          Grant individual users permission to create and manage news articles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a user..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => selectedUserId && addPermissionMutation.mutate(selectedUserId)}
            disabled={!selectedUserId || addPermissionMutation.isPending}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {permissions && permissions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Users with permissions:</p>
            <div className="space-y-2">
              {permissions.map((permission: any) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{permission.user.name}</p>
                    <p className="text-sm text-muted-foreground">{permission.user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePermissionMutation.mutate(permission.id)}
                    disabled={removePermissionMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No individual permissions granted. Managers and admins can always manage articles.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
