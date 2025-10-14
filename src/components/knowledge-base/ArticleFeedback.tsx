import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ThumbsUp, ThumbsDown, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ArticleFeedbackProps {
  pageId: string;
}

export function ArticleFeedback({ pageId }: ArticleFeedbackProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const feedbackMutation = useMutation({
    mutationFn: async (data: { type: string; comment?: string }) => {
      const { error } = await supabase
        .from("knowledge_base_feedback")
        .insert({
          page_id: pageId,
          user_id: profile?.user_id!,
          feedback_type: data.type,
          comment: data.comment,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-feedback", pageId] });
      toast.success("Thank you for your feedback!");
      setComment("");
      setIsDialogOpen(false);
      setSelectedType(null);
    },
    onError: () => {
      toast.error("Failed to submit feedback");
    },
  });

  const handleQuickFeedback = (type: string) => {
    feedbackMutation.mutate({ type });
  };

  const handleDetailedFeedback = () => {
    if (!selectedType) return;
    feedbackMutation.mutate({
      type: selectedType,
      comment: comment || undefined,
    });
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <p className="text-sm font-medium">Was this article helpful?</p>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFeedback("helpful")}
        >
          <ThumbsUp className="h-4 w-4 mr-2" />
          Helpful
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFeedback("not_helpful")}
        >
          <ThumbsDown className="h-4 w-4 mr-2" />
          Not Helpful
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Provide Feedback
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provide Detailed Feedback</DialogTitle>
              <DialogDescription>
                Help us improve this article by sharing your thoughts
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedType === "needs_update" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType("needs_update")}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Needs Update
                </Button>
                
                <Button
                  variant={selectedType === "unclear" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType("unclear")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Unclear
                </Button>
              </div>
              
              <Textarea
                placeholder="Additional comments (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
              
              <Button
                onClick={handleDetailedFeedback}
                disabled={!selectedType || feedbackMutation.isPending}
                className="w-full"
              >
                Submit Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}