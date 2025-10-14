import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { FileText, X } from "lucide-react";

interface FieldConfig {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface SubmissionPreviewProps {
  submissionId: string;
  onClose: () => void;
}

export function SubmissionPreview({ submissionId, onClose }: SubmissionPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [fields, setFields] = useState<FieldConfig[]>([]);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);

      // Get submission
      const { data: submissionData, error: submissionError } = await supabase
        .from("newsletter_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (submissionError) throw submissionError;
      setSubmission(submissionData);

      // Get template fields
      const { data: template, error: templateError } = await supabase
        .from("department_templates")
        .select("fields")
        .eq("department", submissionData.department)
        .eq("is_active", true)
        .single();

      if (templateError) throw templateError;
      const parsedFields = Array.isArray(template.fields) ? template.fields : [];
      setFields(parsedFields as unknown as FieldConfig[]);
    } catch (error: any) {
      console.error("Error loading submission:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-8">
        <p>Submission not found</p>
      </div>
    );
  }

  const payload = submission.payload as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{submission.department}</h3>
          <p className="text-sm text-muted-foreground">
            Submitted by {submission.submitter_name} on{" "}
            {format(new Date(submission.submitted_at || submission.created_at), "PPp")}
          </p>
        </div>
        <Badge variant={submission.status === "submitted" ? "default" : "outline"}>
          {submission.status}
        </Badge>
      </div>

      {submission.clinics && submission.clinics.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Clinics:</p>
          <div className="flex flex-wrap gap-2">
            {submission.clinics.map((clinic: string, index: number) => (
              <Badge key={index} variant="secondary">
                {clinic}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {submission.has_no_update ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground italic">
              No update this month
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => {
            const value = payload[field.key];
            if (!value || !value.trim()) return null;

            return (
              <Card key={field.key}>
                <CardHeader>
                  <CardTitle className="text-lg">{field.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}