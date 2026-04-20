import { Navigate } from "react-router-dom";

/** Legacy driver login route — redirect to unified /auth with driver role. */
const DriverLogin = () => {
  return <Navigate to="/auth?role=driver&from=%2Fdriver" replace />;
};

export default DriverLogin;
