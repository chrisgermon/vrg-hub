import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function CycleManagement({ onCycleCreated }: { onCycleCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [month, setMonth] = useState("");

  // Calculate third week Friday (between 15th-21st)
  const calculateDueDate = (yearMonth: string): Date => {
    const [year, monthNum] = yearMonth.split("-").map(Number);
    
    // Start from the 15th
    let dueDate = new Date(year, monthNum - 1, 15);
    
    // Find the Friday in range 15-21
    while (dueDate.getDay() !== 5 || dueDate.getDate() > 21) {
      dueDate.setDate(dueDate.getDate() + 1);
      if (dueDate.getDate() > 21) {
        // If no Friday in range, use the closest Friday >= 15th
        dueDate = new Date(year, monthNum - 1, 15);
        while (dueDate.getDay() !== 5) {
          dueDate.setDate(dueDate.getDate() + 1);
        }
        break;
      }
    }
    
    // Set to 23:59 Melbourne time
    dueDate.setHours(23, 59, 59, 999);
    return dueDate;
  };

  const handleCreateCycle = async () => {
    if (!month) {
      toast({
        title: "Error",
        description: "Please select a month",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);

      const [year, monthNum] = month.split("-").map(Number);
      
      // Open date: 1st of the month at 00:00
      const openAt = new Date(year, monthNum - 1, 1, 0, 0, 0);
      
      // Due date: Third week Friday at 23:59
      const dueAt = calculateDueDate(month);
      
      // Compilation window: First week of following month
      const compileStart = new Date(year, monthNum, 1, 0, 0, 0);
      const compileEnd = new Date(year, monthNum, 7, 23, 59, 59);

      const { data, error } = await supabase
        .from("newsletter_cycles")
        .insert({
          month,
          status: "open",
          open_at: openAt.toISOString(),
          due_at: dueAt.toISOString(),
          compile_window_start: compileStart.toISOString(),
          compile_window_end: compileEnd.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Notify all assigned users
      try {
        await supabase.functions.invoke('notify-newsletter-cycle-created', {
          body: { cycleId: data.id },
        });
      } catch (notifyError) {
        console.error('Failed to send notifications:', notifyError);
        // Don't fail the whole operation if notifications fail
      }

      toast({
        title: "Success",
        description: `Newsletter cycle for ${month} has been created`,
      });

      setOpen(false);
      setMonth("");
      onCycleCreated();
    } catch (error: any) {
      console.error("Error creating cycle:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create cycle",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Create New Cycle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Newsletter Cycle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="Select month"
            />
            {month && (
              <p className="text-sm text-muted-foreground">
                Due date will be: {calculateDueDate(month).toLocaleDateString("en-AU", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "Australia/Melbourne",
                })} at 11:59 PM AEDT
              </p>
            )}
          </div>
          <Button onClick={handleCreateCycle} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create Cycle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}