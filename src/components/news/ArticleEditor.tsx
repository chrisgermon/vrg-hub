import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ArticleEditorProps {
  articleId?: string;
  onSave?: () => void;
}

export default function ArticleEditor({ articleId: propArticleId, onSave }: ArticleEditorProps) {
  const { id: paramId } = useParams();
  const id = propArticleId || paramId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');

  useEffect(() => {
    if (id) {
      loadArticle();
    }
  }, [id]);

  const loadArticle = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setExcerpt(data.excerpt || '');
        setContent(data.content);
        setIsPublished(data.is_published);
        setFeaturedImageUrl(data.featured_image_url || '');
      }
    } catch (error) {
      console.error('Error loading article:', error);
      toast({
        title: 'Error',
        description: 'Failed to load article',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const articleData = {
        title,
        excerpt,
        content,
        is_published: isPublished,
        featured_image_url: featuredImageUrl || null,
        author_id: user.id,
        ...(isPublished && !id ? { published_at: new Date().toISOString() } : {}),
      };

      if (id) {
        // Update existing
        const { error } = await supabase
          .from('news_articles')
          .update(articleData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Article updated successfully',
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('news_articles')
          .insert([articleData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Article created successfully',
        });
      }

      if (onSave) {
        onSave();
      } else {
        navigate('/news-management');
      }
    } catch (error) {
      console.error('Error saving article:', error);
      toast({
        title: 'Error',
        description: 'Failed to save article',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>{id ? 'Edit Article' : 'Create Article'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary of the article"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Article content"
              rows={12}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="featured-image">Featured Image URL</Label>
            <Input
              id="featured-image"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Publish article</Label>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onSave ? onSave() : navigate('/news-management')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {id ? 'Update' : 'Create'} Article
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
