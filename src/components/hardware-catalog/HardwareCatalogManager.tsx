import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Package, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

const catalogItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  model_number: z.string().optional(),
  vendor: z.string().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  currency: z.string().default("AUD"),
  category: z.string().optional(),
  is_active: z.boolean().default(true),
  company_ids: z.array(z.string()).min(1, "Select at least one company"),
});

type CatalogItemFormValues = z.infer<typeof catalogItemSchema>;

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  model_number?: string;
  vendor?: string;
  unit_price?: number;
  currency: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  catalog_item_companies?: Array<{ company_id: string; companies: { name: string } }>;
}

export function HardwareCatalogManager() {
  const { selectedCompany } = useCompanyContext();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  const form = useForm<CatalogItemFormValues>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: {
      name: "",
      description: "",
      model_number: "",
      vendor: "",
      currency: "AUD",
      category: "",
      is_active: true,
      company_ids: [],
    },
  });

  useEffect(() => {
    fetchData();
  }, [selectedCompany]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's company and role
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = roleData?.role;
      setUserRole(role);

      if (profile?.company_id) {
        setCompanyId(profile.company_id);

        // Fetch all companies
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name")
          .eq("active", true)
          .order("name");
        
        setCompanies(companiesData || []);

        // Fetch catalog items with company relationships
        let query = supabase
          .from("hardware_catalog")
          .select(`
            *,
            catalog_item_companies(
              company_id,
              companies(name)
            )
          `)
          .order("created_at", { ascending: false });

        // Filter by selected company or user's company
        const targetCompanyId = selectedCompany?.id || profile.company_id;
        const isCrowdIT = selectedCompany?.name === "Crowd IT";
        
        // If not viewing Crowd IT as super admin, filter by company
        if (!(role === 'super_admin' && isCrowdIT)) {
          const { data: itemCompanies } = await supabase
            .from("catalog_item_companies")
            .select("catalog_item_id")
            .eq("company_id", targetCompanyId);

          const itemIds = itemCompanies?.map(ic => ic.catalog_item_id) || [];
          query = query.in("id", itemIds.length > 0 ? itemIds : ['00000000-0000-0000-0000-000000000000']);
        }

        const { data: catalogData, error } = await query;

        if (error) throw error;
        setItems(catalogData || []);
      }
    } catch (error: any) {
      console.error("Error fetching catalog:", error);
      toast.error("Failed to load catalog items");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: CatalogItemFormValues) => {
    if (!values.company_ids || values.company_ids.length === 0) {
      toast.error("Select at least one company");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingItem) {
        // Update existing item
        const { error: updateError } = await supabase
          .from("hardware_catalog")
          .update({
            name: values.name,
            description: values.description,
            model_number: values.model_number,
            vendor: values.vendor,
            unit_price: values.unit_price,
            currency: values.currency,
            category: values.category,
            is_active: values.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingItem.id);

        if (updateError) throw updateError;

        // Delete existing company relationships
        await supabase
          .from("catalog_item_companies")
          .delete()
          .eq("catalog_item_id", editingItem.id);

        // Insert new company relationships
        const companyRelations = values.company_ids.map(companyId => ({
          catalog_item_id: editingItem.id,
          company_id: companyId,
        }));

        const { error: relError } = await supabase
          .from("catalog_item_companies")
          .insert(companyRelations);

        if (relError) throw relError;

        toast.success("Catalog item updated");
      } else {
        // Create new item
        const { data: newItem, error: insertError } = await supabase
          .from("hardware_catalog")
          .insert([{
            name: values.name,
            description: values.description,
            model_number: values.model_number,
            vendor: values.vendor,
            unit_price: values.unit_price,
            currency: values.currency,
            category: values.category,
            is_active: values.is_active,
            created_by: user.id,
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert company relationships
        const companyRelations = values.company_ids.map(companyId => ({
          catalog_item_id: newItem.id,
          company_id: companyId,
        }));

        const { error: relError } = await supabase
          .from("catalog_item_companies")
          .insert(companyRelations);

        if (relError) throw relError;

        toast.success("Catalog item created");
      }

      form.reset();
      setDialogOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      console.error("Error saving catalog item:", error);
      toast.error(error.message || "Failed to save catalog item");
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    const companyIds = item.catalog_item_companies?.map(cic => cic.company_id) || [];
    form.reset({
      name: item.name,
      description: item.description || "",
      model_number: item.model_number || "",
      vendor: item.vendor || "",
      unit_price: item.unit_price,
      currency: item.currency,
      category: item.category || "",
      is_active: item.is_active,
      company_ids: companyIds,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this catalog item?")) return;

    try {
      const { error } = await supabase
        .from("hardware_catalog")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Catalog item deleted");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting catalog item:", error);
      toast.error("Failed to delete catalog item");
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingItem(null);
      form.reset();
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading catalog...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Hardware Catalog
            </CardTitle>
            <CardDescription>
              Manage pre-configured hardware items for quick selection
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Catalog Item" : "Add Catalog Item"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem 
                    ? "Update the catalog item details below"
                    : "Add a new hardware item to your catalog for quick selection"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Company checkboxes */}
                  <FormField
                    control={form.control}
                    name="company_ids"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Companies *</FormLabel>
                          <FormDescription>
                            Select which companies can use this catalog item
                          </FormDescription>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                          {companies.map((company) => (
                            <FormField
                              key={company.id}
                              control={form.control}
                              name="company_ids"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={company.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 mt-0.5"
                                        checked={field.value?.includes(company.id)}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const updatedValue = checked
                                            ? [...(field.value || []), company.id]
                                            : (field.value || []).filter((value) => value !== company.id);
                                          field.onChange(updatedValue);
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {company.name}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Dell Latitude 7490" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="14-inch business laptop with Intel Core i7..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="model_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model Number</FormLabel>
                          <FormControl>
                            <Input placeholder="LAT7490-I7-16GB" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <FormControl>
                            <Input placeholder="Dell" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="1299.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AUD">AUD</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Laptops, Monitors, Accessories..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Optional category for organizing items
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Active items can be selected when creating requests
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => handleDialogClose(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? "Update Item" : "Add Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No catalog items found. Add your first item to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Available For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const companyNames = item.catalog_item_companies
                    ?.map((cic: any) => cic.companies.name)
                    .join(", ") || "-";
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.model_number || "-"}</TableCell>
                      <TableCell>{item.vendor || "-"}</TableCell>
                      <TableCell>
                        {item.unit_price 
                          ? `${item.currency} ${item.unit_price.toFixed(2)}` 
                          : "-"}
                      </TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate" title={companyNames}>
                        {companyNames}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
