import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRBACPermissions } from '@/hooks/useRBACPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface RBACProtectedRouteProps {
  children: ReactNode;
  resource: string;
  action: string;
  fallback?: ReactNode;
}

export function RBACProtectedRoute({ children, resource, action, fallback }: RBACProtectedRouteProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const { checkPermission } = useRBACPermissions();
  const navigate = useNavigate();

  useEffect(() => {
    checkPermission(resource, action).then(result => {
      setAllowed(result.allowed);
      if (!result.allowed && !fallback) {
        navigate('/home');
      }
    });
  }, [resource, action]);

  if (allowed === null) {
    return <div>Loading...</div>;
  }

  if (!allowed) {
    return fallback || (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this resource.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
