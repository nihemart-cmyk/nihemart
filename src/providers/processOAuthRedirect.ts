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
      const code = url.searchParams.get("code");
      const hasAccessToken = url.hash && url.hash.includes("access_token=");
      
      console.log("🔍 OAuth callback check:", { 
         hasCode: !!code, 
         hasAccessToken, 
         fullUrl: window.location.href 
      });
      
      if (!code && !hasAccessToken) {
         console.log("❌ No OAuth code or access token found");
         return { sessionHandled: false };
      }

      // Extract redirect param from URL OR localStorage
      let redirectParam = url.searchParams.get("redirect");
      
      if (!redirectParam) {
         try {
            const stored = localStorage.getItem("oauth_redirect");
            if (stored) {
               redirectParam = stored;
               console.log("📦 Retrieved redirect from localStorage:", redirectParam);
            }
         } catch (e) {
            console.warn("⚠️ Could not read from localStorage:", e);
         }
      } else {
         console.log("🔗 Found redirect in URL params:", redirectParam);
      }

      let session: any = null;
      let user: any = null;

      // PRIORITY 1: Handle PKCE code-based flow (modern approach)
      if (code) {
         console.log("🔐 Attempting PKCE code exchange...");
         
         try {
            // Use exchangeCodeForSession for PKCE flow
            const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
            
            if (error) {
               console.error("❌ exchangeCodeForSession error:", error);
               throw error;
            }
            
            if (data?.session) {
               session = data.session;
               user = session.user;
               console.log("✅ Session established via PKCE code exchange");
            }
         } catch (err: any) {
            console.error("❌ PKCE code exchange failed:", err);
            
            // If exchangeCodeForSession doesn't exist, try getSession as fallback
            if (err.message?.includes("exchangeCodeForSession") || err.message?.includes("not a function")) {
               console.log("⚠️ exchangeCodeForSession not available, trying getSession fallback...");
               
               try {
                  // Wait a moment for session to be set by auth state change
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  const { data } = await supabaseClient.auth.getSession();
                  if (data?.session) {
                     session = data.session;
                     user = session.user;
                     console.log("✅ Session retrieved via getSession fallback");
                  }
               } catch (fallbackErr) {
                  console.error("❌ getSession fallback also failed:", fallbackErr);
               }
            }
         }
      }
      
      // PRIORITY 2: Handle implicit/hash-based flow (legacy)
      if (!session && hasAccessToken) {
         console.log("🔐 Attempting hash-based session retrieval...");
         
         try {
            const result: any =
               typeof (supabaseClient.auth as any).getSessionFromUrl === "function"
                  ? await (supabaseClient.auth as any).getSessionFromUrl()
                  : typeof (supabaseClient.auth as any)._getSessionFromURL === "function"
                  ? await (supabaseClient.auth as any)._getSessionFromURL(window.location.href)
                  : null;
            
            const { data, error } = result || {};
            if (error) {
               console.warn("⚠️ getSessionFromUrl error:", error);
            } else if (data?.session) {
               session = data.session;
               user = session.user;
               console.log("✅ Session retrieved via hash-based flow");
            }
         } catch (err) {
            console.warn("⚠️ Hash-based retrieval threw:", err);
         }
      }

      // PRIORITY 3: Final fallback - check if session already exists
      if (!session) {
         console.log("🔍 Checking for existing session...");
         
         try {
            const { data } = await supabaseClient.auth.getSession();
            if (data?.session) {
               session = data.session;
               user = session.user;
               console.log("✅ Found existing session");
            }
         } catch (err) {
            console.warn("⚠️ getSession check failed:", err);
         }
      }

      if (!session || !user) {
         console.error("❌ No session could be established after all attempts");
         return { sessionHandled: false };
      }

      console.log("✅ Session established successfully, updating store...");

      // Update auth store
      setSession(session);
      setUser(user);
      
      // Fetch user roles
      try {
         console.log("👥 Fetching user roles...");
         await fetchRoles(user.id);
         console.log("✅ Roles fetched successfully");
      } catch (err) {
         console.warn("⚠️ Failed to fetch roles:", err);
         setRoles(new Set());
      }

      // Upsert profile
      try {
         console.log("👤 Upserting user profile...");
         const um: any = user.user_metadata || {};
         await fetch("/api/auth/upsert-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               userId: user.id,
               full_name: um.full_name || null,
               phone: um.phone || null,
            }),
         });
         console.log("✅ Profile upserted successfully");
      } catch (e) {
         console.warn("⚠️ Profile upsert error:", e);
      }

      // Clean up URL and localStorage
      try {
         url.searchParams.delete("code");
         url.searchParams.delete("state");

         window.history.replaceState(
            {},
            document.title,
            url.pathname + url.search
         );

         // Clean up localStorage
         try {
            localStorage.removeItem("oauth_redirect");
            console.log("🧹 Cleaned up localStorage redirect");
         } catch (e) {
            console.warn("⚠️ Could not clear localStorage:", e);
         }

         console.log("✅ OAuth process complete! Redirect param:", redirectParam);
         return { sessionHandled: true, redirectParam: redirectParam };
      } catch (e) {
         console.warn("⚠️ URL cleanup error:", e);
         return { sessionHandled: true, redirectParam: redirectParam };
      }
   } catch (err) {
      console.error("❌ OAuth redirect handling failed:", err);
   }
   
   return { sessionHandled: false };
}