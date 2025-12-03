import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdvanceNoticeOptions } from "@/hooks/useAdvanceNoticeOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Bell, Mail, Smartphone, ChevronDown, Plus, Check, FileText, Calendar, Wrench, Users, ClipboardList, X, Paperclip } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  general: FileText,
  license: ClipboardList,
  contract: FileText,
  maintenance: Wrench,
  meeting: Users,
};

export default function NewReminder() {
  const navigate = useNavigate();
  const { profile, userRole } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendNow, setSendNow] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customDays, setCustomDays] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: 'general',
    reminder_date: '',
    reminder_time: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to create reminders');
        return;
      }

      // Combine date and time
      const dateTimeString = formData.reminder_time 
        ? `${formData.reminder_date}T${formData.reminder_time}`
        : `${formData.reminder_date}T09:00`;
      const localDate = new Date(dateTimeString);
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

      if (inserted?.id && selectedFiles.length > 0) {
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
            await supabase.from('reminder_attachments').insert({
              reminder_id: inserted.id,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      if (isSuperAdmin && sendNow && inserted?.id) {
        try {
          const { error: sendError } = await supabase.functions.invoke('send-reminder-now', {
            body: { reminderId: inserted.id },
          });
          if (sendError) {
            toast.error('Failed to send now: ' + sendError.message);
          } else {
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

  const handleAdvanceNoticeChange = (value: string) => {
    if (value === 'custom') {
      setShowAdvanced(true);
      return;
    }
    const days = parseInt(value);
    if (!isNaN(days)) {
      setFormData(prev => ({
        ...prev,
        advance_notice_days: [days]
      }));
    }
  };

  const handleCustomDaysSubmit = () => {
    const days = parseInt(customDays);
    if (days > 0) {
      setFormData(prev => ({
        ...prev,
        advance_notice_days: [days]
      }));
      setCustomDays('');
    }
  };

  useEffect(() => {
    if (formData.sms_enabled && !formData.phone_number && profile?.phone) {
      setFormData(prev => ({
        ...prev,
        phone_number: profile.phone
      }));
    }
  }, [formData.sms_enabled, profile?.phone]);

  const toggleNotification = (key: 'email_enabled' | 'sms_enabled' | 'in_app_enabled') => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-6 px-4 md:py-10">
      <div className="mx-auto w-full max-w-[520px]">
        {/* Form Card */}
        <div className="bg-card rounded-[20px] shadow-lg border overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b bg-muted/30 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/reminders')}
              className="w-10 h-10 rounded-xl border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">New Reminder</h1>
              <p className="text-sm text-muted-foreground">Stay on top of important dates</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Form Body */}
            <div className="p-6 space-y-6">
              {/* Title - Primary Field */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">What do you need to remember?</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Medical License Renewal"
                  className="h-14 text-lg font-medium rounded-xl bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              {/* Type Selection - Visual Chips */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</Label>
                <div className="flex flex-wrap gap-2">
                  {categories?.slice(0, 5).map((cat) => {
                    const value = cat.name.toLowerCase().replace(' ', '_');
                    const isSelected = formData.reminder_type === value;
                    const IconComponent = typeIcons[value] || FileText;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, reminder_type: value })}
                        className={cn(
                          "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md",
                          isSelected 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-background border-border/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</Label>
                  <Input
                    type="date"
                    value={formData.reminder_date}
                    onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                    className="rounded-xl bg-muted/30 border-border/50 focus:border-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time (optional)</Label>
                  <Input
                    type="time"
                    value={formData.reminder_time}
                    onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                    className="rounded-xl bg-muted/30 border-border/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Advance Notice - Clean Dropdown */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Remind me</Label>
                <Select
                  value={formData.advance_notice_days[0]?.toString() || '1'}
                  onValueChange={handleAdvanceNoticeChange}
                >
                  <SelectTrigger className="rounded-xl bg-muted/30 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {advanceNoticeOptions?.map((opt) => (
                      <SelectItem key={opt.id} value={opt.days.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notification Methods - Inline Toggles */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notify via</Label>
                <div className="flex gap-2">
                  {[
                    { key: 'email_enabled' as const, label: 'Email', Icon: Mail },
                    { key: 'in_app_enabled' as const, label: 'In-App', Icon: Bell },
                    { key: 'sms_enabled' as const, label: 'SMS', Icon: Smartphone },
                  ].map((channel) => (
                    <button
                      key={channel.key}
                      type="button"
                      onClick={() => toggleNotification(channel.key)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all",
                        formData[channel.key]
                          ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400"
                          : "bg-background border-border/50 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <channel.Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{channel.label}</span>
                      {formData[channel.key] && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* SMS Phone Input */}
              {formData.sms_enabled && (
                <div className="space-y-2 animate-fade-in">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SMS Phone Number</Label>
                  <Input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+61 400 000 000"
                    className="rounded-xl bg-muted/30 border-border/50"
                    required={formData.sms_enabled}
                  />
                </div>
              )}

              {/* Attachments - Compact */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attachments</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg text-sm">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 cursor-pointer transition-colors">
                    <Plus className="h-3 w-3" />
                    <span>Add file</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Advanced Options</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      showAdvanced && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-fade-in">
                  <div className="space-y-6 pt-2 border-t">
                    {/* Description */}
                    <div className="space-y-2 pt-4">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description (optional)</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Add any notes or details..."
                        className="rounded-xl bg-muted/30 border-border/50 min-h-[80px] resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Custom Days Input */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Reminder Days</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          placeholder="Enter days before"
                          className="rounded-xl bg-muted/30 border-border/50 flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={handleCustomDaysSubmit}
                          disabled={!customDays || parseInt(customDays) <= 0}
                          className="rounded-xl"
                        >
                          Set
                        </Button>
                      </div>
                    </div>

                    {/* Recurring Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium text-foreground">Recurring</span>
                        <p className="text-xs text-muted-foreground">Repeat this reminder on a schedule</p>
                      </div>
                      <Switch
                        checked={formData.is_recurring}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                      />
                    </div>

                    {formData.is_recurring && (
                      <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repeat</Label>
                          <Select
                            value={formData.recurrence_pattern}
                            onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                          >
                            <SelectTrigger className="rounded-xl bg-muted/30 border-border/50">
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
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Every</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.recurrence_interval}
                            onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                            className="rounded-xl bg-muted/30 border-border/50"
                          />
                        </div>
                      </div>
                    )}

                    {/* Keep Reminding Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium text-foreground">Keep reminding until done</span>
                        <p className="text-xs text-muted-foreground">Send daily reminders after due date</p>
                      </div>
                      <Switch
                        checked={formData.repeat_until_complete}
                        onCheckedChange={(checked) => setFormData({ ...formData, repeat_until_complete: checked })}
                      />
                    </div>

                    {/* Custom Email */}
                    {formData.email_enabled && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Email (optional)</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="Override default email address"
                          className="rounded-xl bg-muted/30 border-border/50"
                        />
                      </div>
                    )}

                    {/* Super Admin Testing */}
                    {isSuperAdmin && (
                      <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Send now after saving</span>
                          <p className="text-xs text-amber-600 dark:text-amber-400">Testing - triggers immediate send</p>
                        </div>
                        <Switch checked={sendNow} onCheckedChange={setSendNow} />
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t bg-muted/20 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/reminders')}
                className="flex-1 rounded-xl h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title || !formData.reminder_date}
                className="flex-[2] rounded-xl h-12 gap-2 font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                {isSubmitting ? 'Creating...' : 'Create Reminder'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
