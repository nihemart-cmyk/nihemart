import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { supabase } from "@/integrations/supabase/client";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
   const { initialize, setUser, setSession, fetchRoles, setRoles } =
      useAuthStore();

   useEffect(() => {
      // Initialize auth state
      initialize();

      // If the page was loaded after an OAuth redirect, Supabase will include
      // an authorization code or access_token in the URL. We should parse the
      // URL to complete the session handshake immediately so the user is
      // authenticated without having to click again.
      const handleOAuthRedirect = async () => {
         try {
            if (typeof window === "undefined") return;
            const url = new URL(window.location.href);
            const hasCode = url.searchParams.has("code");
            const hasAccessToken =
               url.hash && url.hash.includes("access_token=");
            if (!hasCode && !hasAccessToken) return;

            // Use Supabase helper to parse session from URL. Newer SDKs expose
            // getSessionFromUrl which returns the session and provider info.
            try {
               // supabase.auth.getSessionFromUrl will also update internal client
               // session state and set cookies when needed. Use `any` cast to
               // avoid TypeScript type mismatch if the helper isn't in the types.
               const result: any =
                  typeof (supabase.auth as any).getSessionFromUrl === "function"
                     ? await (supabase.auth as any).getSessionFromUrl()
                     : // Fallback: try the internal _getSessionFromURL if present
                     typeof (supabase.auth as any)._getSessionFromURL ===
                       "function"
                     ? await (supabase.auth as any)._getSessionFromURL(
                          window.location.href
                       )
                     : null;
               const { data, error } = result || {};
               if (error) {
                  console.warn("getSessionFromUrl error:", error);
                  return;
               }
               const session = data?.session ?? null;
               const user = session?.user ?? null;
               setSession(session);
               setUser(user);
               if (user) {
                  await fetchRoles(user.id);
               }

               // Clean the URL to remove code/hash to avoid re-processing on reload
               try {
                  url.searchParams.delete("code");
                  // remove typical oauth state params
                  url.searchParams.delete("state");
                  // remove fragment
                  window.history.replaceState(
                     {},
                     document.title,
                     url.pathname + url.search
                  );
               } catch (e) {
                  // ignore
               }
            } catch (err) {
               console.warn("Error finishing OAuth redirect:", err);
            }
         } catch (err) {
            console.error("OAuth redirect handling failed:", err);
         }
      };

      handleOAuthRedirect();

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
