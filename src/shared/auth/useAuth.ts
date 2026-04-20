import { useAuthContext, type AppRole } from "./AuthProvider";

export function useAuth() {
  const ctx = useAuthContext();
  const has = (r: AppRole) => ctx.roles.includes(r);
  return {
    ...ctx,
    isAuthenticated: !!ctx.user,
    isCustomer: !!ctx.user && !has("driver") && !has("admin"),
    isDriver: has("driver"),
    isAdmin: has("admin"),
  };
}
