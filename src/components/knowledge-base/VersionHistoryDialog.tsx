import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
}

interface PageVersion {
  id: string;
  version_number: number;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  pageId,
}: VersionHistoryDialogProps) {
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<PageVersion | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["knowledge-base-versions", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base_page_versions")
        .select("*")
        .eq("page_id", pageId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for created_by
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.created_by).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, email")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        return data.map(version => ({
          ...version,
          profiles: profileMap.get(version.created_by),
        })) as PageVersion[];
      }

      return data as PageVersion[];
    },
    enabled: open,
  });

  const revertMutation = useMutation({
    mutationFn: async (version: PageVersion) => {
      const { error } = await supabase
        .from("knowledge_base_pages")
        .update({
          title: version.title,
          content: version.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base-page", pageId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-base-versions", pageId] });
      toast.success("Reverted to previous version");
      setShowRevertDialog(false);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to revert to previous version");
    },
  });

  const handleRevert = (version: PageVersion) => {
    setSelectedVersion(version);
    setShowRevertDialog(true);
  };

  const confirmRevert = () => {
    if (selectedVersion) {
      revertMutation.mutate(selectedVersion);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this page.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Version {version.version_number}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.title}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {version.profiles?.name || "Unknown user"} •{" "}
                        {formatDistanceToNow(new Date(version.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevert(version)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Revert
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No version history available
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the page to Version {selectedVersion?.version_number}.
              The current version will be saved in the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevert}>
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
