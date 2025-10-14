export type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'location'
  | 'catalog_item';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: FieldOption[];
  validation?: FieldValidation;
  defaultValue?: any;
  conditionalLogic?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
  order: number;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  form_type: string;
  department?: string;
  sub_department?: string;
  fields: FormField[];
  settings?: {
    notification_emails?: string[];
    auto_assign?: boolean;
    require_approval?: boolean;
  };
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormBuilderProps {
  template?: FormTemplate;
  onSave: (template: Partial<FormTemplate>) => void;
  onCancel: () => void;
}

export interface DynamicFormProps {
  template: FormTemplate;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
}
