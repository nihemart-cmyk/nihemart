export async function processOAuthRedirect(
   supabaseClient: any,
   opts: {
      setSession: (s: any) => void;
      setUser: (u: any) => void;
      fetchRoles: (id: string) => Promise<void>;
      setRoles: (r: Set<any>) => void;
   }
) {
   const { setSession, setUser, fetchRoles, setRoles } = opts;
   try {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const hasCode = url.searchParams.has("code");
      const hasAccessToken = url.hash && url.hash.includes("access_token=");
      if (!hasCode && !hasAccessToken) return;

      // Try SDK helper first
      let session: any = null;
      let user: any = null;

      try {
         const result: any =
            typeof (supabaseClient.auth as any).getSessionFromUrl === "function"
               ? await (supabaseClient.auth as any).getSessionFromUrl()
               : typeof (supabaseClient.auth as any)._getSessionFromURL ===
                 "function"
               ? await (supabaseClient.auth as any)._getSessionFromURL(
                    window.location.href
                 )
               : null;
         const { data, error } = result || {};
         if (error) {
            console.warn("getSessionFromUrl error:", error);
         } else if (data?.session) {
            session = data.session;
            user = session.user;
         }
      } catch (err) {
         console.warn("getSessionFromUrl threw:", err);
      }

      if (!session) {
         try {
            const { data } = await supabaseClient.auth.getSession();
            if (data?.session) {
               session = data.session;
               user = session.user;
            }
         } catch (err) {
            console.warn("getSession fallback failed:", err);
         }
      }

      if (!session) return;

      setSession(session);
      setUser(user);
      if (user) {
         await fetchRoles(user.id);
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
            // ignore
         }
      }

      try {
         url.searchParams.delete("code");
         url.searchParams.delete("state");
         window.history.replaceState(
            {},
            document.title,
            url.pathname + url.search
         );
      } catch (e) {
         // ignore
      }
   } catch (err) {
      console.error("OAuth redirect handling failed:", err);
   }
}
