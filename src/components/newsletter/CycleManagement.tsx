import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_OPTIONS = ['planning', 'active', 'in_review', 'completed', 'archived'];

export function CycleManagement({ onCycleCreated }: { onCycleCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['newsletter-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_cycles')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const saveCycle = useMutation({
    mutationFn: async (formData: FormData) => {
      const cycleData = {
        name: formData.get('name') as string,
        month: parseInt(formData.get('month') as string),
        year: parseInt(formData.get('year') as string),
        due_date: formData.get('due_date') as string,
        status: formData.get('status') as string,
        notes: formData.get('notes') as string,
        created_by: user?.id,
      };

      if (editing) {
        const { error } = await supabase
          .from('newsletter_cycles')
          .update(cycleData)
          .eq('id', editing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('newsletter_cycles')
          .insert(cycleData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-cycles'] });
      toast.success(`Cycle ${editing ? 'updated' : 'created'}`);
      setOpen(false);
      setEditing(null);
      onCycleCreated();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save cycle');
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('newsletter_cycles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-cycles'] });
      toast.success('Cycle deleted');
    },
    onError: () => {
      toast.error('Failed to delete cycle');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveCycle.mutate(new FormData(e.currentTarget));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Newsletter Cycles</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-2" />
                New Cycle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit' : 'Create'} Newsletter Cycle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Cycle Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editing?.name}
                    placeholder="e.g., January 2024 Newsletter"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Month *</Label>
                    <Select name="month" defaultValue={editing?.month?.toString() || '1'} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, idx) => (
                          <SelectItem key={idx} value={(idx + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      defaultValue={editing?.year || new Date().getFullYear()}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    defaultValue={editing?.due_date}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select name="status" defaultValue={editing?.status || 'planning'} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editing?.notes}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveCycle.isPending}>
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {cycles.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No cycles created yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell className="font-medium">{cycle.name}</TableCell>
                  <TableCell>
                    {MONTHS[cycle.month - 1]} {cycle.year}
                  </TableCell>
                  <TableCell>{new Date(cycle.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>
                      {cycle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(cycle);
                          setOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete cycle "${cycle.name}"?`)) {
                            deleteCycle.mutate(cycle.id);
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
