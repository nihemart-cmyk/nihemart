import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { supabase } from "@/integrations/supabase/client";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
   const { initialize, setUser, setSession, fetchRoles, setRoles } =
      useAuthStore();

   useEffect(() => {
      // Initialize auth state
      initialize();

      // Listen to auth state changes
      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
         setSession(session);
         setUser(session?.user ?? null);

         if (session?.user) {
            await fetchRoles(session.user.id);
         } else {
            setRoles(new Set());
         }
      });

      return () => subscription.unsubscribe();
   }, [initialize, setUser, setSession, fetchRoles, setRoles]);

   return <>{children}</>;
};
