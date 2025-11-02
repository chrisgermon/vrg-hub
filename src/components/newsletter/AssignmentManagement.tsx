import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

const DEPARTMENTS = [
  'Administration',
  'Radiology',
  'IT',
  'Marketing',
  'HR',
  'Finance',
  'Operations',
  'Clinical',
  'Customer Service',
];

export function AssignmentManagement() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: cycles = [] } = useQuery({
    queryKey: ['newsletter-cycles-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_cycles')
        .select('*')
        .in('status', ['planning', 'active'])
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['newsletter-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_assignments')
        .select(`
          *,
          cycle:newsletter_cycles(name, due_date),
          contributor:profiles!newsletter_assignments_contributor_id_fkey(full_name, email)
        `)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createAssignment = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from('newsletter_assignments').insert({
        cycle_id: formData.get('cycle_id') as string,
        contributor_id: formData.get('contributor_id') as string,
        department: formData.get('department') as string,
        topic: (formData.get('topic') as string) || null,
        word_count: parseInt(formData.get('word_count') as string) || 200,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-assignments'] });
      toast.success('Assignment created');
      setOpen(false);
    },
    onError: () => toast.error('Failed to create assignment'),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('newsletter_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter-assignments'] });
      toast.success('Assignment deleted');
    },
    onError: () => toast.error('Failed to delete assignment'),
  });

  const sendNotification = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.functions.invoke('notify-newsletter-cycle-created', {
        body: { assignmentId },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Notification sent'),
    onError: () => toast.error('Failed to send notification'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createAssignment.mutate(new FormData(e.currentTarget));
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Assignment Management</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={cycles.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Newsletter Assignment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cycle_id">Newsletter Cycle *</Label>
                  <Select name="cycle_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          {cycle.name} (Due: {new Date(cycle.due_date).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contributor_id">Contributor *</Label>
                  <Select name="contributor_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contributor" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name} ({profile.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select name="department" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic (Optional)</Label>
                  <Input id="topic" name="topic" placeholder="e.g., New Imaging Equipment" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="word_count">Word Count</Label>
                  <Input
                    id="word_count"
                    name="word_count"
                    type="number"
                    defaultValue="200"
                    min="50"
                    max="1000"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAssignment.isPending}>
                    Create Assignment
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
            Create a newsletter cycle first to start assigning contributors
          </p>
        ) : assignments.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No assignments yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle</TableHead>
                <TableHead>Contributor</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment: any) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.cycle?.name}</TableCell>
                  <TableCell>{assignment.contributor?.full_name}</TableCell>
                  <TableCell>{assignment.department}</TableCell>
                  <TableCell>{assignment.topic || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        assignment.status === 'completed'
                          ? 'default'
                          : assignment.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {assignment.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendNotification.mutate(assignment.id)}
                        disabled={sendNotification.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this assignment?')) {
                            deleteAssignment.mutate(assignment.id);
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