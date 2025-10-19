import { useState } from 'react';
import { Plus, Edit2, Trash2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDepartments, useRequestTypes, useCreateDepartment, useUpdateDepartment, useCreateRequestType, useUpdateRequestType } from '@/hooks/useTicketingSystem';

export function DepartmentRequestTypeManager() {
  const { data: departments, isLoading: loadingDepts } = useDepartments();
  const { data: requestTypes, isLoading: loadingTypes } = useRequestTypes();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  if (loadingDepts || loadingTypes) return <div>Loading...</div>;

  const filteredTypes = selectedDept
    ? requestTypes?.filter(rt => rt.department_id === selectedDept)
    : requestTypes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Departments & Request Types</h3>
          <p className="text-sm text-muted-foreground">Manage request categories and types</p>
        </div>
        <div className="flex gap-2">
          <DepartmentDialog />
          <RequestTypeDialog departments={departments || []} />
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedDept || 'all'} onValueChange={(v) => setSelectedDept(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments?.map((dept) => (
          <Card key={dept.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{dept.name}</CardTitle>
                  {dept.description && (
                    <CardDescription className="mt-1 text-sm">{dept.description}</CardDescription>
                  )}
                </div>
                <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                  {dept.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Request Types:</div>
                {requestTypes?.filter(rt => rt.department_id === dept.id).map(rt => (
                  <div key={rt.id} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">{rt.name}</span>
                    <Badge variant={rt.is_active ? 'outline' : 'secondary'} className="text-xs">
                      {rt.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DepartmentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const createDepartment = useCreateDepartment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDepartment.mutateAsync({ name, description, is_active: isActive });
    setOpen(false);
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Department
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button type="submit" className="w-full">Create Department</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestTypeDialog({ departments }: { departments: any[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const createRequestType = useCreateRequestType();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRequestType.mutateAsync({
      name,
      description,
      department_id: departmentId,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      is_active: isActive,
    });
    setOpen(false);
    setName('');
    setDescription('');
    setSlug('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FolderPlus className="mr-2 h-4 w-4" />
          New Request Type
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Request Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="department">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button type="submit" className="w-full">Create Request Type</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
