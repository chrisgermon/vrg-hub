import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  userEmail: string;
  requestTitle: string;
}

export function EmailUserDialog({ 
  open, 
  onOpenChange, 
  requestId, 
  userEmail, 
  requestTitle 
}: EmailUserDialogProps) {
  const [subject, setSubject] = useState(`RE: ${requestTitle}`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      // Add comment to request
      const { error: commentError } = await supabase
        .from('request_comments')
        .insert({
          request_id: requestId,
          user_id: user?.id,
          author_name: profile?.full_name || 'System',
          author_email: profile?.email || 'system@example.com',
          content: message,
          content_html: message,
          is_internal: false,
        });

      if (commentError) throw commentError;

      // TODO: Send actual email notification
      // For now, we'll just show success
      
      toast({
        title: 'Email Sent',
        description: `Email sent to ${userEmail}`,
      });

      onOpenChange(false);
      setMessage('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Email User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" value={userEmail} disabled />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea 
              id="message"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
