import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatAUDateTime } from "@/lib/dateUtils";
import { CannedResponseSelector } from "./CannedResponseSelector";
import { Clock, User, FileText } from "lucide-react";

interface Profile {
  name: string;
  email: string;
}

interface RequestComment {
  id: string;
  request_id: string;
  user_id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  user_profile?: Profile;
}

interface StatusHistoryItem {
  id: string;
  status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  user_profile?: Profile;
}

interface RequestActivityProps {
  requestId: string;
  requestType: 'hardware' | 'marketing' | 'user_account' | 'department' | 'toner';
}

export function RequestActivity({ requestId, requestType }: RequestActivityProps) {
  const [activeTab, setActiveTab] = useState("comments");
  const [replyType, setReplyType] = useState<"customer" | "internal">("customer");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
    fetchStatusHistory();
  }, [requestId, requestType]);

  const fetchComments = async () => {
    try {
      // @ts-ignore - Type mismatch with stale types
      const { data: commentsData, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .eq('request_type', requestType)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds as any);

      const profileMap = new Map(profilesData?.map((p: any) => [p.user_id, { name: p.name, email: p.email }]));
      const enrichedComments: RequestComment[] = commentsData.map((comment: any) => ({
        id: comment.id,
        request_id: comment.request_id,
        user_id: comment.user_id,
        comment_text: comment.comment_text,
        is_internal: comment.is_internal || false,
        created_at: comment.created_at,
        user_profile: profileMap.get(comment.user_id)
      }));

      setComments(enrichedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('request_status_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setStatusHistory([]);
        return;
      }

      const userIds = Array.from(new Set(data.filter(h => h.changed_by).map(h => h.changed_by)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds as any);

      const profileMap = new Map(profilesData?.map((p: any) => [p.user_id, { name: p.name, email: p.email }]));
      const enrichedHistory = data.map(item => ({
        ...item,
        user_profile: item.changed_by ? profileMap.get(item.changed_by) : undefined
      }));

      setStatusHistory(enrichedHistory as StatusHistoryItem[]);
    } catch (error) {
      console.error('Error fetching status history:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!comment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { data: newComment, error } = await (supabase as any)
        .from('request_comments')
        .insert({
          request_id: requestId,
          request_type: requestType,
          user_id: user.id,
          comment_text: comment,
          is_internal: replyType === "internal"
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification for any reply (customer or internal)
      if (newComment) {
        try {
          await supabase.functions.invoke('notify-comment', {
            body: {
              commentId: newComment.id,
              requestId: requestId,
              requestType: requestType,
              commentText: comment,
              isInternal: replyType === "internal",
            },
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't fail the comment submission if email fails
        }
      }

      toast({
        title: "Success",
        description: replyType === "internal" ? "Internal note added" : "Reply sent to customer",
      });

      setComment("");
      fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: "Error",
        description: "Failed to submit comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Activity</h3>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="space-y-4">
            {[...comments, ...statusHistory].length === 0 ? (
              <Card className="p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No activity yet</p>
                  <p className="text-xs text-muted-foreground">
                    Comments and status changes will appear here
                  </p>
                </div>
              </Card>
            ) : (
              [...comments, ...statusHistory]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((item) => {
                  const isComment = 'comment_text' in item;
                  return (
                    <Card key={item.id} className="p-4">
                      <div className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(item.user_profile?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{item.user_profile?.name || "Unknown User"}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatAUDateTime(item.created_at)}
                            </span>
                          </div>
                          {isComment ? (
                            <>
                              {(item as RequestComment).is_internal && (
                                <Badge variant="secondary" className="text-xs">Internal Note</Badge>
                              )}
                              <p className="text-sm">{(item as RequestComment).comment_text}</p>
                            </>
                          ) : (
                            <p className="text-sm">
                              Status changed to <Badge variant="outline">{(item as StatusHistoryItem).status}</Badge>
                              {(item as StatusHistoryItem).notes && (
                                <span className="block mt-1 text-muted-foreground">{(item as StatusHistoryItem).notes}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {/* Reply Section */}
          <Card className="p-4">
            <div className="flex gap-3">
              <Avatar>
                <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="flex gap-2 border-b">
                  <button
                    onClick={() => setReplyType("internal")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      replyType === "internal"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Add internal note
                  </button>
                  <button
                    onClick={() => setReplyType("customer")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      replyType === "customer"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Reply to customer
                  </button>
                </div>

                <Textarea
                  placeholder={
                    replyType === "internal"
                      ? "Add an internal note..."
                      : "Type your reply to the customer..."
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={6}
                  className="resize-none"
                />

                <div className="flex items-center justify-between">
                  <CannedResponseSelector onSelect={setComment} />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setComment("")}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitComment} disabled={!comment.trim() || submitting}>
                      {submitting ? "Sending..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <Card className="p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <FileText className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No comments yet</p>
                  <p className="text-xs text-muted-foreground">
                    Start the conversation by adding a comment above
                  </p>
                </div>
              </Card>
            ) : (
              comments.map((comment) => (
                <Card key={comment.id} className="p-4">
                  <div className="flex gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(comment.user_profile?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{comment.user_profile?.name || "Unknown User"}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatAUDateTime(comment.created_at)}
                        </span>
                      </div>
                      {comment.is_internal && (
                        <Badge variant="secondary" className="text-xs">Internal Note</Badge>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {statusHistory.length === 0 ? (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <Clock className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm font-medium">No status changes yet</p>
                <p className="text-xs text-muted-foreground">
                  Status changes and updates will appear here
                </p>
              </div>
            </Card>
          ) : (
            statusHistory.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-3">
                  <div className="mt-1">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        <span className="font-medium">{item.user_profile?.name || "System"}</span>
                        {" changed status to "}
                        <Badge variant="outline">{item.status}</Badge>
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatAUDateTime(item.created_at)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Approval workflow information will appear here.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
