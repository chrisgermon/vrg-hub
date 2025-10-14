import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, AlertCircle, Edit } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface NewsletterCycle {
  id: string;
  month: string;
  status: string;
  due_at: string;
  open_at: string;
}

interface DepartmentAssignment {
  department: string;
  allow_multiple_clinics: boolean;
}

interface Submission {
  id: string;
  department: string;
  status: string;
  submitted_at: string | null;
  last_edited_at: string;
}

export function ContributorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentCycle, setCurrentCycle] = useState<NewsletterCycle | null>(null);
  const [assignments, setAssignments] = useState<DepartmentAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get current cycle
      const { data: cycle, error: cycleError } = await supabase
        .from("newsletter_cycles")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycleError) throw cycleError;
      setCurrentCycle(cycle);

      if (!cycle) {
        setLoading(false);
        return;
      }

      // Get user's department assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("department_assignments")
        .select("department, allow_multiple_clinics")
        .contains("assignee_ids", [user?.id]);

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Get user's submissions for current cycle
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("newsletter_submissions")
        .select("*")
        .eq("cycle_id", cycle.id)
        .eq("submitter_id", user?.id);

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionStatus = (department: string) => {
    const submission = submissions.find((s) => s.department === department);
    if (!submission) return { status: "Not started", variant: "secondary" as const };
    if (submission.status === "submitted") return { status: "Submitted", variant: "default" as const };
    return { status: "Draft", variant: "outline" as const };
  };

  const handleFillForm = (department: string) => {
    navigate(`/newsletter/submit/${department}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCycle) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No active newsletter cycle at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">You are not assigned to any departments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysUntilDue = Math.ceil(
    (new Date(currentCycle.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Current Newsletter Cycle</CardTitle>
          <CardDescription>
            {format(new Date(currentCycle.due_at), "MMMM yyyy")} Newsletter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Due: {format(new Date(currentCycle.due_at), "PPP")}
              </p>
              <p className="text-sm text-muted-foreground">
                {daysUntilDue > 0 ? `${daysUntilDue} days remaining` : "Overdue"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => {
          const { status, variant } = getSubmissionStatus(assignment.department);
          const submission = submissions.find((s) => s.department === assignment.department);

          return (
            <Card key={assignment.department}>
              <CardHeader>
                <CardTitle className="text-lg">{assignment.department}</CardTitle>
                <Badge variant={variant}>{status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission && submission.last_edited_at && (
                  <p className="text-sm text-muted-foreground">
                    Last edited: {format(new Date(submission.last_edited_at), "PPp")}
                  </p>
                )}
                <Button 
                  className="w-full" 
                  onClick={() => handleFillForm(assignment.department)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {submission ? "Edit Submission" : "Fill Form"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}