import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link as LinkIcon, Settings, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CommonLink {
  id: string;
  name: string;
  url: string;
}

interface CommonLinksModuleProps {
  isAdmin?: boolean;
}

const DEFAULT_LINKS: CommonLink[] = [
  { id: "1", name: "Excel templates", url: "" },
  { id: "2", name: "Common documents", url: "" },
];

export function CommonLinksModule({ isAdmin = false }: CommonLinksModuleProps) {
  const [links, setLinks] = useState<CommonLink[]>(DEFAULT_LINKS);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingLinks, setEditingLinks] = useState<CommonLink[]>([]);
  const [newLinkName, setNewLinkName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('common-links');
    if (saved) {
      try {
        setLinks(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved common links');
      }
    }
  }, []);

  const handleOpenLink = (url: string, name: string) => {
    if (!url) {
      toast.info(`URL not configured for ${name}`);
      return;
    }
    window.open(url, '_blank');
  };

  const handleOpenConfig = () => {
    setEditingLinks([...links]);
    setIsConfigOpen(true);
  };

  const handleUpdateLink = (id: string, field: 'name' | 'url', value: string) => {
    setEditingLinks(editingLinks.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleAddLink = () => {
    if (!newLinkName.trim()) return;
    setEditingLinks([...editingLinks, {
      id: Date.now().toString(),
      name: newLinkName,
      url: ""
    }]);
    setNewLinkName("");
  };

  const handleRemoveLink = (id: string) => {
    setEditingLinks(editingLinks.filter(l => l.id !== id));
  };

  const handleSaveConfig = () => {
    setLinks(editingLinks);
    localStorage.setItem('common-links', JSON.stringify(editingLinks));
    toast.success("Common links updated");
    setIsConfigOpen(false);
  };

  return (
    <>
      <Card className="h-full rounded-xl shadow-sm border border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Common Links
          </CardTitle>
          {isAdmin && (
            <Button onClick={handleOpenConfig} size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => handleOpenLink(link.url, link.name)}
                className="w-full text-left px-2 py-1.5 text-xs text-primary hover:bg-primary/5 rounded transition-colors flex items-center justify-between group"
              >
                <span>{link.name}</span>
                {link.url && (
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Common Links</DialogTitle>
            <DialogDescription>Add links to frequently used documents and sheets</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
            {editingLinks.map((link) => (
              <div key={link.id} className="flex items-start gap-2 p-2 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    value={link.name}
                    onChange={(e) => handleUpdateLink(link.id, 'name', e.target.value)}
                    placeholder="Link name"
                    className="text-sm"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => handleUpdateLink(link.id, 'url', e.target.value)}
                    placeholder="URL"
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => handleRemoveLink(link.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                placeholder="New link name..."
                className="text-sm"
              />
              <Button size="sm" onClick={handleAddLink} disabled={!newLinkName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
