import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plus, Pencil, Trash2, Link as LinkIcon, FolderOpen, FileText, File } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentBrowser } from "./DocumentBrowser";
import { RequestFormBrowser } from "./RequestFormBrowser";
import { CustomPageBrowser } from "./CustomPageBrowser";

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

interface QuickLinksModuleProps {
  title?: string;
  links?: QuickLink[];
  isEditing?: boolean;
  onUpdate?: (links: QuickLink[]) => void;
}

export function QuickLinksModule({ 
  title = "Quick Links", 
  links = [], 
  isEditing = false,
  onUpdate 
}: QuickLinksModuleProps) {
  const [currentLinks, setCurrentLinks] = useState<QuickLink[]>(links);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [formData, setFormData] = useState({ title: "", url: "", icon: "" });
  const [linkType, setLinkType] = useState<"manual" | "document" | "request" | "page">("manual");

  // Sync local state with props when they change
  useEffect(() => {
    setCurrentLinks(links);
  }, [links]);

  const handleAddLink = () => {
    setEditingLink(null);
    setFormData({ title: "", url: "", icon: "" });
    setLinkType("manual");
    setIsDialogOpen(true);
  };

  const handleEditLink = (link: QuickLink) => {
    setEditingLink(link);
    setFormData({ title: link.title, url: link.url, icon: link.icon || "" });
    setLinkType("manual");
    setIsDialogOpen(true);
  };

  const handleSaveLink = () => {
    if (editingLink) {
      const updatedLinks = currentLinks.map(l => 
        l.id === editingLink.id ? { ...l, ...formData } : l
      );
      setCurrentLinks(updatedLinks);
      onUpdate?.(updatedLinks);
    } else {
      const newLink: QuickLink = {
        id: Date.now().toString(),
        ...formData
      };
      const updatedLinks = [...currentLinks, newLink];
      setCurrentLinks(updatedLinks);
      onUpdate?.(updatedLinks);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteLink = (id: string) => {
    const updatedLinks = currentLinks.filter(l => l.id !== id);
    setCurrentLinks(updatedLinks);
    onUpdate?.(updatedLinks);
  };

  const handleDocumentSelect = (url: string, title: string) => {
    setFormData({ ...formData, title, url });
    setLinkType("manual");
  };

  return (
    <>
      <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
          {isEditing && (
            <Button onClick={handleAddLink} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentLinks.map((link) => (
              <div 
                key={link.id} 
                className="flex items-center justify-between p-3 rounded-xl border hover:bg-accent/50 hover:border-accent transition-all duration-200 group"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 flex-1"
                >
                  {link.icon && <span className="text-xl">{link.icon}</span>}
                  <span className="text-sm font-medium">{link.title}</span>
                  <ExternalLink className="h-4 w-4 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
                {isEditing && (
                  <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => handleEditLink(link)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteLink(link.id)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {currentLinks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No links added yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Link" : "Add Link"}</DialogTitle>
            <DialogDescription>Link to external websites, internal documents, request forms, or custom pages</DialogDescription>
          </DialogHeader>
          
          <Tabs value={linkType} onValueChange={(v) => setLinkType(v as "manual" | "document" | "request" | "page")}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="document" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="request" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Forms
              </TabsTrigger>
              <TabsTrigger value="page" className="flex items-center gap-2">
                <File className="h-4 w-4" />
                Pages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Equipment Support"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com or /documents"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📞"
                />
              </div>
            </TabsContent>

            <TabsContent value="document" className="py-4">
              <DocumentBrowser onSelect={handleDocumentSelect} />
            </TabsContent>

            <TabsContent value="request" className="py-4">
              <RequestFormBrowser onSelect={handleDocumentSelect} />
            </TabsContent>

            <TabsContent value="page" className="py-4">
              <CustomPageBrowser onSelect={handleDocumentSelect} />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLink} disabled={!formData.title || !formData.url}>
              {editingLink ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
