import React, { useState, useEffect } from 'react';
import { formatAUDateTime } from '@/lib/dateUtils';
import { MessageSquare, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  name: string;
  email: string;
}

interface RequestComment {
  id: string;
  request_id: string;
  user_id: string;
  comment_text: string;
  request_type: string;
  is_internal: boolean;
  created_at: string;
  user_profile?: Profile;
}

interface RequestCommentsProps {
  requestId: string;
  requestType: 'hardware' | 'marketing' | 'user_account' | 'department' | 'toner';
}

export function RequestComments({ requestId, requestType }: RequestCommentsProps) {
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchComments();
  }, [requestId, requestType]);

  const fetchComments = async () => {
    try {
      // @ts-ignore - Bypass type issues with stale schema
      const { data: commentsData, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .eq('request_type', requestType)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles separately
      const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)));
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds as any);

      if (profilesError) throw profilesError;

      // Combine comments with profiles
      const profileMap = new Map(profilesData?.map((p: any) => [p.user_id, { name: p.name, email: p.email }]));
      const enrichedComments: RequestComment[] = commentsData.map((comment: any) => ({
        id: comment.id,
        request_id: comment.request_id,
        user_id: comment.user_id,
        comment_text: comment.comment_text,
        request_type: comment.request_type,
        is_internal: comment.is_internal || false,
        created_at: comment.created_at,
        user_profile: profileMap.get(comment.user_id)
      }));

      setComments(enrichedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const insertData = {
        request_id: requestId,
        request_type: requestType,
        user_id: user.id,
        comment_text: newComment.trim(),
        is_internal: false,
      };
      
      // @ts-ignore - Bypass type issues with stale schema
      const { data, error } = await (supabase as any)
        .from('request_comments')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Send notification
      try {
        await supabase.functions.invoke('notify-comment', {
          body: {
            commentId: data.id,
            requestType: requestType,
            requestId: requestId,
            commentText: data.comment_text,
            isInternal: data.is_internal,
          },
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the comment submission if notification fails
      }

      setNewComment('');
      fetchComments();
      toast({
        title: 'Comment Added',
        description: 'Your comment has been posted successfully.',
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments & Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading comments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments & Updates ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        {comments.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(comment.user_profile?.name, comment.user_profile?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.user_profile?.name || comment.user_profile?.email || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatAUDateTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            No comments yet. Be the first to add a comment!
          </div>
        )}

        {/* Add Comment Form */}
        {user && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {getUserInitials(profile?.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Add a comment or update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                size="sm"
                variant="default"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
