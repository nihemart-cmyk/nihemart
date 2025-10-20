"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          router.push("/signin?error=Authentication failed");
          return;
        }

        if (session) {
          // Get redirect parameter from URL
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect');
          
          const safeRedirect = redirect && redirect.startsWith('/') 
            ? redirect 
            : "/";
            
          router.push(safeRedirect);
        } else {
          router.push("/signin");
        }
      } catch (error) {
        console.error("Callback error:", error);
        router.push("/signin?error=Authentication failed");
      }
    };

    handleOAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}