"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { processOAuthRedirect } from "@/providers/processOAuthRedirect";
import { Loader } from "lucide-react";

export default function AuthCallback() {
   const router = useRouter();
   const { setUser, setSession, fetchRoles, setRoles } = useAuthStore();

   useEffect(() => {
      const handleOAuthCallback = async () => {
         try {
            // Delegate parsing/processing of the OAuth redirect to the
            // shared helper which will set session/user and fetch roles.
            const result = await processOAuthRedirect(supabase, {
               setSession,
               setUser,
               fetchRoles,
               setRoles,
            });

            // If the helper handled the session, prefer its redirectParam.
            // Otherwise we'll attempt to read the session ourselves.
            let {
               data: { session },
            } = await supabase.auth.getSession();

            // If helper reported sessionHandled but session isn't visible yet,
            // we still fall back to the short auth-state-change wait below.
            const helperRedirect = result?.sessionHandled
               ? result.redirectParam
               : null;

            // If still no session, wait briefly for auth state change (robustness)
            if (!session?.user) {
               try {
                  const waitForSignIn = new Promise<void>((resolve) => {
                     const { data } = supabase.auth.onAuthStateChange(
                        (event, newSession) => {
                           if (event === "SIGNED_IN" && newSession?.user) {
                              try {
                                 session = newSession as any;
                              } catch (e) {
                                 // ignore
                              }
                              resolve();
                           }
                        }
                     );

                     const to = setTimeout(() => resolve(), 3000);
                     waitForSignIn.finally(() => {
                        try {
                           data.subscription?.unsubscribe();
                        } catch (e) {
                           // ignore
                        }
                        clearTimeout(to);
                     });
                  });

                  await waitForSignIn;
                  const got = await supabase.auth.getSession();
                  session = got.data.session;
               } catch (e) {
                  console.warn("Auth state wait failed:", e);
               }
            }

            if (!session?.user) {
               router.replace("/signin");
               return;
            }

            // Step 3: Determine redirect target. Prefer the helper's value
            // (it preserved/returned the redirect param), otherwise read
            // current URL search params.
            const redirectParam =
               helperRedirect ??
               new URLSearchParams(window.location.search).get("redirect");

            const safeRedirect =
               redirectParam &&
               redirectParam.startsWith("/") &&
               !redirectParam.includes("..")
                  ? redirectParam
                  : "/";

            // Step 4: Immediate redirect using replace to prevent back navigation
            router.replace(safeRedirect);
         } catch (error) {
            console.error("OAuth callback error:", error);
            router.replace("/signin?error=callback_error");
         }
      };

      handleOAuthCallback();
   }, [router, setSession, setUser, fetchRoles]);

   return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
         <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <div className="relative">
               <Loader className="h-8 w-8 animate-spin mx-auto text-brand-orange" />
               <div className="absolute inset-0 animate-pulse opacity-50 blur-sm">
                  <Loader className="h-8 w-8 mx-auto text-brand-orange" />
               </div>
            </div>
            <p className="text-lg text-gray-700 font-medium mt-4">
               Almost there...
            </p>
         </div>
      </div>
   );
}
