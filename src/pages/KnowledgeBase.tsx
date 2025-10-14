import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['kb-pages', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('kb_pages')
        .select('*')
        .eq('is_published', true);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">Find answers and documentation</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {!searchQuery && categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {category.name}
                  </CardTitle>
                </CardHeader>
                {category.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">
          {searchQuery ? 'Search Results' : 'Recent Articles'}
        </h2>
        <div className="space-y-4">
          {pages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? 'No articles found matching your search' : 'No articles available yet'}
              </CardContent>
            </Card>
          ) : (
            pages.map((page) => (
              <Card key={page.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{page.title}</CardTitle>
                </CardHeader>
                {page.excerpt && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{page.excerpt}</p>
                    <Button variant="link" className="px-0 mt-2">
                      Read more →
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
