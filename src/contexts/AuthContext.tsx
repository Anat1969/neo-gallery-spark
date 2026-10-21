import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  isAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const buildProfile = useCallback((u: User): Profile => {
    const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
    return {
      id: u.id,
      email: u.email ?? null,
      display_name: meta.full_name ?? meta.name ?? (u.email ? u.email.split("@")[0] : null),
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
    };
  }, []);

  const fetchRole = useCallback(async () => {
    const { data } = await supabase.rpc("neo_is_admin");
    setIsAdmin(!!data);
  }, []);

  const handleSession = useCallback(
    async (session: Session | null) => {
      if (session?.user) {
        setUser(session.user);
        setProfile(buildProfile(session.user));
        await fetchRole();
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    },
    [buildProfile, fetchRole]
  );

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on setup — no need for separate getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Defer: calling Supabase inside the auth callback can deadlock the client
        setTimeout(() => handleSession(session), 0);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
