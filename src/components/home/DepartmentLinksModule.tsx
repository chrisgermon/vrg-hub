import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Settings, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DepartmentLink {
  id: string;
  name: string;
  sharepoint_path: string;
  sort_order: number;
}

interface DepartmentLinksModuleProps {
  isAdmin?: boolean;
}

const DEFAULT_DEPARTMENTS = [
  { name: "RECEPTION", sharepoint_path: "" },
  { name: "MEDICAL", sharepoint_path: "" },
  { name: "MARKETING", sharepoint_path: "" },
  { name: "HUMAN RESOURCES", sharepoint_path: "" },
  { name: "FINANCE DEPT/PAYROLL", sharepoint_path: "" },
];

export function DepartmentLinksModule({ isAdmin = false }: DepartmentLinksModuleProps) {
  const queryClient = useQueryClient();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingLinks, setEditingLinks] = useState<{ name: string; sharepoint_path: string }[]>([]);

  // Fetch department links from app_config or use defaults
  const { data: departmentLinks = [] } = useQuery({
    queryKey: ['department-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .single();

      if (error || !data) {
        return DEFAULT_DEPARTMENTS.map((dept, idx) => ({
          id: `default-${idx}`,
          ...dept,
          sort_order: idx
        }));
      }

      // Parse department_links from JSON if stored in app_config
      // For now, using defaults as the column may not exist yet
      return DEFAULT_DEPARTMENTS.map((dept, idx) => ({
        id: `default-${idx}`,
        ...dept,
        sort_order: idx
      }));
    }
  });

  const handleOpenSharePoint = (path: string, name: string) => {
    if (!path) {
      toast.info(`SharePoint path not configured for ${name}. Admin can configure this in settings.`);
      return;
    }
    window.open(path, '_blank');
  };

  const handleOpenConfig = () => {
    setEditingLinks(departmentLinks.map(d => ({ name: d.name, sharepoint_path: d.sharepoint_path })));
    setIsConfigOpen(true);
  };

  const handleUpdateLink = (index: number, path: string) => {
    const updated = [...editingLinks];
    updated[index].sharepoint_path = path;
    setEditingLinks(updated);
  };

  const handleSaveConfig = async () => {
    // Save to localStorage for now (can be moved to DB later)
    localStorage.setItem('department-links', JSON.stringify(editingLinks));
    queryClient.invalidateQueries({ queryKey: ['department-links'] });
    toast.success("Department links updated");
    setIsConfigOpen(false);
  };

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('department-links');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults
        DEFAULT_DEPARTMENTS.forEach((dept, idx) => {
          const savedDept = parsed.find((p: any) => p.name === dept.name);
          if (savedDept) {
            departmentLinks[idx] = { ...departmentLinks[idx], sharepoint_path: savedDept.sharepoint_path };
          }
        });
      } catch (e) {
        console.error('Failed to parse saved department links');
      }
    }
  }, []);

  // Re-fetch with localStorage data
  const displayLinks = departmentLinks.map(link => {
    const saved = localStorage.getItem('department-links');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedDept = parsed.find((p: any) => p.name === link.name);
        if (savedDept) {
          return { ...link, sharepoint_path: savedDept.sharepoint_path };
        }
      } catch (e) {}
    }
    return link;
  });

  return (
    <>
      <Card className="h-full border-2 border-primary/20 rounded-xl shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-primary sr-only">Departments</CardTitle>
          {isAdmin && (
            <Button onClick={handleOpenConfig} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {displayLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleOpenSharePoint(link.sharepoint_path, link.name)}
                className="w-full text-left px-3 py-2.5 text-primary font-semibold text-sm hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span>{link.name}</span>
                {link.sharepoint_path && (
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Department Links</DialogTitle>
            <DialogDescription>
              Enter the SharePoint folder URLs for each department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {editingLinks.map((link, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-sm font-medium">{link.name}</Label>
                <Input
                  value={link.sharepoint_path}
                  onChange={(e) => handleUpdateLink(index, e.target.value)}
                  placeholder="https://company.sharepoint.com/sites/..."
                  className="text-sm"
                />
              </div>
            ))}
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
