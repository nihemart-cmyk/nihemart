"use client";

import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
   AdminSigninSchema,
   TAdminSigninSchema,
} from "@/lib/validators/admin-auth";
import { Button } from "@/components/ui/button";
import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "./google-signin-button";

interface AdminSigninFormProps {
   redirect?: string | null;
}

const AdminSigninForm: FC<AdminSigninFormProps> = ({ redirect }) => {
   const [showPassword, setShowPassword] = useState<boolean>(false);
   const [googleLoading, setGoogleLoading] = useState(false);
   const { signIn, hasRole, user, loading } = useAuth();
   const router = useRouter();
   // Use the prop if provided, otherwise derive from window.location in effect
   const [redirectParamState, setRedirectParamState] = useState<string | null>(
      null
   );

   const redirectParam = redirect ?? redirectParamState;

   // Read redirect param on mount (client-only)
   useEffect(() => {
      try {
         const params = new URLSearchParams(window.location.search);
         setRedirectParamState(params.get("redirect") ?? null);
      } catch (err) {
         setRedirectParamState(null);
      }
   }, []);

   // Google sign-in handler - FIXED
   const handleGoogleSignIn = async () => {
      try {
         setGoogleLoading(true);

         // Build redirect URL that preserves the redirect parameter
         const origin =
            typeof window !== "undefined" ? window.location.origin : "";
         let redirectTo = `${origin}/auth/callback`;

         // Add redirect parameter if it exists
         if (redirectParam) {
            redirectTo += `?redirect=${encodeURIComponent(redirectParam)}`;
         }

         const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
               redirectTo,
               queryParams: {
                  // This ensures the redirect parameter is passed through the OAuth flow
                  access_type: "offline",
                  prompt: "consent",
               },
            },
         });

         if (error) {
            setGoogleLoading(false);
            toast.error(error.message || "Google sign-in failed");
         }
         // If successful, the browser will redirect - no need to handle further
      } catch (err: any) {
         setGoogleLoading(false);
         toast.error(err?.message || "Google sign-in failed");
      }
   };

   // SIMPLIFIED redirect logic - only handle OAuth callbacks here
   useEffect(() => {
      // Only handle OAuth redirect scenarios
      const handleOAuthRedirect = async () => {
         try {
            const url = new URL(window.location.href);
            const hasCode = url.searchParams.has("code");
            const hasAccessToken =
               url.hash && url.hash.includes("access_token=");

            if (!hasCode && !hasAccessToken) return;

            // Process OAuth callback
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
               console.warn("OAuth callback error:", error);
               toast.error("Authentication failed");
               return;
            }

            if (data?.session) {
               toast.success("Signed in successfully!");

               // Get redirect parameter from URL (for OAuth flow)
               const oauthRedirect = url.searchParams.get("redirect");
               const safeRedirect =
                  oauthRedirect && oauthRedirect.startsWith("/")
                     ? oauthRedirect
                     : redirectParam && redirectParam.startsWith("/")
                     ? redirectParam
                     : null;

               if (safeRedirect) {
                  router.push(safeRedirect);
               } else {
                  // Fallback to role-based routing
                  if (hasRole("admin")) {
                     router.push("/admin");
                  } else if (hasRole("rider")) {
                     router.push("/rider");
                  } else {
                     router.push("/");
                  }
               }
            }
         } catch (err) {
            console.warn("OAuth handler failed:", err);
            toast.error("Authentication failed");
         }
      };

      handleOAuthRedirect();
   }, [router, hasRole, redirectParam]);

   const form = useForm<TAdminSigninSchema>({
      resolver: zodResolver(AdminSigninSchema),
      defaultValues: {
         email: "",
         password: "",
         rememberMe: false,
      },
   });

   const onSubmit = async (formData: TAdminSigninSchema) => {
      try {
         const { email, password } = formData;
         const { error } = await signIn(email, password);

         if (error) {
            toast.error(error);
            return;
         }

         toast.success("Logged in successfully");
         form.reset();

         // Use redirect parameter if available and safe
         const safeRedirect =
            redirectParam && redirectParam.startsWith("/")
               ? redirectParam
               : null;

         if (safeRedirect) {
            router.push(safeRedirect);
         } else {
            // Fallback to role-based routing
            if (hasRole("admin")) {
               router.push("/admin");
            } else if (hasRole("rider")) {
               router.push("/rider");
            } else {
               router.push("/");
            }
         }
      } catch (error: any) {
         toast.error(error?.message || "Sign in failed");
      }
   };

   return (
      <Card className="w-full max-w-md mx-auto shadow-none border-0 lg:mt-7">
         <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
               Welcome Back <span className="lg:hidden">to Nihemart</span>!
            </CardTitle>
         </CardHeader>
         <CardContent>
            <GoogleSignInButton
               onClick={handleGoogleSignIn}
               loading={googleLoading}
               variant="signin"
            />
            <div className="relative my-4">
               <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
               </div>
               <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">or</span>
               </div>
            </div>
            <Form {...form}>
               <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
               >
                  <FormField
                     control={form.control}
                     name="email"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              Email
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    placeholder="admin@nihemart.com"
                                    {...field}
                                    className="pl-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                                 />
                              </div>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <FormField
                     control={form.control}
                     name="password"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              Password
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    {...field}
                                    className="pl-10 pr-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                                 />
                                 <button
                                    type="button"
                                    onClick={() =>
                                       setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    aria-label={
                                       showPassword
                                          ? "Hide password"
                                          : "Show password"
                                    }
                                 >
                                    {showPassword ? (
                                       <EyeOff className="h-5 w-5 text-gray-400" />
                                    ) : (
                                       <Eye className="h-5 w-5 text-gray-400" />
                                    )}
                                 </button>
                              </div>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <div className="flex items-center justify-between">
                     <FormField
                        control={form.control}
                        name="rememberMe"
                        render={({ field }) => (
                           <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                 <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                 />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                 <FormLabel className="text-zinc-500">
                                    Remember me
                                 </FormLabel>
                              </div>
                           </FormItem>
                        )}
                     />
                     <Link
                        href="/forgot-password"
                        className="text-sm text-blue-500 hover:underline"
                     >
                        Forgot Password?
                     </Link>
                  </div>

                  <Button
                     type="submit"
                     className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
                     size="lg"
                     disabled={form.formState.isSubmitting}
                  >
                     {form.formState.isSubmitting ? (
                        <>
                           <Loader className="mr-2 h-4 w-4 animate-spin" />
                           Signing In...
                        </>
                     ) : (
                        "Sign In"
                     )}
                  </Button>
                  <Link
                     className="text-sm text-center mt-4 text-orange-600 underline cursor-pointer block "
                     href={
                        redirectParam
                           ? `/signup?redirect=${encodeURIComponent(
                                redirectParam
                             )}`
                           : "/signup"
                     }
                  >
                     Don&apos;t have an account? Sign up
                  </Link>
               </form>
            </Form>
         </CardContent>
      </Card>
   );
};

export default AdminSigninForm;
