import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./useAuth";
import type { AppRole } from "./AuthProvider";

interface Props {
  children: React.ReactNode;
  /** Optional required role. If omitted, only authentication is required. */
  role?: AppRole;
  /** Override redirect target when not authenticated. */
  redirectTo?: string;
}

export function RequireAuth({ children, role, redirectTo }: Props) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const target = redirectTo ?? `/auth?from=${encodeURIComponent(location.pathname)}${role ? `&role=${role}` : ""}`;
    return <Navigate to={target} replace state={{ from: location.pathname }} />;
  }

  if (role && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
