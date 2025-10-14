import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Image, Video, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface MediaGalleryProps {
  pageId: string;
  canEdit: boolean;
}

export function MediaGallery({ pageId, canEdit }: MediaGalleryProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMedia, setNewMedia] = useState({
    type: "image",
    url: "",
    title: "",
    description: "",
  });

  const { data: media } = useQuery({
    queryKey: ["kb-media", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base_media")
        .select("*")
        .eq("page_id", pageId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const addMediaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("knowledge_base_media").insert({
        page_id: pageId,
        media_type: newMedia.type,
        media_url: newMedia.url,
        title: newMedia.title,
        description: newMedia.description,
        created_by: profile?.user_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-media", pageId] });
      toast.success("Media added successfully");
      setNewMedia({ type: "image", url: "", title: "", description: "" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to add media");
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await supabase
        .from("knowledge_base_media")
        .delete()
        .eq("id", mediaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-media", pageId] });
      toast.success("Media deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete media");
    },
  });

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "diagram":
      case "image":
        return <Image className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Media & Attachments</h3>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Media
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Media</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newMedia.type}
                    onValueChange={(value) =>
                      setNewMedia({ ...newMedia, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="diagram">Diagram</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>URL</Label>
                  <Input
                    value={newMedia.url}
                    onChange={(e) =>
                      setNewMedia({ ...newMedia, url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={newMedia.title}
                    onChange={(e) =>
                      setNewMedia({ ...newMedia, title: e.target.value })
                    }
                    placeholder="Media title"
                  />
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Input
                    value={newMedia.description}
                    onChange={(e) =>
                      setNewMedia({ ...newMedia, description: e.target.value })
                    }
                    placeholder="Brief description"
                  />
                </div>

                <Button
                  onClick={() => addMediaMutation.mutate()}
                  disabled={!newMedia.url || addMediaMutation.isPending}
                  className="w-full"
                >
                  Add Media
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {media?.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getMediaIcon(item.media_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  )}
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    View Media
                  </a>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMediaMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!media || media.length === 0) && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">
            No media attached yet
          </p>
        )}
      </div>
    </div>
  );
}