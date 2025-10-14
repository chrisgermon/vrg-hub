import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Mail, Phone, MapPin, Building, User, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserProfileEditor } from '@/components/directory/UserProfileEditor';
import { DirectoryFilters } from '@/components/directory/DirectoryFilters';
import { ExportDirectoryButton } from '@/components/directory/ExportDirectoryButton';
import { usePermissions } from '@/hooks/usePermissions';

export default function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'position'>('name');
  const { company } = useAuth();
  const { hasPermission } = usePermissions();

  const { data: users, isLoading } = useQuery({
    queryKey: ['company-directory', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', company!.id)
        .eq('is_visible_in_directory', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.position?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || user.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortBy === 'department') {
      return (a.department || '').localeCompare(b.department || '');
    } else {
      return (a.position || '').localeCompare(b.position || '');
    }
  });

  // Get unique departments
  const departments = Array.from(
    new Set(users?.map(u => u.department).filter(Boolean) as string[])
  ).sort();

  const canManageDirectory = hasPermission('manage_company_directory');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Company Directory</h1>
          <p className="text-muted-foreground">
            Find and connect with {users?.length || 0} team members across the organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setProfileEditorOpen(true)} variant="outline">
            <User className="w-4 h-4 mr-2" />
            Edit My Profile
          </Button>
          {filteredUsers && filteredUsers.length > 0 && (
            <ExportDirectoryButton users={filteredUsers} />
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department, or position..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <DirectoryFilters
          departments={departments}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {selectedDepartment !== 'all' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Filtering by: <strong>{selectedDepartment}</strong>
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading directory...</p>
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.user_id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.profile_image_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {user.name ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{user.name}</h3>
                    {user.position && (
                      <p className="text-sm text-muted-foreground truncate">{user.position}</p>
                    )}
                    {user.department && (
                      <Badge variant="secondary" className="mt-2">
                        {user.department}
                      </Badge>
                    )}
                  </div>
                </div>

                {user.bio && (
                  <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                    {user.bio}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {user.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`mailto:${user.email}`}
                        className="text-primary hover:underline truncate"
                      >
                        {user.email}
                      </a>
                    </div>
                  )}

                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${user.phone}`}
                        className="text-primary hover:underline"
                      >
                        {user.phone}
                      </a>
                    </div>
                  )}

                  {user.mobile && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${user.mobile}`}
                        className="text-primary hover:underline"
                      >
                        {user.mobile} (Mobile)
                      </a>
                    </div>
                  )}

                  {user.office_location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground truncate">{user.office_location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members found matching your search.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <UserProfileEditor
        open={profileEditorOpen}
        onOpenChange={setProfileEditorOpen}
      />
    </div>
  );
}
