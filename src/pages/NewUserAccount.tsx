import { UserAccountRequestForm } from '@/components/user-accounts/UserAccountRequestForm';
import { PermissionGuard } from '@/components/PermissionGuard';

const NewUserAccount = () => {
  return (
    <PermissionGuard permission="create_user_account_request">
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Request New User Account</h1>
          <p className="text-muted-foreground mt-2">
            Create a new Active Directory user account request
          </p>
        </div>
        <UserAccountRequestForm />
      </div>
    </PermissionGuard>
  );
};

export default NewUserAccount;