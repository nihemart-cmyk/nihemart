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

            // If helper handled the session already, use the returned redirect
            // parameter (if any) and navigate. The helper already set
            // session/user in the store and fetched roles, so we don't need
            // to re-check the session aggressively here.
            if (result?.sessionHandled) {
               const redirectParam = result.redirectParam;
               const safeRedirect =
                  redirectParam &&
                  redirectParam.startsWith("/") &&
                  !redirectParam.includes("..")
                     ? redirectParam
                     : "/";

               router.replace(safeRedirect);
               return;
            }

            // Fallback: attempt a single explicit session read. If still no
            // session, send user back to signin. Avoid long waits here - the
            // helper should normally handle the session on the callback.
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
               // No redirect param returned by helper, so fall back to root
               router.replace("/");
            } else {
               router.replace("/signin");
            }
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
