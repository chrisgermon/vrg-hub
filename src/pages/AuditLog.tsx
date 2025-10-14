import { AuditLogViewer } from '@/components/AuditLogViewer';
import { SystemEmailLogs } from '@/components/SystemEmailLogs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Mail } from 'lucide-react';

export default function AuditLog() {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Logs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer />
        </TabsContent>
        <TabsContent value="emails" className="mt-6">
          <SystemEmailLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
