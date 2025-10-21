import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DirectoryCategory, Clinic, Contact } from '@/types/directory';
import { toast } from 'sonner';

export function useDirectory(brandId?: string) {
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!brandId) return;
    
    setIsLoading(true);
    try {
      const [categoriesRes, clinicsRes, contactsRes] = await Promise.all([
        supabase
          .from('directory_categories')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('directory_clinics')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('directory_contacts')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('sort_order')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (clinicsRes.error) throw clinicsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setCategories((categoriesRes.data || []).map(c => ({
        ...c,
        category_type: c.category_type as 'clinic' | 'contact'
      })));
      setClinics((clinicsRes.data || []).map(c => ({
        ...c,
        extensions: c.extensions as any as import('@/types/directory').Extension[]
      })));
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('Error fetching directory data:', error);
      toast.error('Failed to load directory data');
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  return {
    categories,
    clinics,
    contacts,
    isLoading,
    fetchData,
  };
}
