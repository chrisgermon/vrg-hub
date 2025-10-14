import { UserOffboardingRequestForm } from '@/components/user-accounts/UserOffboardingRequestForm';

const NewUserOffboarding = () => {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Request User Offboarding</h1>
        <p className="text-muted-foreground mt-2">
          Process user departure and revoke access rights
        </p>
      </div>
      <UserOffboardingRequestForm />
    </div>
  );
};

export default NewUserOffboarding;
