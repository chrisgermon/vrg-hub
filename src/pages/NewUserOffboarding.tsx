import { UserOffboardingRequestForm } from '@/components/user-accounts/UserOffboardingRequestForm';
import { PermissionGuard } from '@/components/PermissionGuard';

const NewUserOffboarding = () => {
  return (
    <PermissionGuard permission="create_user_offboarding_request">
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Request User Offboarding</h1>
          <p className="text-muted-foreground mt-2">
            Process user departure and revoke access rights
          </p>
        </div>
        <UserOffboardingRequestForm />
      </div>
    </PermissionGuard>
  );
};

export default NewUserOffboarding;
