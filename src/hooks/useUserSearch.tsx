import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserSearchResult {
  id: string;
  value: string; // email
  label: string; // display name
  email: string;
  full_name: string | null;
}

export function useUserSearch(query: string, enabled: boolean = true) {
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !query || query.length < 2) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
          .eq('is_active', true)
          .limit(10);

        if (error) throw error;

        const results: UserSearchResult[] = (data || []).map(user => ({
          id: user.id,
          value: user.email,
          label: user.full_name || user.email,
          email: user.email,
          full_name: user.full_name,
        }));

        setUsers(results);
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query, enabled]);

  return { users, loading };
}
