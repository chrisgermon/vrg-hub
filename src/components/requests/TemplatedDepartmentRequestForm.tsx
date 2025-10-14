import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { DepartmentRequestForm } from './DepartmentRequestForm';
import { DynamicDepartmentRequestForm } from './DynamicDepartmentRequestForm';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { FormField } from '@/types/form-builder';

interface TemplatedDepartmentRequestFormProps {
  department: string;
  departmentLabel: string;
  onSuccess?: () => void;
}

export function TemplatedDepartmentRequestForm({
  department,
  departmentLabel,
  onSuccess,
}: TemplatedDepartmentRequestFormProps) {
  const { selectedCompany: company } = useCompanyContext();

  // Fetch the form template for this department (latest first, fuzzy by department)
  const { data: template, isLoading } = useQuery({
    queryKey: ['form-template', company?.id, 'department', department],
    queryFn: async () => {
      if (!company?.id) return null;

      const pattern = `%${department.replace(/[_\s-]+/g, '%')}%`;

      // Prefer the most recently updated company template
      const { data: templates, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('company_id', company.id)
        .ilike('department', pattern)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      let data = templates?.[0] ?? null;
      if (error) {
        console.warn('Error fetching form_templates:', error.message);
      }

      // Fallback to legacy department_templates if not found
      if (!data) {
        const { data: legacyTemplates, error: legacyErr } = await supabase
          .from('department_templates')
          .select('*')
          .ilike('department', pattern)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (!legacyErr && legacyTemplates && legacyTemplates.length > 0) {
          data = legacyTemplates[0] as any;
        }
      }

      if (!data) {
        console.warn(`No form template found for department: ${department} (company ${company.id})`);
      }
      return data;
    },
    enabled: !!company?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If we have a template, use dynamic form
  if (template) {
    const templateWithFields = {
      ...template,
      fields: (template.fields as any) as FormField[],
      settings: (template.settings as any) || {},
    };
    
    return (
      <DynamicDepartmentRequestForm
        template={templateWithFields as any}
        department={department}
        departmentLabel={departmentLabel}
        onSuccess={onSuccess}
      />
    );
  }

  // Fallback to basic form if no template
  return (
    <DepartmentRequestForm
      department={department}
      departmentLabel={departmentLabel}
      subDepartments={[]}
      onSuccess={onSuccess}
    />
  );
}
