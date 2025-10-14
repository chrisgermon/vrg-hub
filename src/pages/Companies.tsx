import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatAUDate } from '@/lib/dateUtils';
import { redirectToSubdomain } from '@/lib/subdomain';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, RefreshCw, LogIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  slug: z.string().min(1, 'Company slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  subdomain: z.string().optional(),
  billingContactEmail: z.string().email('Valid email required').optional(),
  domain: z.string().min(1, 'Company domain is required'),
  approvalEmails: z.string().optional()
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function Companies() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      slug: '',
      subdomain: '',
      billingContactEmail: '',
      domain: '',
      approvalEmails: ''
    }
  });


  // Fetch companies
  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_domains(domain, active)
        `);
      
      if (error) throw error;
      return data;
    }
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const approvalEmailsArray = data.approvalEmails 
        ? data.approvalEmails.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : [];

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: data.name,
          slug: data.slug,
          subdomain: data.subdomain || null,
          billing_contact_email: data.billingContactEmail || null,
          approval_emails: approvalEmailsArray.length > 0 ? approvalEmailsArray : null
        })
        .select()
        .single();

      if (companyError) throw companyError;

      const { error: domainError } = await supabase
        .from('company_domains')
        .insert({
          company_id: company.id,
          domain: data.domain,
          active: true
        });

      if (domainError) throw domainError;
      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Company created successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });


  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error: domainsError } = await supabase
        .from('company_domains')
        .delete()
        .eq('company_id', companyId);

      if (domainsError) throw domainsError;

      const { error: companyError } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (companyError) throw companyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      toast({
        title: 'Success',
        description: 'Company deleted successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const onSubmit = (data: CompanyFormData) => {
    createCompanyMutation.mutate(data);
  };

  const handleEditCompany = (companyId: string) => {
    navigate(`/admin/companies/${companyId}`);
  };

  const handleRowDoubleClick = (companyId: string) => {
    navigate(`/admin/companies/${companyId}`);
  };

  const handleLoginToCompany = (companyId: string, subdomain: string | null) => {
    // Redirect to company's subdomain for proper subdomain-scoped behavior
    if (subdomain) {
      redirectToSubdomain(subdomain, '/?impersonate=' + companyId);
    } else {
      // Fallback to slug-based if no subdomain configured
      const url = `${window.location.origin}/?impersonate=${companyId}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground">Manage company configurations - Click edit or double-click to view all settings</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-companies'] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="premium" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>
                  Add a new business to the system with domain configuration
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="acme-corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Domain</FormLabel>
                        <FormControl>
                          <Input placeholder="acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="billingContactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Contact (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="billing@acme.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="approvalEmails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approval Emails</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="admin@company.com, manager@company.com"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of emails that can approve hardware requests
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="premium"
                      disabled={createCompanyMutation.isPending}
                      className="flex-1"
                    >
                      {createCompanyMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Companies Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Billing Contact</TableHead>
              <TableHead>Approval Emails</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies?.map((company) => (
              <TableRow 
                key={company.id}
                className="cursor-pointer hover:bg-muted/50"
                onDoubleClick={() => handleRowDoubleClick(company.id)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-muted-foreground">{company.slug}</div>
                    {company.subdomain && (
                      <div className="text-xs text-muted-foreground">{company.subdomain}</div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {company.company_domains && company.company_domains.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {company.company_domains.map((domain: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {domain.domain}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No domain</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {company.billing_contact_email ? (
                    <span className="text-sm">{company.billing_contact_email}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not set</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {company.approval_emails && company.approval_emails.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {company.approval_emails.slice(0, 2).map((email: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {email}
                        </Badge>
                      ))
                      }
                      {company.approval_emails.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{company.approval_emails.length - 2} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No emails</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <Badge variant={company.active ? 'success' : 'secondary'}>
                    {company.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatAUDate(company.created_at)}
                  </span>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoginToCompany(company.id, company.subdomain);
                      }}
                      className="h-8 gap-1.5 px-3"
                      title="Login as Tenant Admin"
                    >
                      <LogIn className="h-4 w-4" />
                      <span className="text-xs">Login to</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCompany(company.id);
                      }}
                      className="h-8 w-8 p-0"
                      title="Edit Company"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Company</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{company.name}"? This action cannot be undone and will remove all associated domains and data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCompanyMutation.mutate(company.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Company
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
