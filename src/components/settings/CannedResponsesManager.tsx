import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export function CannedResponsesManager() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
  });
  const { company } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchResponses();
  }, [company?.id]);

  const fetchResponses = async () => {
    if (!company?.id) return;

    try {
      const { data, error } = await supabase
        .from("canned_responses")
        .select("*")
        .eq("company_id", company.id)
        .order("title");

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error("Error fetching canned responses:", error);
      toast({
        title: "Error",
        description: "Failed to load canned responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    try {
      if (editingResponse) {
        const { error } = await supabase
          .from("canned_responses")
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category || null,
          })
          .eq("id", editingResponse.id);

        if (error) throw error;
        toast({ title: "Success", description: "Canned response updated" });
      } else {
        const { error } = await supabase
          .from("canned_responses")
          .insert({
            company_id: company.id,
            title: formData.title,
            content: formData.content,
            category: formData.category || null,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Canned response created" });
      }

      setDialogOpen(false);
      setEditingResponse(null);
      setFormData({ title: "", content: "", category: "" });
      fetchResponses();
    } catch (error) {
      console.error("Error saving canned response:", error);
      toast({
        title: "Error",
        description: "Failed to save canned response",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (response: CannedResponse) => {
    setEditingResponse(response);
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this canned response?")) return;

    try {
      const { error } = await supabase
        .from("canned_responses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Canned response deleted" });
      fetchResponses();
    } catch (error) {
      console.error("Error deleting canned response:", error);
      toast({
        title: "Error",
        description: "Failed to delete canned response",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (response: CannedResponse) => {
    try {
      const { error } = await supabase
        .from("canned_responses")
        .update({ is_active: !response.is_active })
        .eq("id", response.id);

      if (error) throw error;
      fetchResponses();
    } catch (error) {
      console.error("Error toggling response status:", error);
      toast({
        title: "Error",
        description: "Failed to update response status",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Canned Responses</CardTitle>
            <CardDescription>
              Manage predefined responses for faster request handling
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingResponse(null);
                  setFormData({ title: "", content: "", category: "" });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Response
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingResponse ? "Edit" : "Create"} Canned Response
                  </DialogTitle>
                  <DialogDescription>
                    Create reusable response templates for common inquiries
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      required
                      placeholder="e.g., Request Received Acknowledgment"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      placeholder="e.g., Acknowledgment, Updates, Closure"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      required
                      rows={8}
                      placeholder="Enter the response template..."
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingResponse ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : responses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No canned responses yet. Create one to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Content Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell className="font-medium">{response.title}</TableCell>
                  <TableCell>
                    {response.category && (
                      <Badge variant="outline">{response.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {response.content}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(response)}
                    >
                      <Badge variant={response.is_active ? "default" : "secondary"}>
                        {response.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(response)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(response.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
