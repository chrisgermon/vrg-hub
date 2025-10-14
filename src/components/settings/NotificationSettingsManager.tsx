import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, Mail } from "lucide-react";
import { useCompanyContext } from "@/contexts/CompanyContext";

interface NotificationSetting {
  id: string;
  company_id: string;
  request_type: 'hardware' | 'marketing' | 'toner' | 'user_account';
  recipient_emails: string[];
}

const REQUEST_TYPES = [
  { value: 'hardware', label: 'Hardware Requests' },
  { value: 'marketing', label: 'Marketing Requests' },
  { value: 'toner', label: 'Toner Requests' },
  { value: 'user_account', label: 'User Account Requests' },
];

export function NotificationSettingsManager() {
  const { selectedCompany } = useCompanyContext();
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");

  const { data: settings = [] } = useQuery({
    queryKey: ['notification-settings', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('company_notification_settings')
        .select('*')
        .eq('company_id', selectedCompany.id);
      
      if (error) throw error;
      return data as NotificationSetting[];
    },
    enabled: !!selectedCompany?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ requestType, emails }: { requestType: string; emails: string[] }) => {
      if (!selectedCompany?.id) throw new Error('No company selected');
      
      const { error } = await supabase
        .from('company_notification_settings')
        .upsert({
          company_id: selectedCompany.id,
          request_type: requestType,
          recipient_emails: emails,
        }, {
          onConflict: 'company_id,request_type',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Notification settings updated');
      setEditingType(null);
      setEmailInput("");
    },
    onError: (error) => {
      toast.error('Failed to update notification settings');
      console.error(error);
    },
  });

  const getSettingForType = (type: string) => {
    return settings.find(s => s.request_type === type);
  };

  const handleAddEmail = (type: string) => {
    if (!emailInput || !emailInput.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    const setting = getSettingForType(type);
    const currentEmails = setting?.recipient_emails || [];
    
    if (currentEmails.includes(emailInput)) {
      toast.error('Email already added');
      return;
    }

    upsertMutation.mutate({
      requestType: type,
      emails: [...currentEmails, emailInput],
    });
  };

  const handleRemoveEmail = (type: string, emailToRemove: string) => {
    const setting = getSettingForType(type);
    if (!setting) return;

    const updatedEmails = setting.recipient_emails.filter(e => e !== emailToRemove);
    upsertMutation.mutate({
      requestType: type,
      emails: updatedEmails,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Recipients</CardTitle>
        <CardDescription>
          Configure who receives email notifications for each request type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {REQUEST_TYPES.map((type) => {
          const setting = getSettingForType(type.value);
          const isEditing = editingType === type.value;

          return (
            <div key={type.value} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base">{type.label}</Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingType(isEditing ? null : type.value)}
                >
                  {isEditing ? 'Done' : 'Edit'}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {setting?.recipient_emails.length ? (
                  setting.recipient_emails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveEmail(type.value, email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recipients configured</p>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddEmail(type.value);
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleAddEmail(type.value)}
                    disabled={!emailInput}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
