import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedEmail } from "@/lib/allowlist";
import { toast } from "sonner";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enforceAllowlist = (s: Session | null): Session | null => {
      const email = s?.user?.email;
      if (s && !isAllowedEmail(email)) {
        // Reject session — sign out async, don't expose user
        supabase.auth.signOut();
        toast.error("Access denied. This account is not authorized.");
        return null;
      }
      return s;
    };

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const allowed = enforceAllowlist(newSession);
      setSession(allowed);
      setUser(allowed?.user ?? null);
      setLoading(false);
    });

    // THEN fetch existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      const allowed = enforceAllowlist(existing);
      setSession(allowed);
      setUser(allowed?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
