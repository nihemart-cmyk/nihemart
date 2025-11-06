export async function processOAuthRedirect(
   supabaseClient: any,
   opts: {
      setSession: (s: any) => void;
      setUser: (u: any) => void;
      fetchRoles: (id: string) => Promise<void>;
      setRoles: (r: Set<any>) => void;
   }
): Promise<{ sessionHandled: boolean; redirectParam?: string | null }> {
   const { setSession, setUser, fetchRoles, setRoles } = opts;
   
   try {
      if (typeof window === "undefined") return { sessionHandled: false };
      
      const url = new URL(window.location.href);
      const hasCode = url.searchParams.has("code");
      const hasAccessToken = url.hash && url.hash.includes("access_token=");
      
      console.log("OAuth callback check:", { hasCode, hasAccessToken, fullUrl: window.location.href });
      
      if (!hasCode && !hasAccessToken) {
         console.log("No OAuth code or access token found");
         return { sessionHandled: false };
      }

      // Extract redirect param from URL OR localStorage
      let redirectParam = url.searchParams.get("redirect");
      
      // Fallback: Check localStorage if not in URL (OAuth may have stripped it)
      if (!redirectParam) {
         try {
            const stored = localStorage.getItem("oauth_redirect");
            if (stored) {
               redirectParam = stored;
               console.log("Retrieved redirect from localStorage:", redirectParam);
            }
         } catch (e) {
            console.warn("Could not read from localStorage:", e);
         }
      } else {
         console.log("Found redirect in URL params:", redirectParam);
      }

      let session: any = null;
      let user: any = null;

      // Modern approach: Use exchangeCodeForSession for code-based flow
      if (hasCode) {
         try {
            const code = url.searchParams.get("code");
            console.log("Attempting to exchange code for session...");
            
            const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code!);
            
            if (error) {
               console.error("exchangeCodeForSession error:", error);
            } else if (data?.session) {
               session = data.session;
               user = session.user;
               console.log("Session exchanged successfully via code");
            }
         } catch (err) {
            console.error("exchangeCodeForSession threw:", err);
         }
      }

      // Fallback for hash-based flow (older OAuth or implicit flow)
      if (!session && hasAccessToken) {
         try {
            console.log("Attempting hash-based session retrieval...");
            
            // Try the deprecated methods as fallback
            const result: any =
               typeof (supabaseClient.auth as any).getSessionFromUrl === "function"
                  ? await (supabaseClient.auth as any).getSessionFromUrl()
                  : typeof (supabaseClient.auth as any)._getSessionFromURL === "function"
                  ? await (supabaseClient.auth as any)._getSessionFromURL(window.location.href)
                  : null;
            
            const { data, error } = result || {};
            if (error) {
               console.warn("getSessionFromUrl error:", error);
            } else if (data?.session) {
               session = data.session;
               user = session.user;
               console.log("Session retrieved via hash-based flow");
            }
         } catch (err) {
            console.warn("Hash-based session retrieval threw:", err);
         }
      }

      // Final fallback: Check current session
      if (!session) {
         try {
            console.log("Attempting to get current session as fallback...");
            const { data } = await supabaseClient.auth.getSession();
            if (data?.session) {
               session = data.session;
               user = session.user;
               console.log("Found existing session");
            }
         } catch (err) {
            console.warn("getSession fallback failed:", err);
         }
      }

      if (!session) {
         console.warn("No session could be established");
         return { sessionHandled: false };
      }

      console.log("Session established successfully, updating store...");

      // Update auth store
      setSession(session);
      setUser(user);
      
      if (user) {
         // Fetch user roles
         try {
            await fetchRoles(user.id);
            console.log("Roles fetched successfully");
         } catch (err) {
            console.warn("Failed to fetch roles:", err);
         }

         // Upsert profile
         try {
            const um: any = user.user_metadata || {};
            fetch("/api/auth/upsert-profile", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  userId: user.id,
                  full_name: um.full_name || null,
                  phone: um.phone || null,
               }),
            }).catch((e) => console.warn("upsert-profile failed:", e));
         } catch (e) {
            console.warn("Profile upsert error:", e);
         }
      }

      // Clean up URL and localStorage
      try {
         url.searchParams.delete("code");
         url.searchParams.delete("state");

         // Clean URL without reload
         window.history.replaceState(
            {},
            document.title,
            url.pathname + url.search
         );

         // Clean up localStorage redirect
         try {
            localStorage.removeItem("oauth_redirect");
            console.log("Cleaned up localStorage redirect");
         } catch (e) {
            console.warn("Could not clear localStorage:", e);
         }

         console.log("Session handled successfully, redirect param:", redirectParam);
         return { sessionHandled: true, redirectParam: redirectParam };
      } catch (e) {
         console.warn("URL cleanup error:", e);
         return { sessionHandled: true, redirectParam: redirectParam };
      }
   } catch (err) {
      console.error("OAuth redirect handling failed:", err);
   }
   
   return { sessionHandled: false };
}