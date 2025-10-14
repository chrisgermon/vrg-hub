import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { key: 'request_created', label: 'New Request Created', description: 'When a new hardware or marketing request is submitted' },
  { key: 'request_approved', label: 'Request Approved', description: 'When your request is approved' },
  { key: 'request_declined', label: 'Request Declined', description: 'When your request is declined' },
  { key: 'request_comment', label: 'New Comment', description: 'When someone comments on your request' },
  { key: 'approval_needed', label: 'Approval Needed', description: 'When a request needs your approval' },
  { key: 'newsletter_assigned', label: 'Newsletter Assignment', description: 'When you are assigned a newsletter contribution' },
  { key: 'newsletter_reminder', label: 'Newsletter Reminder', description: 'Reminder for pending newsletter contributions' },
];

export function NotificationSettingsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ eventType, field, value }: { eventType: string; field: 'email_enabled' | 'in_app_enabled'; value: boolean }) => {
      const existing = settings.find(s => s.event_type === eventType);

      if (existing) {
        const { error } = await supabase
          .from('notification_settings')
          .update({ [field]: value })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user?.id,
            event_type: eventType,
            [field]: value,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Notification settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update notification settings');
      console.error(error);
    },
  });

  const getSettingValue = (eventType: string, field: 'email_enabled' | 'in_app_enabled') => {
    const setting = settings.find(s => s.event_type === eventType);
    return setting ? setting[field] : true; // Default to true
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified about different events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {EVENT_TYPES.map((eventType) => (
          <div key={eventType.key} className="space-y-3 pb-4 border-b last:border-0">
            <div>
              <h4 className="font-medium">{eventType.label}</h4>
              <p className="text-sm text-muted-foreground">{eventType.description}</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${eventType.key}-email`} className="text-sm">
                Email notifications
              </Label>
              <Switch
                id={`${eventType.key}-email`}
                checked={getSettingValue(eventType.key, 'email_enabled')}
                onCheckedChange={(checked) =>
                  updateSetting.mutate({
                    eventType: eventType.key,
                    field: 'email_enabled',
                    value: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${eventType.key}-app`} className="text-sm">
                In-app notifications
              </Label>
              <Switch
                id={`${eventType.key}-app`}
                checked={getSettingValue(eventType.key, 'in_app_enabled')}
                onCheckedChange={(checked) =>
                  updateSetting.mutate({
                    eventType: eventType.key,
                    field: 'in_app_enabled',
                    value: checked,
                  })
                }
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
