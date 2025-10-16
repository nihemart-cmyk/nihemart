import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { supabase } from "@/integrations/supabase/client";
import { processOAuthRedirect } from "@/providers/processOAuthRedirect";

// Exported helper to process an OAuth redirect and update client store.
// Extracted for testability.

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
   const { initialize, setUser, setSession, fetchRoles, setRoles } =
      useAuthStore();

   useEffect(() => {
      // Process OAuth redirect first (if any). This ensures that when the
      // page loads after a provider redirect we complete the session
      // handshake immediately and avoid requiring users to click twice or
      // reload.
      const handleRedirectAndInit = async () => {
         try {
            await processOAuthRedirect(supabase, {
               setSession,
               setUser,
               fetchRoles,
               setRoles,
            });
         } catch (e) {
            // ignore - processOAuthRedirect already logs
         }

         // Always initialize local auth state (this is idempotent).
         try {
            await initialize();
         } catch (e) {
            // initialize() handles its own errors already
         }
      };

      // Kick off the combined flow but don't block the render.
      void handleRedirectAndInit();

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
            // Ensure profile row is present via server API
            try {
               const um: any = session.user.user_metadata || {};
               fetch("/api/auth/upsert-profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                     userId: session.user.id,
                     full_name: um.full_name || null,
                     phone: um.phone || null,
                  }),
               }).catch((e) => console.warn("upsert-profile failed:", e));
            } catch (e) {
               // ignore
            }
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
