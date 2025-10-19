import { ModalityDetails } from '@/components/modality/ModalityDetails';
import { ServerAnalytics } from '@/components/modality/ServerAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ModalityManagement = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Modality Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage modalities, DICOM servers, and monitor server load
        </p>
      </div>

      <Tabs defaultValue="modalities" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modalities">Modalities & Sites</TabsTrigger>
          <TabsTrigger value="servers">Server Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="modalities">
          <ModalityDetails />
        </TabsContent>

        <TabsContent value="servers">
          <ServerAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModalityManagement;
