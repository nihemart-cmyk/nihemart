"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import { Loader } from "lucide-react";

export default function AuthCallback() {
   const router = useRouter();
   const { setUser, setSession, fetchRoles } = useAuthStore();

   useEffect(() => {
      const handleOAuthCallback = async () => {
         try {
            // Step 1: Get session and update state atomically
            const {
               data: { session },
               error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
               console.error("Session error:", sessionError);
               router.replace("/signin?error=session_error");
               return;
            }

            if (!session?.user) {
               router.replace("/signin");
               return;
            }

            // Step 2: Update auth store and fetch roles in parallel
            await Promise.all([
               (async () => {
                  setSession(session);
                  setUser(session.user);
               })(),
               fetchRoles(session.user.id).catch((error) => {
                  console.warn("Role fetch error:", error);
               }),
            ]);

            // Step 3: Get and validate redirect URL
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get("redirect");

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
