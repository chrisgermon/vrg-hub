import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DepartmentSection {
  name: string;
  key: string;
  isRequired: boolean;
}

export interface Department {
  name: string;
  sections: DepartmentSection[];
}

export const NEWSLETTER_DEPARTMENTS: Department[] = [
  {
    name: 'IT',
    sections: [
      { name: 'System performance', key: 'system_performance', isRequired: true },
      { name: 'Upgrades / new implementations', key: 'upgrades_implementations', isRequired: true },
      { name: 'Upcoming changes', key: 'upcoming_changes', isRequired: false },
      { name: 'Training & resources', key: 'training_resources', isRequired: false },
    ],
  },
  {
    name: 'Admin Managers',
    sections: [
      { name: 'Administration updates & highlights', key: 'admin_updates', isRequired: false },
      { name: 'Management initiatives & projects', key: 'management_initiatives', isRequired: false },
      { name: 'Process improvements & efficiencies', key: 'process_improvements', isRequired: false },
      { name: 'Upcoming changes & announcements', key: 'upcoming_changes', isRequired: false },
    ],
  },
  {
    name: 'CMO',
    sections: [
      { name: 'Clinical updates & initiatives', key: 'clinical_updates', isRequired: true },
      { name: 'Quality & safety highlights', key: 'quality_safety', isRequired: true },
      { name: 'Training & development', key: 'training_development', isRequired: false },
      { name: 'Upcoming changes', key: 'upcoming_changes', isRequired: false },
    ],
  },
  {
    name: 'Commercial/Marketing',
    sections: [
      { name: 'Marketing campaigns & activity', key: 'marketing_campaigns', isRequired: true },
      { name: 'Market insights & trends', key: 'market_insights', isRequired: true },
      { name: 'Upcoming initiatives', key: 'upcoming_initiatives', isRequired: false },
      { name: 'Partnership updates', key: 'partnership_updates', isRequired: false },
    ],
  },
  {
    name: 'Finance',
    sections: [
      { name: 'Financial summary & highlights', key: 'financial_summary', isRequired: true },
      { name: 'Budget updates & variances', key: 'budget_updates', isRequired: true },
      { name: 'Upcoming changes & initiatives', key: 'upcoming_changes', isRequired: false },
      { name: 'Cost savings & efficiencies', key: 'cost_savings', isRequired: false },
    ],
  },
  {
    name: 'HR / People & Culture / OHS',
    sections: [
      { name: 'People updates & announcements', key: 'people_updates', isRequired: true },
      { name: 'OHS & safety updates', key: 'ohs_safety', isRequired: true },
      { name: 'Training programs & initiatives', key: 'training_programs', isRequired: false },
      { name: 'Policy changes & reminders', key: 'policy_changes', isRequired: false },
    ],
  },
  {
    name: 'Operations Managers',
    sections: [
      { name: 'Operational highlights & achievements', key: 'operational_highlights', isRequired: true },
      { name: 'Performance metrics & KPIs', key: 'performance_metrics', isRequired: true },
      { name: 'Process improvements', key: 'process_improvements', isRequired: false },
      { name: 'Upcoming changes & initiatives', key: 'upcoming_changes', isRequired: false },
    ],
  },
  {
    name: 'Technical Partners',
    sections: [
      { name: 'Partnership updates & highlights', key: 'partnership_updates', isRequired: true },
      { name: 'Technical developments', key: 'technical_developments', isRequired: true },
      { name: 'Integration updates', key: 'integration_updates', isRequired: false },
      { name: 'Upcoming changes', key: 'upcoming_changes', isRequired: false },
    ],
  },
  {
    name: 'Workflow Manager',
    sections: [
      { name: 'Workflow improvements & optimizations', key: 'workflow_improvements', isRequired: true },
      { name: 'Efficiency metrics & performance', key: 'efficiency_metrics', isRequired: true },
      { name: 'Process changes', key: 'process_changes', isRequired: false },
      { name: 'Upcoming initiatives', key: 'upcoming_initiatives', isRequired: false },
    ],
  },
];

// Update lib to fetch from database
export const useDepartmentTemplate = (departmentName: string) => {
  return useQuery({
    queryKey: ['department-template', departmentName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_section_templates')
        .select('*')
        .eq('department_name', departmentName)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });
};

export const useDepartmentTemplates = () => {
  return useQuery({
    queryKey: ['department-section-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_section_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });
};

// Keep the old functions for backward compatibility but mark as deprecated
/**
 * @deprecated Use useDepartmentTemplate hook instead
 */
export const getDepartmentSections = (departmentName: string): DepartmentSection[] => {
  const dept = NEWSLETTER_DEPARTMENTS.find(d => d.name === departmentName);
  return dept?.sections || [];
};

/**
 * @deprecated Use useDepartmentTemplates hook instead
 */
export const getDepartmentNames = (): string[] => {
  return NEWSLETTER_DEPARTMENTS.map(d => d.name);
};
