import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestTypes(departmentId?: string) {
  return useQuery({
    queryKey: ['request_types', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('request_types')
        .select('*, department:departments(name)')
        .order('name');
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members(
            id,
            user_id,
            role_in_team,
            workload_capacity,
            out_of_office_from,
            out_of_office_to,
            timezone,
            user:profiles(full_name, email)
          )
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useRoutingRules(requestTypeId?: string) {
  return useQuery({
    queryKey: ['routing_rules', requestTypeId],
    queryFn: async () => {
      let query = supabase
        .from('routing_rules')
        .select(`
          *,
          request_type:request_types(name),
          team:teams(name)
        `)
        .order('priority');
      
      if (requestTypeId) {
        query = query.eq('request_type_id', requestTypeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTickets(filters?: any) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          request_type:request_types(name, department:departments(name)),
          assigned_team:teams(name)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.request_type_id) query = query.eq('request_type_id', filters.request_type_id);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTicketEvents(ticketId: string) {
  return useQuery({
    queryKey: ['ticket_events', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('departments').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating department', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('departments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating department', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateRequestType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('request_types').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_types'] });
      toast({ title: 'Request type created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating request type', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRequestType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('request_types').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_types'] });
      toast({ title: 'Request type updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating request type', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('teams').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating team', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('routing_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing_rules'] });
      toast({ title: 'Routing rule updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating routing rule', description: error.message, variant: 'destructive' });
    },
  });
}
