import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Workflow } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface WorkflowFormData {
  name: string;
  description?: string;
  workflow_type: 'hardware_request' | 'marketing_request' | 'user_account' | 'custom';
  steps: any[];
  is_active: boolean;
  is_default: boolean;
}

export function ApprovalWorkflowManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const { company } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<WorkflowFormData>({
    defaultValues: {
      name: '',
      description: '',
      workflow_type: 'hardware_request',
      steps: [],
      is_active: true,
      is_default: false
    }
  });

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['approval-workflows', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*')
        .eq('company_id', company!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkflowFormData) => {
      const { error } = await supabase
        .from('approval_workflows')
        .insert({
          ...data,
          company_id: company!.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Approval workflow created successfully');
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error('Failed to create workflow: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkflowFormData> }) => {
      const { error } = await supabase
        .from('approval_workflows')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Workflow updated successfully');
      setIsDialogOpen(false);
      setEditingWorkflow(null);
      form.reset();
    },
    onError: (error) => {
      toast.error('Failed to update workflow: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('approval_workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Workflow deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete workflow: ' + error.message);
    }
  });

  const onSubmit = (data: WorkflowFormData) => {
    if (editingWorkflow) {
      updateMutation.mutate({ id: editingWorkflow.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getWorkflowTypeLabel = (type: string) => {
    switch (type) {
      case 'hardware_request':
        return 'Hardware Request';
      case 'marketing_request':
        return 'Marketing Request';
      case 'user_account':
        return 'User Account Request';
      default:
        return 'Custom';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Approval Workflows
            </CardTitle>
            <CardDescription>
              Configure multi-step approval processes for requests
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading workflows...</p>
        ) : workflows && workflows.length > 0 ? (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{workflow.name}</h4>
                    {workflow.is_active && (
                      <Badge variant="default">Active</Badge>
                    )}
                    {workflow.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                    <Badge variant="outline">
                      {getWorkflowTypeLabel(workflow.workflow_type)}
                    </Badge>
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {Array.isArray(workflow.steps) ? workflow.steps.length : 0} approval step(s)
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingWorkflow(workflow);
                      form.reset({
                        name: workflow.name,
                        description: workflow.description || '',
                        workflow_type: workflow.workflow_type as any,
                        steps: (workflow.steps || []) as any,
                        is_active: workflow.is_active,
                        is_default: workflow.is_default
                      });
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteMutation.mutate(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No approval workflows configured yet. Create one to streamline request approvals.
          </p>
        )}

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingWorkflow(null);
            form.reset();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWorkflow ? 'Edit Approval Workflow' : 'Create New Approval Workflow'}
              </DialogTitle>
              <DialogDescription>
                Define the approval steps for different types of requests
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workflow Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Standard Hardware Approval" />
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
                        <Textarea {...field} placeholder="Describe this approval workflow" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workflow_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workflow Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hardware_request">Hardware Request</SelectItem>
                          <SelectItem value="marketing_request">Marketing Request</SelectItem>
                          <SelectItem value="user_account">User Account Request</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the type of request this workflow applies to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Enable this workflow
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

                  <FormField
                    control={form.control}
                    name="is_default"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Default Workflow</FormLabel>
                          <FormDescription>
                            Use this workflow by default for this type
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
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingWorkflow ? 'Update' : 'Create'} Workflow
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
