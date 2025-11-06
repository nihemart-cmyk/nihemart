"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { processOAuthRedirect } from "@/providers/processOAuthRedirect";
import { Loader } from "lucide-react";

export default function AuthCallback() {
   const router = useRouter();
   const { setUser, setSession, fetchRoles, setRoles } = useAuthStore();
   const [debugInfo, setDebugInfo] = useState<string>("");

   useEffect(() => {
      const handleOAuthCallback = async () => {
         try {
            // Add debug logging
            const urlParams = new URLSearchParams(window.location.search);
            const hasCode = urlParams.has("code");
            const redirectParam = urlParams.get("redirect");

            setDebugInfo(
               `Code: ${hasCode}, Redirect: ${redirectParam || "none"}`
            );
            console.log("Callback debug:", {
               hasCode,
               redirectParam,
               fullUrl: window.location.href,
            });

            // Process the OAuth redirect
            const result = await processOAuthRedirect(supabase, {
               setSession,
               setUser,
               fetchRoles,
               setRoles,
            });

            console.log("OAuth process result:", result);

            if (result?.sessionHandled) {
               // Session was successfully established
               const redirectParam = result.redirectParam;
               const safeRedirect =
                  redirectParam &&
                  redirectParam.startsWith("/") &&
                  !redirectParam.includes("..")
                     ? redirectParam
                     : "/";

               console.log("Redirecting to:", safeRedirect);

               // Use replace to avoid back button issues
               router.replace(safeRedirect);
               return;
            }

            // If session wasn't handled by the helper, do one final check
            console.log("Session not handled, checking current session...");
            const { data } = await supabase.auth.getSession();

            if (data?.session?.user) {
               console.log("Found existing session, redirecting to /");
               router.replace("/");
            } else {
               console.log("No session found, redirecting to signin");
               router.replace("/signin?error=no_session");
            }
         } catch (error) {
            console.error("OAuth callback error:", error);
            setDebugInfo(`Error: ${error}`);

            // Wait a bit before redirecting on error so user can see what happened
            setTimeout(() => {
               router.replace("/signin?error=callback_error");
            }, 2000);
         }
      };

      handleOAuthCallback();
   }, [router, setSession, setUser, fetchRoles, setRoles]);

   return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
         <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md">
            <div className="relative">
               <Loader className="h-8 w-8 animate-spin mx-auto text-brand-orange" />
               <div className="absolute inset-0 animate-pulse opacity-50 blur-sm">
                  <Loader className="h-8 w-8 mx-auto text-brand-orange" />
               </div>
            </div>
            <p className="text-lg text-gray-700 font-medium mt-4">
               Almost there...
            </p>
            {debugInfo && (
               <p className="text-xs text-gray-500 mt-2 font-mono">
                  {debugInfo}
               </p>
            )}
         </div>
      </div>
   );
}
