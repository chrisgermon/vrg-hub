import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DynamicFormProps, FormField as FormFieldType } from '@/types/form-builder';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationSelect } from '@/components/ui/location-select';
import { CatalogQuickSelect } from '@/components/requests/CatalogQuickSelect';

function buildZodSchema(fields: FormFieldType[]) {
  const shape: Record<string, any> = {};

  fields.forEach((field) => {
    let validator: any;

    switch (field.type) {
      case 'email':
        validator = z.string().email('Invalid email address');
        break;
      case 'number':
        validator = z.coerce.number();
        if (field.validation?.min) validator = validator.min(field.validation.min);
        if (field.validation?.max) validator = validator.max(field.validation.max);
        break;
      case 'phone':
        validator = z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Invalid phone number');
        break;
      case 'checkbox':
        validator = z.boolean();
        break;
      case 'multiselect':
        validator = z.array(z.string());
        break;
      default:
        validator = z.string();
        if (field.validation?.min) {
          validator = validator.min(field.validation.min, `Minimum ${field.validation.min} characters`);
        }
        if (field.validation?.max) {
          validator = validator.max(field.validation.max, `Maximum ${field.validation.max} characters`);
        }
    }

    if (field.required) {
      if (field.type === 'checkbox') {
        validator = validator.refine((val: boolean) => val === true, {
          message: `${field.label} is required`,
        });
      } else {
        validator = validator.min(1, `${field.label} is required`);
      }
    } else {
      validator = validator.optional();
    }

    shape[field.id] = validator;
  });

  return z.object(shape);
}

export function DynamicFormRenderer({ template, onSubmit, isSubmitting }: DynamicFormProps) {
  const schema = buildZodSchema(template.fields);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: template.fields.reduce((acc, field) => {
      acc[field.id] = field.defaultValue || '';
      return acc;
    }, {} as Record<string, any>),
  });

  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

  const renderField = (field: FormFieldType) => {
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {(() => {
                switch (field.type) {
                  case 'textarea':
                    return (
                      <Textarea
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    );
                  case 'select':
                    return (
                      <Select onValueChange={formField.onChange} value={formField.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || 'Select an option'} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => {
                            const optionValue = typeof option === 'string' ? option : option.value;
                            const optionLabel = typeof option === 'string' ? option : option.label;
                            return (
                              <SelectItem key={optionValue} value={optionValue}>
                                {optionLabel}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    );
                  case 'radio':
                    return (
                      <RadioGroup onValueChange={formField.onChange} value={formField.value}>
                        {field.options?.map((option) => {
                          const optionValue = typeof option === 'string' ? option : option.value;
                          const optionLabel = typeof option === 'string' ? option : option.label;
                          return (
                            <div key={optionValue} className="flex items-center space-x-2">
                              <RadioGroupItem value={optionValue} id={`${field.id}-${optionValue}`} />
                              <label htmlFor={`${field.id}-${optionValue}`}>{optionLabel}</label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    );
                  case 'multiselect':
                    return (
                      <div className="space-y-2">
                        {field.options?.map((option) => {
                          const optionValue = typeof option === 'string' ? option : option.value;
                          const optionLabel = typeof option === 'string' ? option : option.label;
                          return (
                            <div key={optionValue} className="flex items-center space-x-2">
                              <Checkbox
                                checked={(formField.value as string[] || []).includes(optionValue)}
                                onCheckedChange={(checked) => {
                                  const currentValues = (formField.value as string[]) || [];
                                  if (checked) {
                                    formField.onChange([...currentValues, optionValue]);
                                  } else {
                                    formField.onChange(currentValues.filter(v => v !== optionValue));
                                  }
                                }}
                                id={`${field.id}-${optionValue}`}
                              />
                              <label htmlFor={`${field.id}-${optionValue}`}>{optionLabel}</label>
                            </div>
                          );
                        })}
                      </div>
                    );
                  case 'checkbox':
                    return (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={formField.value}
                          onCheckedChange={formField.onChange}
                        />
                      </div>
                    );
                  case 'location':
                    return (
                      <Input
                        placeholder="Enter location"
                        value={formField.value}
                        onChange={(e) => formField.onChange(e.target.value)}
                      />
                    );
                  case 'catalog_item':
                    return (
                      <CatalogQuickSelect
                        onSelect={(item) => formField.onChange(item.id)}
                      />
                    );
                  default:
                    return (
                      <Input
                        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    );
                }
              })()}
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {sortedFields.map(renderField)}
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </form>
    </Form>
  );
}
