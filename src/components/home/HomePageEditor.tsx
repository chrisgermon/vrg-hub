import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WidgetPalette } from "./editor/WidgetPalette";
import { WidgetGrid } from "./editor/WidgetGrid";
import { Save, Eye, X } from "lucide-react";
import type { Widget } from "./editor/types";

interface HomePageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLayout: Widget[];
  companyId: string | null | undefined;
}

export function HomePageEditor({ open, onOpenChange, initialLayout, companyId }: HomePageEditorProps) {
  const queryClient = useQueryClient();
  const [widgets, setWidgets] = useState<Widget[]>(initialLayout);
  const [previewMode, setPreviewMode] = useState(false);

  // Reset widgets when initialLayout changes (e.g., company switch)
  useEffect(() => {
    setWidgets(initialLayout);
  }, [initialLayout]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (layout: Widget[]) => {
      if (!companyId) throw new Error("No company ID");

      const layoutConfig = {
        widgets: layout.map(w => ({
          id: w.id,
          type: w.type,
          position: w.position,
          size: w.size,
          config: w.config,
        })),
      };

      const { error } = await supabase
        .from("company_home_pages")
        .upsert({ 
          company_id: companyId,
          layout_config: layoutConfig 
        }, {
          onConflict: 'company_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-home-page", companyId] });
      toast.success("Home page layout saved successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving layout:", error);
      toast.error("Failed to save home page layout");
    },
  });

  const handleAddWidget = (type: Widget["type"]) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      position: { x: 0, y: widgets.length },
      size: { width: type === "welcome" ? 12 : type === "news-feed" || type === "recent-activity" ? 8 : 4, height: 2 },
      config: {},
    };
    setWidgets([...widgets, newWidget]);
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const handleUpdateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  };

  const handleReorderWidgets = (reorderedWidgets: Widget[]) => {
    setWidgets(reorderedWidgets);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Home Page Editor</DialogTitle>
              <DialogDescription>
                Drag and drop components to customize your home page layout
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? <X className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {previewMode ? "Edit" : "Preview"}
              </Button>
              <Button
                size="sm"
                onClick={() => saveLayoutMutation.mutate(widgets)}
                disabled={saveLayoutMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Layout
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {!previewMode && (
            <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
              <WidgetPalette onAddWidget={handleAddWidget} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 bg-background">
            <WidgetGrid
              widgets={widgets}
              onRemoveWidget={handleRemoveWidget}
              onUpdateWidget={handleUpdateWidget}
              onReorderWidgets={handleReorderWidgets}
              previewMode={previewMode}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
