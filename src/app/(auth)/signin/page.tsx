"use client";

import Image from "next/image";
import { FC, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import logo from "@/assets/logo.png";
import AdminSigninForm from "@/components/auth/admin/AdminSigninForm";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  const router = useRouter();
  const { setUser, setSession, fetchRoles } = useAuthStore();

  useEffect(() => {
    const handle = async () => {
      try {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.has("code");
        const hasAccessToken = url.hash && url.hash.includes("access_token=");
        if (!hasCode && !hasAccessToken) return;

        const result: any =
          typeof (supabase.auth as any).getSessionFromUrl === "function"
            ? await (supabase.auth as any).getSessionFromUrl()
            : typeof (supabase.auth as any)._getSessionFromURL === "function"
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
        const user = session?.user ?? null;
        setSession(session);
        setUser(user);
        if (user) {
          await fetchRoles(user.id);
        }

        // If there's a redirect query param on the signin path, honor it
        const redirect =
          typeof window !== "undefined"
            ? new URL(window.location.href).searchParams.get("redirect")
            : null;
        const safeRedirect =
          redirect && redirect.startsWith("/") ? redirect : null;
        if (safeRedirect) {
          router.push(safeRedirect);
        } else {
          // default to home
          router.push("/");
        }
      } catch (err) {
        console.warn("signin oauth handler failed:", err);
      }
    };

    handle();
  }, [router, setSession, setUser, fetchRoles]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Side (Always Visible) */}
      <div className="w-full lg:flex-[0.5] px-5 sm:px-10 flex items-center justify-center">
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          <div className="w-full relative flex items-center justify-center">
            <div
              className=""
              // style={{
              //   background:
              //     "radial-gradient(circle,rgba(54, 169, 236, 0) 10%, rgba(255, 255, 255, 1) 60%)",
              // }}
            ></div>
            {/* <Image
              src={"/Pattern.png"}
              alt="pattern"
              fill
              className="object-cover"
            /> */}
            <Image
              src={logo}
              alt="logo"
              priority
              height={100}
              width={100}
              className="m-auto"
            />
          </div>
          <AdminSigninForm />
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

export default page;
