import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  cycleId: string;
  department?: string;
  type: 'opening' | 'day_10' | 'day_7' | 'day_3' | 'day_1' | 'past_due' | 'escalation';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cycleId, department, type }: ReminderRequest = await req.json();

    console.log('Sending reminders:', { cycleId, department, type });

    // Get cycle details
    const { data: cycle, error: cycleError } = await supabase
      .from('newsletter_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (cycleError) throw cycleError;

    // Get departments to remind
    let departmentsToRemind = [];
    if (department) {
      departmentsToRemind = [department];
    } else {
      // Get all departments
      const { data: assignments } = await supabase
        .from('department_assignments')
        .select('department, assignee_ids');
      
      // Filter out departments that have submitted
      const { data: submissions } = await supabase
        .from('newsletter_submissions')
        .select('department')
        .eq('cycle_id', cycleId)
        .eq('status', 'submitted');

      const submittedDepts = submissions?.map(s => s.department) || [];
      departmentsToRemind = (assignments || [])
        .filter(a => !submittedDepts.includes(a.department))
        .map(a => a.department);
    }

    console.log('Departments to remind:', departmentsToRemind);

    // For each department, get assignees and send reminders
    for (const dept of departmentsToRemind) {
      const { data: assignment } = await supabase
        .from('department_assignments')
        .select('assignee_ids')
        .eq('department', dept)
        .single();

      if (!assignment?.assignee_ids?.length) continue;

      // Get user emails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .in('user_id', assignment.assignee_ids);

      // Log reminders (in production, send actual emails via Resend)
      for (const profile of profiles || []) {
        console.log(`Would send ${type} reminder to ${profile.email} for ${dept}`);
        
        // Log reminder
        await supabase.from('newsletter_reminder_logs').insert({
          cycle_id: cycleId,
          department: dept,
          user_id: profile.user_id,
          channel: 'email',
          type,
          metadata: {
            cycle_month: cycle.month,
            due_date: cycle.due_at,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminded: departmentsToRemind.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});