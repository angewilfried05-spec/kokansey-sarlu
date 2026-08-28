import { Navigate, useLocation } from "react-router-dom";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token");
  return Boolean(token && token.length > 0);
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
