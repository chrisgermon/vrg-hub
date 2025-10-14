import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Globe } from 'lucide-react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { z } from 'zod';

const domainSchema = z.string()
  .min(3, "Domain must be at least 3 characters")
  .max(255, "Domain must be less than 255 characters")
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/, 
    "Please enter a valid domain (e.g., example.com)");

export function CompanyDomainsManager() {
  const { selectedCompany } = useCompanyContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: domains, isLoading } = useQuery({
    queryKey: ['company-domains', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('company_domains')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('domain');

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      if (!selectedCompany?.id) throw new Error('No company selected');

      // Validate domain
      const validatedDomain = domainSchema.parse(domain.toLowerCase().trim());

      const { data, error } = await supabase
        .from('company_domains')
        .insert({
          company_id: selectedCompany.id,
          domain: validatedDomain,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-domains'] });
      toast({
        title: 'Success',
        description: 'Domain added successfully',
      });
      setNewDomain('');
      setIsAdding(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add domain',
        variant: 'destructive',
      });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase
        .from('company_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-domains'] });
      toast({
        title: 'Success',
        description: 'Domain removed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove domain',
        variant: 'destructive',
      });
    },
  });

  const toggleDomainMutation = useMutation({
    mutationFn: async ({ domainId, active }: { domainId: string; active: boolean }) => {
      const { error } = await supabase
        .from('company_domains')
        .update({ active })
        .eq('id', domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-domains'] });
      toast({
        title: 'Success',
        description: 'Domain status updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update domain',
        variant: 'destructive',
      });
    },
  });

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a domain',
        variant: 'destructive',
      });
      return;
    }

    try {
      addDomainMutation.mutate(newDomain);
    } catch (error: any) {
      toast({
        title: 'Validation Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!selectedCompany) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Email Domains</CardTitle>
          <CardDescription>No company selected</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Company Email Domains
        </CardTitle>
        <CardDescription>
          Manage email domains that can automatically join this company. 
          Users signing up with these domains will be automatically assigned to {selectedCompany.name}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Domain Section */}
        <div className="flex gap-2">
          {isAdding ? (
            <>
              <div className="flex-1 space-y-2">
                <Label htmlFor="domain">Domain (e.g., example.com)</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddDomain();
                    } else if (e.key === 'Escape') {
                      setIsAdding(false);
                      setNewDomain('');
                    }
                  }}
                  disabled={addDomainMutation.isPending}
                  autoFocus
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleAddDomain}
                  disabled={addDomainMutation.isPending}
                >
                  {addDomainMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewDomain('');
                  }}
                  disabled={addDomainMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          )}
        </div>

        {/* Domains List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : domains && domains.length > 0 ? (
          <div className="space-y-2">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={domain.active ? 'success' : 'secondary'}>
                    {domain.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="font-medium">{domain.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleDomainMutation.mutate({
                        domainId: domain.id,
                        active: !domain.active,
                      })
                    }
                    disabled={toggleDomainMutation.isPending}
                  >
                    {domain.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove ${domain.domain}?`)) {
                        deleteDomainMutation.mutate(domain.id);
                      }
                    }}
                    disabled={deleteDomainMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No domains configured yet.</p>
            <p className="text-sm mt-1">Add a domain to enable automatic user assignment.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
