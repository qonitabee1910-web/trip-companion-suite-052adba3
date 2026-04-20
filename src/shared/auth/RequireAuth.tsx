import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import type { AppRole } from "./AuthProvider";

interface Props {
  children: React.ReactNode;
  /** Optional required role. If omitted, only authentication is required. */
  role?: AppRole;
  /** Override redirect target when not authenticated. */
  redirectTo?: string;
  /** Driver-only: require verification_status === 'verified'. */
  requireVerified?: boolean;
}

const roleLabel: Record<AppRole, string> = {
  admin: "Admin",
  driver: "Driver",
  rider: "Customer",
};

export function RequireAuth({ children, role, redirectTo, requireVerified }: Props) {
  const { user, roles, loading, driverVerificationStatus } = useAuth();
  const location = useLocation();
  const toastedRef = useRef(false);

  const roleMismatch = !!user && role && !roles.includes(role);
  const verifiedMismatch =
    !!user && role === "driver" && requireVerified && driverVerificationStatus !== "verified";

  useEffect(() => {
    if (toastedRef.current) return;
    if (roleMismatch) {
      toastedRef.current = true;
      toast.error("Akses ditolak", {
        description: `Halaman ini hanya untuk ${roleLabel[role!]}.`,
      });
    } else if (verifiedMismatch) {
      toastedRef.current = true;
      toast.warning("Akun belum diverifikasi", {
        description: "Lengkapi dokumen SIM/STNK terlebih dahulu untuk mulai bekerja.",
      });
    }
  }, [roleMismatch, verifiedMismatch, role]);

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

  if (roleMismatch) {
    return <Navigate to="/" replace />;
  }

  if (verifiedMismatch) {
    return <Navigate to="/driver/profile" replace />;
  }

  return <>{children}</>;
}
