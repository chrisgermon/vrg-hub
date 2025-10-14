import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export function NewsletterBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user && !dismissed) {
      checkPendingSubmissions();
    }
  }, [user, dismissed]);

  const checkPendingSubmissions = async () => {
    try {
      // Get current open cycle
      const { data: cycle } = await supabase
        .from("newsletter_cycles")
        .select("*")
        .in("status", ["open", "due_soon", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cycle) {
        setVisible(false);
        return;
      }

      // Check if user has assignments
      const { data: assignments } = await supabase
        .from("department_assignments")
        .select("department")
        .contains("assignee_ids", [user?.id]);

      if (!assignments || assignments.length === 0) {
        setVisible(false);
        return;
      }

      // Check if user has pending submissions
      const { data: submissions } = await supabase
        .from("newsletter_submissions")
        .select("department")
        .eq("cycle_id", cycle.id)
        .eq("submitter_id", user?.id)
        .eq("status", "submitted");

      const submittedDepts = submissions?.map((s) => s.department) || [];
      const hasPending = assignments.some(
        (a) => !submittedDepts.includes(a.department)
      );

      if (hasPending) {
        setVisible(true);
        setDueDate(new Date(cycle.due_at));
      } else {
        setVisible(false);
      }
    } catch (error) {
      console.error("Error checking newsletter status:", error);
    }
  };

  if (!visible || dismissed) {
    return null;
  }

  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Alert className="border-primary/50 bg-primary/5 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <Bell className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <AlertTitle>Newsletter Submission Pending</AlertTitle>
            <AlertDescription>
              You have pending newsletter contributions due{" "}
              {dueDate && format(dueDate, "PPP")}.
              {daysUntilDue > 0 && ` ${daysUntilDue} days remaining.`}
              {daysUntilDue <= 0 && " This is now overdue!"}
            </AlertDescription>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => navigate("/newsletter")}
            >
              Complete Now
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}