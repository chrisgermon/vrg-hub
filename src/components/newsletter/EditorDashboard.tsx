import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CycleManagement } from "./CycleManagement";
import { 
  Table,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Lock, Download, Bell, Plus, FileText, RefreshCw, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { SubmissionPreview } from "./SubmissionPreview";

interface NewsletterCycle {
  id: string;
  month: string;
  status: string;
  due_at: string;
}

interface DepartmentStatus {
  department: string;
  assignees: number;
  status: string;
  lastActivity: string | null;
  submissionId?: string;
}

export function EditorDashboard() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<NewsletterCycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  const [departmentStatuses, setDepartmentStatuses] = useState<DepartmentStatus[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      loadCycleSubmissions(selectedCycle);
    }
  }, [selectedCycle]);

  const loadCycles = async () => {
    try {
      const { data, error } = await supabase
        .from("newsletter_cycles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      
      setCycles(data || []);
      if (data && data.length > 0) {
        setSelectedCycle(data[0].id);
      }
    } catch (error: any) {
      console.error("Error loading cycles:", error);
      toast({
        title: "Error",
        description: "Failed to load newsletter cycles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCycleSubmissions = async (cycleId: string) => {
    try {
      // Get all department assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("department_assignments")
        .select("department, assignee_ids");

      if (assignmentsError) throw assignmentsError;

      // Get submissions for this cycle
      const { data: submissions, error: submissionsError } = await supabase
        .from("newsletter_submissions")
        .select("id, department, status, last_edited_at")
        .eq("cycle_id", cycleId);

      if (submissionsError) throw submissionsError;

      // Create status map
      const statuses: DepartmentStatus[] = (assignments || []).map((assignment) => {
        const submission = submissions?.find((s) => s.department === assignment.department);
        return {
          department: assignment.department,
          assignees: assignment.assignee_ids?.length || 0,
          status: submission?.status || "not_started",
          lastActivity: submission?.last_edited_at || null,
          submissionId: submission?.id,
        };
      });

      setDepartmentStatuses(statuses);
    } catch (error: any) {
      console.error("Error loading submissions:", error);
    }
  };

  const handleLockCycle = async () => {
    try {
      const { error } = await supabase
        .from("newsletter_cycles")
        .update({ status: "locked", locked_at: new Date().toISOString() })
        .eq("id", selectedCycle);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Newsletter cycle has been locked",
      });
      loadCycles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to lock cycle",
        variant: "destructive",
      });
    }
  };

  const handleSendReminders = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-newsletter-reminder', {
        body: {
          cycleId: selectedCycle,
          type: 'manual',
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminders have been sent",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send reminders",
        variant: "destructive",
      });
    }
  };

  const handleExportNewsletter = async (format: 'html' | 'pdf' | 'docx') => {
    try {
      const { data, error } = await supabase.functions.invoke('export-newsletter', {
        body: {
          cycleId: selectedCycle,
          format,
        },
      });

      if (error) throw error;

      if (format === 'html') {
        // Open HTML in new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(data.html);
          newWindow.document.close();
        } else {
          // Fallback: download as HTML file
          const blob = new Blob([data.html], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `newsletter-${currentCycle?.month || 'export'}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } else {
        // Download PDF or DOCX
        const blob = new Blob([Uint8Array.from(atob(data.content), c => c.charCodeAt(0))], {
          type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `newsletter-${data.filename || 'export'}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: `Newsletter exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export newsletter",
        variant: "destructive",
      });
    }
  };

  const handleNudgeDepartment = async (department: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-newsletter-reminder', {
        body: {
          cycleId: selectedCycle,
          department,
          type: 'manual',
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reminder sent to ${department}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="default">Submitted</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const currentCycle = cycles.find((c) => c.id === selectedCycle);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Newsletter Editor</CardTitle>
              <CardDescription>Manage newsletter submissions and cycles</CardDescription>
            </div>
            <CycleManagement onCycleCreated={loadCycles} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {format(new Date(cycle.due_at), "MMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentCycle && (
              <div className="flex items-center gap-2">
                <Badge>{currentCycle.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  Due: {format(new Date(currentCycle.due_at), "PPP")}
                </span>
              </div>
            )}
          </div>

          {currentCycle && currentCycle.status !== "locked" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSendReminders}>
                <Bell className="h-4 w-4 mr-2" />
                Send Reminders
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLockCycle}>
                <Lock className="h-4 w-4 mr-2" />
                Lock Cycle
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Newsletter
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportNewsletter('html')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportNewsletter('pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportNewsletter('docx')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Department Submissions</CardTitle>
              <CardDescription>Track the status of all department contributions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => selectedCycle && loadCycleSubmissions(selectedCycle)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departmentStatuses.map((dept) => (
                <TableRow key={dept.department}>
                  <TableCell className="font-medium">{dept.department}</TableCell>
                  <TableCell>{dept.assignees}</TableCell>
                  <TableCell>{getStatusBadge(dept.status)}</TableCell>
                  <TableCell>
                    {dept.lastActivity
                      ? format(new Date(dept.lastActivity), "PPp")
                      : "No activity"}
                  </TableCell>
                  <TableCell>
                    {dept.status === 'submitted' && dept.submissionId ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedSubmission(dept.submissionId!);
                          setShowPreview(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleNudgeDepartment(dept.department)}
                        disabled={dept.status === 'submitted'}
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Preview</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <SubmissionPreview
              submissionId={selectedSubmission}
              onClose={() => setShowPreview(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}