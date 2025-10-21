import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2 } from 'lucide-react';
import { Clinic, DirectoryCategory } from '@/types/directory';

interface ClinicFormProps {
  clinic: Clinic;
  categories: DirectoryCategory[];
  onSave: (clinic: Clinic) => void;
  onCancel: () => void;
}

export function ClinicForm({ clinic, categories, onSave, onCancel }: ClinicFormProps) {
  const [formData, setFormData] = useState<Clinic>(clinic);
  const [extensionInput, setExtensionInput] = useState({ name: '', number: '' });

  const addExtension = () => {
    if (extensionInput.name && extensionInput.number) {
      setFormData({
        ...formData,
        extensions: [...formData.extensions, extensionInput]
      });
      setExtensionInput({ name: '', number: '' });
    }
  };

  const removeExtension = (index: number) => {
    setFormData({
      ...formData,
      extensions: formData.extensions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <Label>Category</Label>
        <Select
          value={formData.category_id}
          onValueChange={(value) => setFormData({ ...formData, category_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id!}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Clinic Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <Label>Phone</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div>
        <Label>Address</Label>
        <Textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div>
        <Label>Fax</Label>
        <Input
          value={formData.fax}
          onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
        />
      </div>

      <div>
        <Label>Extensions</Label>
        <div className="space-y-2">
          {formData.extensions.map((ext, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input value={ext.name} disabled />
              <Input value={ext.number} disabled className="w-24" />
              <Button variant="outline" size="sm" onClick={() => removeExtension(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Name (e.g. Reception 1)"
              value={extensionInput.name}
              onChange={(e) => setExtensionInput({ ...extensionInput, name: e.target.value })}
            />
            <Input
              placeholder="Number"
              value={extensionInput.number}
              onChange={(e) => setExtensionInput({ ...extensionInput, number: e.target.value })}
              className="w-24"
            />
            <Button onClick={addExtension}>Add</Button>
          </div>
        </div>
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
