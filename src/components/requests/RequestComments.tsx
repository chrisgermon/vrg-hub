import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface RequestCommentsProps {
  requestId: string;
  requestType: string;
}

interface Comment {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  content_html: string | null;
  is_internal: boolean;
  created_at: string;
  user_id: string | null;
}

export function RequestComments({ requestId, requestType }: RequestCommentsProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['request-comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (newContent: string) => {
      if (!user || !profile) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('request_comments')
        .insert({
          request_id: requestId,
          user_id: user.id,
          author_name: profile.full_name || profile.email,
          author_email: profile.email,
          content: newContent,
          content_html: newContent,
          is_internal: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification via edge function
      await supabase.functions.invoke('notify-comment', {
        body: {
          requestId,
          commentId: data.id,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-comments', requestId] });
      setContent('');
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment.mutateAsync(content);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Request Activity</h3>
        </div>

        {/* Comments list */}
        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {comment.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{comment.author_name}</span>
                      {comment.is_internal && (
                        <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded">
                          Internal
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Be the first to add a comment.
            </p>
          )}
        </div>

        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment or update..."
            className="min-h-[100px]"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Add Comment
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
