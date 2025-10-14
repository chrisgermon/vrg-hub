import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyContext } from "@/contexts/CompanyContext";

interface SystemStatus {
  id: string;
  system_name: string;
  status: 'operational' | 'degraded' | 'outage';
  message: string | null;
  is_active: boolean;
  sort_order: number;
  company_id: string | null;
  icon: string | null;
  is_critical: boolean;
  companies?: {
    name: string;
  };
}

interface SystemStatusFormData {
  system_name: string;
  status: 'operational' | 'degraded' | 'outage';
  message: string;
  is_active: boolean;
  sort_order: number;
  icon: string;
  is_critical: boolean;
}

export function SystemStatusManager() {
  const { profile, userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemStatus | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [formData, setFormData] = useState<SystemStatusFormData>({
    system_name: "",
    status: "operational",
    message: "",
    is_active: true,
    sort_order: 0,
    icon: "",
    is_critical: false,
  });

  const isSuperAdmin = userRole === 'super_admin';
  const isCrowdIT = selectedCompany?.name === "Crowd IT";

  // Fetch companies - all for Crowd IT super admins, or just selected company for others
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-for-status', selectedCompany?.id, isSuperAdmin, isCrowdIT],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      // If not super admin viewing Crowd IT, filter to selected company
      if (!isSuperAdmin || !isCrowdIT) {
        const companyId = selectedCompany?.id;
        if (companyId) {
          query = query.eq('id', companyId);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });

  const { data: systems = [] } = useQuery({
    queryKey: ['system-statuses-all', selectedCompany?.id, isSuperAdmin, isCrowdIT],
    queryFn: async () => {
      let query = supabase
        .from('system_statuses')
        .select('*, companies(name)')
        .order('sort_order');
      
      // Filter by selected company unless viewing Crowd IT as super admin
      if (!isSuperAdmin || !isCrowdIT) {
        const companyId = selectedCompany?.id;
        if (companyId) {
          query = query.eq('company_id', companyId);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as SystemStatus[];
    },
    enabled: !!selectedCompany?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: SystemStatusFormData & { company_id: string }) => {
      const { error } = await supabase
        .from('system_statuses')
        .insert({
          ...data,
          created_by: profile?.user_id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['system-statuses-all'] });
      toast.success("System status created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create system status");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SystemStatusFormData> }) => {
      const { error } = await supabase
        .from('system_statuses')
        .update({
          ...data,
          updated_by: profile?.user_id,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['system-statuses-all'] });
      toast.success("System status updated");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update system status");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_statuses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['system-statuses-all'] });
      toast.success("System status deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete system status");
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData({
      system_name: "",
      status: "operational",
      message: "",
      is_active: true,
      sort_order: 0,
      icon: "",
      is_critical: false,
    });
    setIconFile(null);
    setIconPreview("");
    setSelectedCompanyId(selectedCompany?.id || "");
    setEditingSystem(null);
  };

  const handleEdit = (system: SystemStatus) => {
    setEditingSystem(system);
    setSelectedCompanyId(system.company_id || "");
    setFormData({
      system_name: system.system_name,
      status: system.status,
      message: system.message || "",
      is_active: system.is_active,
      sort_order: system.sort_order,
      icon: system.icon || "",
      is_critical: system.is_critical || false,
    });
    setIconPreview(system.icon || "");
    setIconFile(null);
    setIsDialogOpen(true);
  };

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file (PNG or SVG)");
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error("Image must be smaller than 1MB");
      return;
    }

    setIconFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadIcon = async (): Promise<string | null> => {
    if (!iconFile) return formData.icon || null;

    setUploadingIcon(true);
    try {
      const fileExt = iconFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `system-icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, iconFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error("Failed to upload icon");
      return null;
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetCompanyId = isSuperAdmin ? selectedCompanyId : selectedCompany?.id;
    
    if (!targetCompanyId) {
      toast.error("Please select a company");
      return;
    }

    const iconUrl = await uploadIcon();
    
    const dataToSubmit = {
      ...formData,
      icon: iconUrl || formData.icon,
    };
    
    if (editingSystem) {
      updateMutation.mutate({ id: editingSystem.id, data: dataToSubmit });
    } else {
      createMutation.mutate({ ...dataToSubmit, company_id: targetCompanyId });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'outage':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">System Status Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage system health indicators and status messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['system-statuses-all'] });
          }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add System
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {(isSuperAdmin && isCrowdIT) && <TableHead>Company</TableHead>}
              <TableHead>Icon</TableHead>
              <TableHead>System Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Critical</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {systems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(isSuperAdmin && isCrowdIT) ? 9 : 8} className="text-center text-muted-foreground">
                  No systems configured
                </TableCell>
              </TableRow>
            ) : (
              systems.map((system: any) => (
                <TableRow key={system.id}>
                  {(isSuperAdmin && isCrowdIT) && (
                    <TableCell className="font-medium">
                      {system.companies?.name || 'N/A'}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    {system.icon ? (
                      <img 
                        src={system.icon} 
                        alt={system.system_name}
                        className="w-6 h-6 object-contain mx-auto"
                      />
                    ) : "-"}
                  </TableCell>
                  <TableCell className="font-medium">{system.system_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {getStatusIcon(system.status)}
                      <span className="capitalize">{system.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={system.is_critical ? "default" : "outline"}>
                      {system.is_critical ? "Top Bar" : "Dropdown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {system.message || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={system.is_active ? "default" : "secondary"}>
                      {system.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{system.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(system)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSystem ? "Edit System Status" : "Add System Status"}
            </DialogTitle>
            <DialogDescription>
              Configure system health status and alert messages
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(isSuperAdmin && isCrowdIT) && (
              <div className="space-y-2">
                <Label htmlFor="company_id">Company *</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                  disabled={!!editingSystem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="system_name">System Name</Label>
              <Input
                id="system_name"
                value={formData.system_name}
                onChange={(e) => setFormData({ ...formData, system_name: e.target.value })}
                placeholder="e.g., Email Service, Database, API"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'operational' | 'degraded' | 'outage') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Operational
                    </div>
                  </SelectItem>
                  <SelectItem value="degraded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Degraded
                    </div>
                  </SelectItem>
                  <SelectItem value="outage">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Outage
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Status Message (Optional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Additional information about the status"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">System Icon</Label>
              <div className="space-y-3">
                {iconPreview && (
                  <div className="relative inline-block">
                    <img 
                      src={iconPreview} 
                      alt="Icon preview" 
                      className="w-24 h-24 object-contain border rounded-lg p-2 bg-muted"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={() => {
                        setIconFile(null);
                        setIconPreview("");
                        setFormData({ ...formData, icon: "" });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    id="icon"
                    type="file"
                    accept="image/png,image/svg+xml"
                    onChange={handleIconFileChange}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => document.getElementById('icon')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a PNG or SVG icon (max 300x300px, under 1MB). The icon will be scaled responsively.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Display Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">Active</Label>
                <Select
                  value={formData.is_active ? "true" : "false"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value === "true" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_critical" className="flex items-center gap-2">
                Critical System
                <span className="text-xs text-muted-foreground font-normal">
                  (Display in top bar)
                </span>
              </Label>
              <Select
                value={formData.is_critical ? "true" : "false"}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_critical: value === "true" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Show in top bar</SelectItem>
                  <SelectItem value="false">No - Show in dropdown only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingIcon || createMutation.isPending || updateMutation.isPending}>
                {uploadingIcon ? "Uploading..." : editingSystem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
