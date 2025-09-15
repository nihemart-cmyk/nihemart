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
         // Update session and user immediately
         setSession(session);
         setUser(session?.user ?? null);

         // Only fetch roles when we have a user
         if (session?.user) {
            // fetchRoles is guarded internally to dedupe concurrent calls
            await fetchRoles(session.user.id);
         } else {
            setRoles(new Set());
         }
      });

      return () => {
         try {
            subscription?.unsubscribe();
         } catch (e) {
            // ignore unsubscribe errors
         }
      };
   }, [initialize, setUser, setSession, fetchRoles, setRoles]);

   return <>{children}</>;
};
