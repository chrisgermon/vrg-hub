import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Department {
  id: string;
  department: string;
  assignee_ids: string[];
  allow_multiple_clinics: boolean;
}

interface User {
  user_id: string;
  name: string;
  email: string;
}

export function AssignmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load departments
      const { data: deptData, error: deptError } = await supabase
        .from("department_assignments")
        .select("*")
        .order("department");

      if (deptError) throw deptError;
      setDepartments(deptData || []);

      // Load users
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .order("name");

      if (userError) throw userError;
      setUsers(userData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load assignment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignee = async (deptId: string, userId: string) => {
    try {
      const dept = departments.find((d) => d.id === deptId);
      if (!dept) return;

      const updatedAssignees = [...dept.assignee_ids, userId];

      const { error } = await supabase
        .from("department_assignments")
        .update({ assignee_ids: updatedAssignees })
        .eq("id", deptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignee added successfully",
      });

      loadData();
    } catch (error: any) {
      console.error("Error adding assignee:", error);
      toast({
        title: "Error",
        description: "Failed to add assignee",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignee = async (deptId: string, userId: string) => {
    try {
      const dept = departments.find((d) => d.id === deptId);
      if (!dept) return;

      const updatedAssignees = dept.assignee_ids.filter((id) => id !== userId);

      const { error } = await supabase
        .from("department_assignments")
        .update({ assignee_ids: updatedAssignees })
        .eq("id", deptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignee removed successfully",
      });

      loadData();
    } catch (error: any) {
      console.error("Error removing assignee:", error);
      toast({
        title: "Error",
        description: "Failed to remove assignee",
        variant: "destructive",
      });
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.user_id === userId);
    return user?.name || user?.email || "Unknown";
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Department Assignments</CardTitle>
          <CardDescription>
            Manage who can contribute to each department's newsletter section
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {departments.map((dept) => (
            <div key={dept.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{dept.department}</h4>
                  {dept.allow_multiple_clinics && (
                    <Badge variant="outline" className="mt-1">
                      Multi-clinic
                    </Badge>
                  )}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDept(dept)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Assignee
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Assignee to {dept.department}</DialogTitle>
                    </DialogHeader>
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {users
                          .filter((user) => !dept.assignee_ids.includes(user.user_id))
                          .map((user) => (
                            <CommandItem
                              key={user.user_id}
                              onSelect={() => {
                                handleAddAssignee(dept.id, user.user_id);
                              }}
                            >
                              <div>
                                <p className="font-medium">{user.name || user.email}</p>
                                {user.name && (
                                  <p className="text-sm text-muted-foreground">
                                    {user.email}
                                  </p>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-wrap gap-2">
                {dept.assignee_ids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignees</p>
                ) : (
                  dept.assignee_ids.map((userId) => (
                    <Badge key={userId} variant="secondary" className="gap-1">
                      {getUserName(userId)}
                      <button
                        onClick={() => handleRemoveAssignee(dept.id, userId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}