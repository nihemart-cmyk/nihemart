import { useAuthStore } from "@/store/auth.store";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
   const {
      user,
      session,
      roles,
      loading,
      setUser,
      setSession,
      setLoading,
      fetchRoles,
      signIn,
      signUp,
      signOut,
      hasRole,
   } = useAuthStore();

   // Listen to auth state changes and fetch roles
   useEffect(() => {
      setLoading(true);
      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((event, newSession) => {
         setSession(newSession);
         setUser(newSession?.user ?? null);
         if (newSession?.user) fetchRoles(newSession.user.id);
         else useAuthStore.setState({ roles: new Set() });
      });

      supabase.auth.getSession().then(({ data }) => {
         setSession(data.session);
         setUser(data.session?.user ?? null);
         if (data.session?.user) fetchRoles(data.session.user.id);
         setLoading(false);
      });

      return () => subscription.unsubscribe();
      // eslint-disable-next-line
   }, []);

   console.log("Auth State:", { user, session, isLoggedIn: !!user });

   return {
      user,
      session,
      roles,
      loading,
      signIn,
      signUp,
      signOut,
      hasRole,
      isLoggedIn: !!user,
   };
}
