import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface RequestActivityFeedProps {
  requestId: string;
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

export function RequestActivityFeed({ requestId }: RequestActivityFeedProps) {
  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['request-comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
  });

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
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Activity & Updates</h3>

        {/* Comments list - preview only */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="group cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                <div className="flex gap-2 items-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {comment.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: comment.content_html || comment.content }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No activity yet
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
