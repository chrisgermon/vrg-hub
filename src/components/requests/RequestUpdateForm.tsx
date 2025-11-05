import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Send, Paperclip } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';

interface RequestUpdateFormProps {
  requestId: string;
}

export function RequestUpdateForm({ requestId }: RequestUpdateFormProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (newContent: string) => {
      if (!user || !profile) throw new Error('User not authenticated');

      // Upload attachments first if any
      const uploadedFiles: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${requestId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;
          uploadedFiles.push(fileName);
        }
      }

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
          attachments: uploadedFiles.length > 0 ? uploadedFiles : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket status to "in progress" if it's currently "new" or "open"
      const { data: ticket } = await supabase
        .from('tickets')
        .select('status')
        .eq('id', requestId)
        .single();

      if (ticket && (ticket.status === 'new' || ticket.status === 'open')) {
        await supabase
          .from('tickets')
          .update({ status: 'in_progress' })
          .eq('id', requestId);
      }

      // Send email notification in background (non-blocking)
      supabase.functions.invoke('notify-comment', {
        body: {
          requestId,
          commentId: data.id,
        },
      }).catch(err => console.error('Email notification error:', err));

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-comments', requestId] });
      setContent('');
      setAttachments([]);
      setShowAttachments(false);
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

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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
          
          {showAttachments && (
            <div className="space-y-2">
              <FileDropzone
                onFilesSelected={(files) => setAttachments(prev => [...prev, ...files])}
                multiple
                maxSize={10}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                description="Upload images, PDFs, or documents (max 10MB each)"
              />
              <FileList files={attachments} onRemove={handleRemoveAttachment} />
            </div>
          )}
          
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAttachments(!showAttachments)}
              className="gap-2"
            >
              <Paperclip className="h-4 w-4" />
              {showAttachments ? 'Hide' : 'Add'} Attachments
            </Button>
            
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
