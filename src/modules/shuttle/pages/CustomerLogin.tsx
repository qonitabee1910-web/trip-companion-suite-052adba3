import { Navigate, useLocation } from "react-router-dom";

/** Legacy customer login route — redirect to unified /auth. */
const CustomerLogin = () => {
  const loc = useLocation();
  const from = new URLSearchParams(loc.search).get("from") ?? "/shuttle/my-bookings";
  return <Navigate to={`/auth?from=${encodeURIComponent(from)}`} replace />;
};

export default CustomerLogin;
