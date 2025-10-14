import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface NewsletterSubmissionFormProps {
  cycleId: string;
  department: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewsletterSubmissionForm({
  cycleId,
  department,
  onSuccess,
  onCancel,
}: NewsletterSubmissionFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hasNoUpdate, setHasNoUpdate] = useState(false);
  const [clinics, setClinics] = useState<string[]>([""]);
  const [allowMultipleClinics, setAllowMultipleClinics] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplateAndSubmission();
  }, [department, cycleId]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(formData).length > 0) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, hasNoUpdate]);

  const loadTemplateAndSubmission = async () => {
    try {
      setLoading(true);

      // Load template fields
      const { data: template, error: templateError } = await supabase
        .from("department_templates")
        .select("fields")
        .eq("department", department)
        .eq("is_active", true)
        .single();

      if (templateError) throw templateError;
      const parsedFields = Array.isArray(template.fields) ? template.fields : [];
      setFields(parsedFields as unknown as FieldConfig[]);

      // Check if multiple clinics allowed
      const { data: assignment } = await supabase
        .from("department_assignments")
        .select("allow_multiple_clinics")
        .eq("department", department)
        .single();

      setAllowMultipleClinics(assignment?.allow_multiple_clinics || false);

      // Load existing submission if any
      const { data: submission } = await supabase
        .from("newsletter_submissions")
        .select("*")
        .eq("cycle_id", cycleId)
        .eq("department", department)
        .eq("submitter_id", user?.id)
        .maybeSingle();

      if (submission) {
        setSubmissionId(submission.id);
        const payloadData = typeof submission.payload === 'object' && submission.payload !== null 
          ? submission.payload as Record<string, string>
          : {};
        setFormData(payloadData);
        setHasNoUpdate(submission.has_no_update);
        setClinics(submission.clinics?.length > 0 ? submission.clinics : [""]);
      }
    } catch (error: any) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    try {
      const payload = {
        cycle_id: cycleId,
        department,
        submitter_id: user?.id,
        submitter_name: user?.email || "",
        clinics: clinics.filter((c) => c.trim() !== ""),
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
    } catch (error: any) {
      console.error("Error saving draft:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      // Validate required fields if not "no update"
      if (!hasNoUpdate) {
        const requiredFields = fields.filter((f) => f.required);
        const missingFields = requiredFields.filter((f) => !formData[f.key]?.trim());

        if (missingFields.length > 0) {
          toast.error(`Please fill in: ${missingFields.map((f) => f.label).join(", ")}`);
          return;
        }
      }

      const payload = {
        cycle_id: cycleId,
        department,
        submitter_id: user?.id,
        submitter_name: user?.email || "",
        clinics: clinics.filter((c) => c.trim() !== ""),
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
        const { error } = await supabase
          .from("newsletter_submissions")
          .insert([payload]);

        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {allowMultipleClinics && (
        <div className="space-y-2">
          <Label>Clinics</Label>
          {clinics.map((clinic, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={clinic}
                onChange={(e) => {
                  const newClinics = [...clinics];
                  newClinics[index] = e.target.value;
                  setClinics(newClinics);
                }}
                placeholder="Clinic name"
              />
              {index === clinics.length - 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClinics([...clinics, ""])}
                >
                  Add Clinic
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="no-update"
          checked={hasNoUpdate}
          onCheckedChange={(checked) => setHasNoUpdate(checked as boolean)}
        />
        <label
          htmlFor="no-update"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          No update this month
        </label>
      </div>

      {!hasNoUpdate && (
        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  value={formData[field.key] || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  rows={5}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              ) : (
                <Input
                  type="text"
                  value={formData[field.key] || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="outline" onClick={saveDraft} disabled={saving}>
          Save Draft
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </div>
    </div>
  );
}