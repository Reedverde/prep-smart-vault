import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Logo size="lg" />
      </div>
    );
  }

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

export default Index;
