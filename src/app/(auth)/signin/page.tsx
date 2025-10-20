"use client";

import Image from "next/image";
import { FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import logo from "@/assets/logo.png";
import AdminSigninForm from "@/components/auth/admin/AdminSigninForm";

interface pageProps {}

const Page: FC<pageProps> = ({}) => {
   const router = useRouter();
   const [redirect, setRedirect] = useState<string | null>(null);

   // read search params on client mount to avoid useSearchParams SSR bailouts
   useEffect(() => {
      try {
         const params = new URLSearchParams(window.location.search);
         setRedirect(params.get("redirect") ?? null);
      } catch (err) {
         setRedirect(null);
      }
   }, []);
   const { setUser, setSession, fetchRoles, user } = useAuthStore();

   useEffect(() => {
      const handleAuthRedirect = async () => {
         try {
            // If user is already logged in, redirect them
            if (user) {
               const safeRedirect =
                  redirect && redirect.startsWith("/") ? redirect : "/";
               router.push(safeRedirect);
               return;
            }

            // Handle OAuth callback
            const url = new URL(window.location.href);
            const hasCode = url.searchParams.has("code");
            const hasAccessToken =
               url.hash && url.hash.includes("access_token=");

            if (!hasCode && !hasAccessToken) return;

            const result: any =
               typeof (supabase.auth as any).getSessionFromUrl === "function"
                  ? await (supabase.auth as any).getSessionFromUrl()
                  : typeof (supabase.auth as any)._getSessionFromURL ===
                    "function"
                  ? await (supabase.auth as any)._getSessionFromURL(
                       window.location.href
                    )
                  : null;

            const { data, error } = result || {};
            if (error) {
               console.warn("signin page getSessionFromUrl error:", error);
               return;
            }

            const session = data?.session ?? null;
            const sessionUser = session?.user ?? null;
            setSession(session);
            setUser(sessionUser);

            if (sessionUser) {
               await fetchRoles(sessionUser.id);

               // Redirect after successful OAuth signin
               const safeRedirect =
                  redirect && redirect.startsWith("/") ? redirect : "/";
               router.push(safeRedirect);
            }
         } catch (err) {
            console.warn("signin oauth handler failed:", err);
         }
      };

      handleAuthRedirect();
   }, [router, setSession, setUser, fetchRoles, user, redirect]);

   return (
      <div className="flex min-h-screen flex-col lg:flex-row">
         {/* Left Side (Always Visible) */}
         <div className="w-full lg:flex-[0.5] px-5 sm:px-10 flex items-center justify-center">
            <div className="w-full max-w-md sm:max-w-lg mx-auto">
               <div className="w-full relative flex items-center justify-center">
                  <Image
                     src={logo}
                     alt="logo"
                     priority
                     height={100}
                     width={100}
                     className="m-auto"
                  />
               </div>
               <AdminSigninForm redirect={redirect} />
            </div>
         </div>

         {/* Right Side (Hidden on Mobile/Tablet) */}
         <div className="hidden lg:flex h-screen sticky top-0 p-1 flex-[0.5]">
            <div
               className="w-full h-full bg-brand-orange rounded-3xl flex flex-col justify-end overflow-hidden"
               style={{ backgroundImage: "url(/bg-Illustration1.png)" }}
            >
               <h2 className="px-5 py-4 text-white text-5xl lg:text-7xl font-bold text-center">
                  Nihemart
               </h2>
               <Image
                  src={"/auth-page-girl.png"}
                  alt="auth page girl"
                  width={1000}
                  height={1200}
                  className="w-full h-auto object-contain"
               />
            </div>
         </div>
      </div>
   );
};

export default Page;
