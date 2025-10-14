import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Company {
  id: string;
  name: string;
}

interface PrintBrand {
  id: string;
  name: string;
  form_url: string;
  company_id: string;
  is_active: boolean;
  companies?: { name: string };
}

export function PrintBrandsManager() {
  const [brands, setBrands] = useState<PrintBrand[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<PrintBrand | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    form_url: "",
    company_id: "",
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [brandsResult, companiesResult] = await Promise.all([
        supabase
          .from('print_order_brands')
          .select('*, companies(name)')
          .order('name'),
        supabase
          .from('companies')
          .select('id, name')
          .eq('active', true)
          .order('name'),
      ]);

      if (brandsResult.error) throw brandsResult.error;
      if (companiesResult.error) throw companiesResult.error;

      setBrands(brandsResult.data || []);
      setCompanies(companiesResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load print order brands');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (brand?: PrintBrand) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        name: brand.name,
        form_url: brand.form_url,
        company_id: brand.company_id,
        is_active: brand.is_active,
      });
    } else {
      setEditingBrand(null);
      setFormData({
        name: "",
        form_url: "",
        company_id: "",
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.form_url || !formData.company_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('print_order_brands')
          .update(formData)
          .eq('id', editingBrand.id);

        if (error) throw error;
        toast.success('Brand updated successfully');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in');
          return;
        }

        const { error } = await supabase
          .from('print_order_brands')
          .insert([{ ...formData, created_by: user.id }]);

        if (error) throw error;
        toast.success('Brand created successfully');
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving brand:', error);
      toast.error(error.message || 'Failed to save brand');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;

    try {
      const { error } = await supabase
        .from('print_order_brands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Brand deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      toast.error(error.message || 'Failed to delete brand');
    }
  };

  const handleToggleActive = async (brand: PrintBrand) => {
    try {
      const { error } = await supabase
        .from('print_order_brands')
        .update({ is_active: !brand.is_active })
        .eq('id', brand.id);

      if (error) throw error;
      toast.success(`Brand ${!brand.is_active ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (error: any) {
      console.error('Error toggling brand status:', error);
      toast.error(error.message || 'Failed to update brand status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Print Order Brands</CardTitle>
              <CardDescription>
                Manage print ordering form brands for your companies
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Form URL</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No brands configured yet
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>{brand.companies?.name}</TableCell>
                    <TableCell className="max-w-md truncate">{brand.form_url}</TableCell>
                    <TableCell>
                      <Switch
                        checked={brand.is_active}
                        onCheckedChange={() => handleToggleActive(brand)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(brand)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(brand.id)}
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
            <DialogDescription>
              Configure a print order brand for a company
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Vision Radiology"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => setFormData({ ...formData, company_id: value })}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-url">Form URL</Label>
              <Input
                id="form-url"
                value={formData.form_url}
                onChange={(e) => setFormData({ ...formData, form_url: e.target.value })}
                placeholder="https://forms.example.com/..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingBrand ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
