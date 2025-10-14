import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category?: string;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  'General',
  'Hardware',
  'Marketing',
  'IT Support',
  'HR',
  'Finance',
  'Other',
];

export function CannedResponsesManager() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('*')
        .order('category')
        .order('sort_order');

      if (error) throw error;
      return data || [];
    },
  });

  const saveResponse = useMutation({
    mutationFn: async (formData: FormData) => {
      const responseData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        category: formData.get('category') as string,
        sort_order: parseInt(formData.get('sort_order') as string) || 0,
        is_active: formData.get('is_active') === 'on',
        created_by: user?.id,
      };

      if (editing) {
        const { error } = await supabase
          .from('canned_responses')
          .update(responseData)
          .eq('id', editing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('canned_responses')
          .insert(responseData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      toast.success(`Canned response ${editing ? 'updated' : 'created'}`);
      setOpen(false);
      setEditing(null);
    },
    onError: () => {
      toast.error('Failed to save canned response');
    },
  });

  const deleteResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('canned_responses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      toast.success('Canned response deleted');
    },
    onError: () => {
      toast.error('Failed to delete canned response');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveResponse.mutate(new FormData(e.currentTarget));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Canned Responses
            </CardTitle>
            <CardDescription>
              Quick response templates for common requests
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Response
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit' : 'Add'} Canned Response</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={editing?.title}
                    placeholder="Short description of the response"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Response Content *</Label>
                  <Textarea
                    id="content"
                    name="content"
                    defaultValue={editing?.content}
                    placeholder="Enter the response text..."
                    rows={6}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      name="category"
                      defaultValue={editing?.category || 'General'}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      name="sort_order"
                      type="number"
                      defaultValue={editing?.sort_order || 0}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    name="is_active"
                    defaultChecked={editing?.is_active ?? true}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveResponse.isPending}>
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {responses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No canned responses configured. Add your first response to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell className="font-medium">{response.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{response.category || 'General'}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {response.content}
                  </TableCell>
                  <TableCell>
                    <Badge variant={response.is_active ? 'success' : 'secondary'}>
                      {response.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(response);
                          setOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${response.title}"?`)) {
                            deleteResponse.mutate(response.id);
                          }
                        }}
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
}
