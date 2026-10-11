import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Loader from "../common/Loader";

export default function AuthRedirect() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
