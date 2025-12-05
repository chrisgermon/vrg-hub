import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, ExternalLink, Plus, Settings, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ModalityLink {
  id: string;
  name: string;
  url: string;
}

interface ModalityLinksModuleProps {
  isAdmin?: boolean;
}

const DEFAULT_MODALITIES: ModalityLink[] = [
  { id: "1", name: "GENERAL XRAY", url: "" },
  { id: "2", name: "CT", url: "" },
  { id: "3", name: "ULTRASOUND", url: "" },
  { id: "4", name: "MRI", url: "" },
  { id: "5", name: "MAMMO", url: "" },
  { id: "6", name: "EOS", url: "" },
];

export function ModalityLinksModule({ isAdmin = false }: ModalityLinksModuleProps) {
  const [links, setLinks] = useState<ModalityLink[]>(DEFAULT_MODALITIES);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingLinks, setEditingLinks] = useState<ModalityLink[]>([]);
  const [newModalityName, setNewModalityName] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('modality-links');
    if (saved) {
      try {
        setLinks(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved modality links');
      }
    }
  }, []);

  const handleOpenLink = (url: string, name: string) => {
    if (!url) {
      toast.info(`URL not configured for ${name}. Admin can configure this in settings.`);
      return;
    }
    window.open(url, '_blank');
  };

  const handleOpenConfig = () => {
    setEditingLinks([...links]);
    setIsConfigOpen(true);
  };

  const handleUpdateLink = (id: string, url: string) => {
    setEditingLinks(editingLinks.map(l => l.id === id ? { ...l, url } : l));
  };

  const handleAddModality = () => {
    if (!newModalityName.trim()) return;
    setEditingLinks([...editingLinks, {
      id: Date.now().toString(),
      name: newModalityName.toUpperCase(),
      url: ""
    }]);
    setNewModalityName("");
  };

  const handleRemoveModality = (id: string) => {
    setEditingLinks(editingLinks.filter(l => l.id !== id));
  };

  const handleSaveConfig = () => {
    setLinks(editingLinks);
    localStorage.setItem('modality-links', JSON.stringify(editingLinks));
    toast.success("Modality links updated");
    setIsConfigOpen(false);
  };

  return (
    <>
      <Card className="h-full rounded-xl shadow-sm border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            Quick Links
            <span className="text-primary font-bold">MODALITY</span>
          </CardTitle>
          {isAdmin && (
            <Button onClick={handleOpenConfig} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => handleOpenLink(link.url, link.name)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-lg transition-colors group"
              >
                <span className="text-sm font-medium text-foreground">{link.name}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Modality Links</DialogTitle>
            <DialogDescription>
              Set URLs for each modality quick link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
            {editingLinks.map((link) => (
              <div key={link.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-sm font-medium">{link.name}</Label>
                  <Input
                    value={link.url}
                    onChange={(e) => handleUpdateLink(link.id, e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-6 h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveModality(link.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                value={newModalityName}
                onChange={(e) => setNewModalityName(e.target.value)}
                placeholder="New modality name..."
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddModality()}
              />
              <Button size="sm" onClick={handleAddModality} disabled={!newModalityName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
