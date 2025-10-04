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
import { redirect } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "./google-signin-button";

interface AdminSigninFormProps {}

const AdminSigninForm: FC<AdminSigninFormProps> = ({}) => {
   const [showPassword, setShowPassword] = useState<boolean>(false);
   const [googleLoading, setGoogleLoading] = useState(false);
   const { signIn, hasRole, user, loading } = useAuth();
   const router = useRouter();
   // Google sign-in handler
   const handleGoogleSignIn = async () => {
      try {
         setGoogleLoading(true);
         // Preserve redirect query param so OAuth callback can send the user back
         const redirectParam =
            typeof window !== "undefined"
               ? new URL(window.location.href).searchParams.get("redirect") ||
                 "/"
               : "/";
         const origin =
            typeof window !== "undefined" ? window.location.origin : "";
         // Build a redirectTo that includes the redirect query so after OAuth returns
         // the signin page can pick it up and redirect the user back.
         const redirectTo = `${origin}/signin${
            redirectParam && redirectParam !== "/"
               ? `?redirect=${encodeURIComponent(redirectParam)}`
               : ""
         }`;

         const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
               redirectTo,
            },
         });

         // If supabase returns an error, show it and clear loading. Otherwise the
         // SDK will perform a redirect; we don't need to do anything else here.
         if (error) {
            setGoogleLoading(false);
            toast.error(error.message || "Google sign-in failed");
         }
      } catch (err: any) {
         setGoogleLoading(false);
         toast.error(err?.message || "Google sign-in failed");
      }
   };

   // When the user becomes logged in (either via password sign-in or OAuth redirect),
   // send them to the requested redirect path if present, otherwise fall back to role-based routing.
   useEffect(() => {
      if (loading) return; // wait until auth initialization completes
      if (!user) return;

      // Stop any loading state for the Google button if set
      setGoogleLoading(false);

      // try to use redirect param first
      const redirect =
         typeof window !== "undefined"
            ? new URL(window.location.href).searchParams.get("redirect")
            : null;

      // safety: only allow relative internal redirects
      const safeRedirect = (() => {
         if (!redirect) return null;
         try {
            // If user passed an absolute url matching our origin, strip origin
            const url = new URL(
               redirect,
               typeof window !== "undefined"
                  ? window.location.origin
                  : undefined
            );
            if (
               url.origin ===
               (typeof window !== "undefined"
                  ? window.location.origin
                  : url.origin)
            ) {
               return url.pathname + url.search + url.hash;
            }
            // if redirect does not share origin, reject it
            return null;
         } catch (e) {
            // invalid URL -> if it starts with / treat as internal
            if (redirect.startsWith("/")) return redirect;
            return null;
         }
      })();

      if (safeRedirect) {
         router.push(safeRedirect);
         return;
      }

      // fallback: role-based redirect for admin/rider/regular user
      if (hasRole("admin")) {
         router.push("/admin");
      } else if (hasRole("rider")) {
         router.push("/rider");
      } else {
         router.push("/");
      }
   }, [user, loading, hasRole, router]);

   const form = useForm<TAdminSigninSchema>({
      resolver: zodResolver(AdminSigninSchema),
      defaultValues: {
         email: "",
         password: "",
         rememberMe: false,
      },
   });

   const onSubmit = async (formData: TAdminSigninSchema) => {
      const { email, password } = formData;
      const { error } = await signIn(email, password);
      if (error) {
         toast.error(error);
         return;
      }

      toast.success("Logged in successfully");
      form.reset();

      // If there's a redirect query param, prefer it (safely). Otherwise role-based routing.
      const redirect =
         typeof window !== "undefined"
            ? new URL(window.location.href).searchParams.get("redirect")
            : null;
      const safeRedirect =
         redirect && redirect.startsWith("/") ? redirect : null;
      if (safeRedirect) {
         router.push(safeRedirect);
         return;
      }

      // Redirect based on role
      if (hasRole("admin")) {
         router.push("/admin");
      } else if (hasRole("rider")) {
         router.push("/rider");
      } else {
         router.push("/");
      }
   };

   return (
      <Card className="w-full max-w-md mx-auto shadow-none border-0 lg:mt-7">
         <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Welcome Back <span className="lg:hidden">to Nihemart</span>!</CardTitle>
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
                     {form.formState.isSubmitting ? "Signing In..." : "Sign In"}
                  </Button>
                  <Link
                     className="text-sm text-center mt-4 text-orange-600 underline cursor-pointer"
                     href={"/signup"}
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
