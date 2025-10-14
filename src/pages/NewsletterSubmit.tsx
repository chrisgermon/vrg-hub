import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Section {
  key: string;
  label: string;
  required: boolean;
  max_chars: number;
}

interface Template {
  id: string;
  department: string;
  display_name: string;
  description: string;
  sections: Section[];
}

export default function NewsletterSubmit() {
  const { department } = useParams<{ department: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [hasNoUpdate, setHasNoUpdate] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplateAndData();
  }, [department]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (cycleId && Object.keys(formData).length > 0) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, hasNoUpdate, cycleId]);

  const loadTemplateAndData = async () => {
    try {
      setLoading(true);

      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from("newsletter_templates")
        .select("*")
        .eq("department", department)
        .eq("is_active", true)
        .single();

      if (templateError) throw templateError;
      setTemplate({
        ...templateData,
        sections: Array.isArray(templateData.sections) ? templateData.sections as unknown as Section[] : []
      });

      // Load active cycle
      const { data: cycle } = await supabase
        .from("newsletter_cycles")
        .select("id")
        .in("status", ["open", "due_soon", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cycle) {
        setCycleId(cycle.id);

        // Load existing submission if any
        const { data: submission } = await supabase
          .from("newsletter_submissions")
          .select("*")
          .eq("cycle_id", cycle.id)
          .eq("department", department)
          .eq("submitter_id", user?.id)
          .maybeSingle();

        if (submission) {
          setSubmissionId(submission.id);
          const payloadData =
            typeof submission.payload === "object" && submission.payload !== null
              ? (submission.payload as Record<string, string>)
              : {};
          setFormData(payloadData);
          setHasNoUpdate(submission.has_no_update);
        }
      }
    } catch (error: any) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!cycleId) return;

    try {
      const payload = {
        cycle_id: cycleId,
        department,
        submitter_id: user?.id,
        submitter_name: user?.email || "",
        clinics: [],
        payload: formData as any,
        has_no_update: hasNoUpdate,
        status: "draft" as const,
        last_edited_at: new Date().toISOString(),
      };

      if (submissionId) {
        const { error } = await supabase
          .from("newsletter_submissions")
          .update(payload)
          .eq("id", submissionId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("newsletter_submissions")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setSubmissionId(data.id);
      }
      
      toast.success("Draft saved");
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    }
  };

  const handleSubmit = async () => {
    if (!cycleId) return;

    try {
      setSaving(true);

      // Validate required fields if not "no update"
      if (!hasNoUpdate && template) {
        const requiredSections = template.sections.filter((s) => s.required);
        const missingSections = requiredSections.filter((s) => !formData[s.key]?.trim());

        if (missingSections.length > 0) {
          toast.error(`Please fill in: ${missingSections.map((s) => s.label).join(", ")}`);
          return;
        }
      }

      const payload = {
        cycle_id: cycleId,
        department,
        submitter_id: user?.id,
        submitter_name: user?.email || "",
        clinics: [],
        payload: formData as any,
        has_no_update: hasNoUpdate,
        status: "submitted" as const,
        submitted_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
      };

      if (submissionId) {
        const { error } = await supabase
          .from("newsletter_submissions")
          .update(payload)
          .eq("id", submissionId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("newsletter_submissions").insert([payload]);

        if (error) throw error;
      }

      toast.success("Submission completed successfully");
      navigate("/newsletter");
    } catch (error: any) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit form");
    } finally {
      setSaving(false);
    }
  };

  const getCharCount = (text: string): number => {
    // Strip HTML tags for character count
    const div = document.createElement("div");
    div.innerHTML = text;
    return div.textContent?.length || 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Template not found for this department.</p>
            <Button onClick={() => navigate("/newsletter")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Newsletter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/newsletter")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Newsletter
        </Button>
        <h1 className="text-3xl font-bold mb-2">{template.display_name}</h1>
        <p className="text-muted-foreground">{template.description}</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* No Update Toggle */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Switch
                id="no-update"
                checked={hasNoUpdate}
                onCheckedChange={(checked) => setHasNoUpdate(checked)}
              />
              <div className="flex-1">
                <Label
                  htmlFor="no-update"
                  className="text-base font-medium cursor-pointer"
                >
                  No update this month
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Disables all sections and submits a blank update.
                </p>
              </div>
            </div>
          </div>

          {/* Sections */}
          {!hasNoUpdate && (
            <div className="space-y-8">
              {template.sections.map((section) => {
                const charCount = getCharCount(formData[section.key] || "");
                const charsLeft = section.max_chars - charCount;
                const isOverLimit = charCount > section.max_chars;

                return (
                  <div key={section.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        {section.label}
                        {section.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      <span
                        className={`text-sm ${
                          isOverLimit ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {charsLeft} characters left
                      </span>
                    </div>
                    <RichTextEditor
                      value={formData[section.key] || ""}
                      onChange={(value) =>
                        setFormData({ ...formData, [section.key]: value })
                      }
                      placeholder={`Enter ${section.label.toLowerCase()}`}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Use the toolbar to format your update. Paste from docs works too.
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => navigate("/newsletter")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving || !cycleId}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !cycleId}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
