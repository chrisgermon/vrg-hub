import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdvanceNoticeOptions } from "@/hooks/useAdvanceNoticeOptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Bell, Mail, Smartphone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ReminderAttachments } from "@/components/reminders/ReminderAttachments";


export default function NewReminder() {
  const navigate = useNavigate();
  const { profile, userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendNow, setSendNow] = useState(false);
  const [createdReminderId, setCreatedReminderId] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'general',
    reminder_date: '',
    is_recurring: false,
    recurrence_pattern: 'monthly',
    recurrence_interval: 1,
    email_enabled: true,
    sms_enabled: false,
    in_app_enabled: true,
    phone_number: '',
    email: '',
    advance_notice_days: [1],
    repeat_until_complete: false,
  });

  const { data: categories } = useQuery({
    queryKey: ['reminder-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data;
    },
  });

  const { data: advanceNoticeOptions } = useAdvanceNoticeOptions();
  const predefinedDays = advanceNoticeOptions?.map(opt => opt.days) || [365, 90, 60, 30, 14, 7, 1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to create reminders');
        return;
      }

      // Convert datetime-local to UTC ISO string
      // The input value is in format "YYYY-MM-DDTHH:MM" which represents local time
      // We need to convert this to a proper ISO string with timezone info
      const localDate = new Date(formData.reminder_date);
      const utcDateString = localDate.toISOString();

      const { data: inserted, error } = await supabase.from('reminders').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        reminder_type: formData.reminder_type,
        reminder_date: utcDateString,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
        recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
        notification_channels: {
          email: formData.email_enabled,
          sms: formData.sms_enabled,
          in_app: formData.in_app_enabled,
        },
        phone_number: formData.phone_number || null,
        email: formData.email || null,
        advance_notice_days: formData.advance_notice_days,
        repeat_until_complete: formData.repeat_until_complete,
      }).select('*').single();

      if (error) throw error;

      // Store the created reminder ID for attachments
      if (inserted?.id) {
        setCreatedReminderId(inserted.id);
        
        // Upload selected files if any
        if (selectedFiles.length > 0) {
          for (const file of selectedFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${inserted.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('reminder-attachments')
              .upload(filePath, file);

            if (uploadError) {
              console.error('Error uploading file:', uploadError);
              toast.error(`Failed to upload ${file.name}`);
            } else {
              // Create attachment record
              const { error: dbError } = await supabase
                .from('reminder_attachments')
                .insert({
                  reminder_id: inserted.id,
                  file_name: file.name,
                  file_path: filePath,
                  file_size: file.size,
                  content_type: file.type,
                  uploaded_by: user.id,
                });

              if (dbError) {
                console.error('Error creating attachment record:', dbError);
              }
            }
          }
        }
      }

      if (isSuperAdmin && sendNow && inserted?.id) {
        try {
          const { data: sendData, error: sendError } = await supabase.functions.invoke('send-reminder-now', {
            body: { reminderId: inserted.id },
          });
          if (sendError) {
            toast.error('Failed to send now: ' + sendError.message);
          } else {
            console.log('send-reminder-now result:', sendData);
            toast.success('Reminder sent now');
          }
        } catch (e: any) {
          toast.error('Failed to send now: ' + e.message);
        }
      }

      toast.success('Reminder created successfully!');
      navigate('/reminders');
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdvanceDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      advance_notice_days: prev.advance_notice_days.includes(day)
        ? prev.advance_notice_days.filter(d => d !== day)
        : [...prev.advance_notice_days, day].sort((a, b) => b - a)
    }));
  };

  const handleCustomDaysSubmit = () => {
    const days = parseInt(customDays);
    if (days > 0 && !formData.advance_notice_days.includes(days)) {
      setFormData(prev => ({
        ...prev,
        advance_notice_days: [...prev.advance_notice_days, days].sort((a, b) => b - a)
      }));
      setCustomDays('');
    }
  };

  const customSelectedDays = formData.advance_notice_days.filter(d => !predefinedDays.includes(d));

  // Auto-populate phone number when SMS is enabled
  useEffect(() => {
    if (formData.sms_enabled && !formData.phone_number && profile?.phone) {
      setFormData(prev => ({
        ...prev,
        phone_number: profile.phone
      }));
    }
  }, [formData.sms_enabled, profile?.phone]);

  return (
    <div className="container-responsive py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reminders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Reminder</h1>
          <p className="text-muted-foreground">Create a new reminder</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Medical License Renewal"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details about this reminder..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reminder_type">Type *</Label>
                    <Select
                      value={formData.reminder_type}
                      onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name.toLowerCase().replace(' ', '_')}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reminder_date">Date & Time *</Label>
                    <Input
                      id="reminder_date"
                      type="datetime-local"
                      value={formData.reminder_date}
                      onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advance Notices</CardTitle>
                <CardDescription>Select when to send reminders before the date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Quick Select</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {advanceNoticeOptions?.map((opt) => (
                      <Button
                        key={opt.id}
                        type="button"
                        variant={formData.advance_notice_days.includes(opt.days) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAdvanceDay(opt.days)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {formData.advance_notice_days.length > 0 && (
                  <div>
                    <Label>Selected ({formData.advance_notice_days.length})</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.advance_notice_days.sort((a, b) => b - a).map((day) => (
                        <div key={day} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm">
                          <span>{day === 1 ? '1 day' : day === 365 ? '1 year' : `${day} days`} before</span>
                          <button
                            type="button"
                            onClick={() => toggleAdvanceDay(day)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="custom-days">Custom Days</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="custom-days"
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCustomDaysSubmit();
                        }
                      }}
                      placeholder="Enter days"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleCustomDaysSubmit}
                      disabled={!customDays || parseInt(customDays) <= 0}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recurring Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_recurring">Make this recurring</Label>
                  <Switch
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  />
                </div>

                {formData.is_recurring && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recurrence_pattern">Repeat</Label>
                      <Select
                        value={formData.recurrence_pattern}
                        onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="recurrence_interval">Every</Label>
                      <Input
                        id="recurrence_interval"
                        type="number"
                        min="1"
                        value={formData.recurrence_interval}
                        onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Repeat Until Complete</CardTitle>
                <CardDescription>Continue sending daily reminders after due date until task is marked complete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="repeat_until_complete">Keep reminding until completed</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sends daily reminders after the due date passes until you mark the task as done
                    </p>
                  </div>
                  <Switch
                    id="repeat_until_complete"
                    checked={formData.repeat_until_complete}
                    onCheckedChange={(checked) => setFormData({ ...formData, repeat_until_complete: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="email_enabled" className="font-medium">Email</Label>
                        {formData.email_enabled && formData.email && (
                          <p className="text-xs text-muted-foreground">{formData.email}</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      id="email_enabled"
                      checked={formData.email_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, email_enabled: checked })}
                    />
                  </div>

                  {formData.email_enabled && (
                    <div className="ml-11 pl-3">
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Custom email (optional)"
                        className="text-sm"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="sms_enabled" className="font-medium">SMS</Label>
                        {formData.sms_enabled && formData.phone_number && (
                          <p className="text-xs text-muted-foreground">{formData.phone_number}</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      id="sms_enabled"
                      checked={formData.sms_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, sms_enabled: checked })}
                    />
                  </div>

                  {formData.sms_enabled && (
                    <div className="ml-11 pl-3">
                      <Input
                        id="phone_number"
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        placeholder="+61 400 000 000"
                        required={formData.sms_enabled}
                        className="text-sm"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <Label htmlFor="in_app_enabled" className="font-medium">In-App Notification</Label>
                    </div>
                    <Switch
                      id="in_app_enabled"
                      checked={formData.in_app_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, in_app_enabled: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>Add files to this reminder (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(Array.from(e.target.files));
                    }
                  }}
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground flex items-center justify-between">
                        <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isSuperAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Testing</CardTitle>
                  <CardDescription>Super admins can trigger a send immediately</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="send_now">Send now after saving</Label>
                    <Switch id="send_now" checked={sendNow} onCheckedChange={setSendNow} />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Reminder'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/reminders')}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
