import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LifeBuoy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HelpTicket() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string>('');
  
  const [formData, setFormData] = useState({
    summary: '',
    details: '',
    priority: '2', // Medium priority
    category_id: '1',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.summary.trim() || !formData.details.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      // HaloPSA Integration - Temporarily disabled
      // Keeping code for future use if re-enabled
      
      /* Original HaloPSA code:
      console.log('Submitting help ticket to HaloPSA...');

      const { data, error } = await supabase.functions.invoke('create-halo-ticket', {
        body: {
          summary: formData.summary,
          details: formData.details,
          priority: parseInt(formData.priority),
          category_id: parseInt(formData.category_id),
        },
      });

      if (error) {
        console.error('Error creating ticket:', error);
        throw error;
      }

      console.log('Ticket created successfully:', data);
      
      setSuccess(true);
      setTicketNumber(data.ticket_id || 'N/A');
      */
      
      // Temporary: Show message that HaloPSA is disabled
      toast.info('HaloPSA integration is currently disabled. Please contact IT support directly.');
      
      // Reset form
      setFormData({
        summary: '',
        details: '',
        priority: '2',
        category_id: '1',
      });

      // Redirect after a delay
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to create help ticket:', error);
      toast.error(error.message || 'Failed to submit help ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-green-900">Ticket Submitted Successfully!</CardTitle>
                <CardDescription className="text-green-700">
                  Your help ticket has been created and submitted to IT support.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-300 bg-green-100">
              <AlertDescription className="text-green-900">
                <strong>Ticket Number:</strong> {ticketNumber}
                <br />
                Our IT team will review your request and get back to you shortly.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/home')} className="flex-1">
                Return to Home
              </Button>
              <Button onClick={() => setSuccess(false)} variant="outline">
                Submit Another Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Submit IT Help Ticket</CardTitle>
              <CardDescription>
                Need technical assistance? Submit a help ticket and our IT team will assist you.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="summary">
                Issue Summary <span className="text-destructive">*</span>
              </Label>
              <Input
                id="summary"
                placeholder="Brief description of your issue"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                required
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Provide a short, clear title for your issue
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">
                Detailed Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="details"
                placeholder="Please provide as much detail as possible about your issue..."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                required
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Include steps to reproduce, error messages, and any relevant information
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low - Minor issue</SelectItem>
                    <SelectItem value="2">Medium - Normal support</SelectItem>
                    <SelectItem value="3">High - Affecting work</SelectItem>
                    <SelectItem value="4">Critical - System down</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">General Support</SelectItem>
                    <SelectItem value="2">Hardware Issue</SelectItem>
                    <SelectItem value="3">Software Issue</SelectItem>
                    <SelectItem value="4">Network/Connectivity</SelectItem>
                    <SelectItem value="5">Access/Permissions</SelectItem>
                    <SelectItem value="6">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>Submitting as:</strong> {profile?.name || 'Unknown User'} ({profile?.email || user?.email || 'No email'})
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Ticket...
                  </>
                ) : (
                  <>
                    <LifeBuoy className="w-4 h-4 mr-2" />
                    Submit Help Ticket
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/home')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
