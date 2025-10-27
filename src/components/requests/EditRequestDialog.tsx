import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface EditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
}

export function EditRequestDialog({
  open,
  onOpenChange,
  request,
}: EditRequestDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (request) {
      setTitle(request.title || '');
      setDescription(request.description || '');
      setPriority(request.priority || 'medium');
    }
  }, [request]);

  const updateRequest = useMutation({
    mutationFn: async (data: { title: string; description: string; priority: string }) => {
      // Try tickets table first
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          title: data.title,
          description: data.description,
          priority: data.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (ticketError) {
        // Fallback to hardware_requests
        const { error: hwError } = await supabase
          .from('hardware_requests')
          .update({
            title: data.title,
            description: data.description,
            priority: data.priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        if (hwError) throw hwError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-by-identifier'] });
      toast.success('Request updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRequest.mutate({ title, description, priority });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Request</DialogTitle>
          <DialogDescription>
            Update the request details below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Request title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your request..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateRequest.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateRequest.isPending}>
              {updateRequest.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
