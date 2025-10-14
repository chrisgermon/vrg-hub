import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useCompanyContext } from '@/contexts/CompanyContext';

interface Application {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  companies?: { id: string; name: string; }[];
}

interface Company {
  id: string;
  name: string;
}

export const ApplicationsManager = () => {
  const { selectedCompany } = useCompanyContext();
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCrowdIT, setIsCrowdIT] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    selectedCompanies: [] as string[]
  });

  useEffect(() => {
    loadApplications();
    loadCompanies();
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if super admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isSA = roles?.some(r => r.role === 'super_admin') || false;
      setIsSuperAdmin(isSA);

      // Check if viewing Crowd IT
      const isCIT = selectedCompany?.name === "Crowd IT";
      setIsCrowdIT(isCIT);

      // Load companies based on role and selected company
      let query = supabase.from('companies').select('id, name').order('name');
      
      // If not super admin or not viewing Crowd IT, filter to selected company
      if (!isSA || !isCIT) {
        const companyId = selectedCompany?.id;
        if (companyId) {
          query = query.eq('id', companyId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
    }
  };

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Load applications with their assigned companies
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .order('name');

      if (appsError) throw appsError;

      // Load company assignments for each application
      if (apps && apps.length > 0) {
        const appIds = apps.map(app => app.id);
        const { data: assignments } = await supabase
          .from('company_applications')
          .select('application_id, company_id, companies(id, name)')
          .in('application_id', appIds);

        // Map companies to applications
        const appsWithCompanies = apps.map(app => ({
          ...app,
          companies: assignments
            ?.filter(a => a.application_id === app.id)
            .map(a => ({ 
              id: a.companies.id, 
              name: a.companies.name 
            })) || []
        }));

        // Filter applications based on selected company
        const companyId = selectedCompany?.id || profile.company_id;
        const isCIT = selectedCompany?.name === "Crowd IT";
        
        // If viewing Crowd IT as super admin, show all apps
        // Otherwise, only show apps assigned to the selected company
        const filteredApps = isCIT && isSuperAdmin 
          ? appsWithCompanies
          : appsWithCompanies.filter(app => 
              app.companies?.some(c => c.id === companyId)
            );

        setApplications(filteredApps);
      }
    } catch (error: any) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.selectedCompanies.length === 0) {
      toast.error('Please select at least one company');
      return;
    }

    setIsSubmitting(true);

    try {
      let appId: string;

      if (editingApp) {
        // Update application
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            name: formData.name,
            description: formData.description || null,
            active: formData.active
          })
          .eq('id', editingApp.id);

        if (updateError) throw updateError;
        appId = editingApp.id;

        // Delete existing company assignments
        const { error: deleteError } = await supabase
          .from('company_applications')
          .delete()
          .eq('application_id', editingApp.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new application
        const { data: newApp, error: insertError } = await supabase
          .from('applications')
          .insert([{
            name: formData.name,
            description: formData.description || null,
            active: formData.active
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        appId = newApp.id;
      }

      // Insert company assignments
      const assignments = formData.selectedCompanies.map(companyId => ({
        application_id: appId,
        company_id: companyId
      }));

      const { error: assignError } = await supabase
        .from('company_applications')
        .insert(assignments);

      if (assignError) throw assignError;

      toast.success(editingApp ? 'Application updated successfully' : 'Application added successfully');
      setIsDialogOpen(false);
      resetForm();
      loadApplications();
    } catch (error: any) {
      console.error('Error saving application:', error);
      toast.error(error.message || 'Failed to save application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    setFormData({
      name: app.name,
      description: app.description || '',
      active: app.active,
      selectedCompanies: app.companies?.map(c => c.id) || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Application deleted successfully');
      loadApplications();
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast.error(error.message || 'Failed to delete application');
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      active: true, 
      // Default to selected company
      selectedCompanies: selectedCompany?.id ? [selectedCompany.id] : []
    });
    setEditingApp(null);
  };

  const toggleCompany = (companyId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCompanies: prev.selectedCompanies.includes(companyId)
        ? prev.selectedCompanies.filter(id => id !== companyId)
        : [...prev.selectedCompanies, companyId]
    }));
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              Manage applications available for user account requests
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadApplications}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingApp ? 'Edit Application' : 'Add Application'}
                </DialogTitle>
                <DialogDescription>
                  {editingApp
                    ? 'Update the application details'
                    : 'Add a new application for user account requests'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Application Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Microsoft Teams, Slack"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the application"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Companies *</Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {companies.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No companies available</p>
                    ) : (
                      companies.map((company) => (
                        <div key={company.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`company-${company.id}`}
                            checked={formData.selectedCompanies.includes(company.id)}
                            onCheckedChange={() => toggleCompany(company.id)}
                          />
                          <Label
                            htmlFor={`company-${company.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {company.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingApp ? 'Update' : 'Add'} Application
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No applications configured yet. Add your first application to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {app.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {app.companies && app.companies.length > 0 ? (
                        // Filter to only show the selected company if not viewing as Crowd IT
                        (isCrowdIT && isSuperAdmin 
                          ? app.companies 
                          : app.companies.filter(c => c.id === selectedCompany?.id)
                        ).map((company) => (
                          <Badge key={company.id} variant="secondary" className="text-xs">
                            {company.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        app.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {app.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(app)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(app.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
