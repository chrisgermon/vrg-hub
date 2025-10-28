import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface RequestUpdateFormProps {
  requestId: string;
}

export function RequestUpdateForm({ requestId }: RequestUpdateFormProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      toast.success('Update added successfully');
    },
    onError: (error: any) => {
      console.error('Error adding update:', error);
      toast.error('Failed to add update');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Update</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Add a comment or update..."
            className="min-h-[200px]"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!content.trim() || content === '<p><br></p>' || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Update
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
