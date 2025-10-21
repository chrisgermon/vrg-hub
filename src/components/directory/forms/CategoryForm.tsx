import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { DirectoryCategory } from '@/types/directory';

interface CategoryFormProps {
  category: DirectoryCategory;
  onSave: (category: DirectoryCategory) => void;
  onCancel: () => void;
}

export function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState(category);

  return (
    <div className="space-y-4">
      <div>
        <Label>Category Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Melbourne Clinics"
        />
      </div>

      <div>
        <Label>Category Type</Label>
        <Select
          value={formData.category_type}
          onValueChange={(value: 'clinic' | 'contact') =>
            setFormData({ ...formData, category_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="clinic">Clinic</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
