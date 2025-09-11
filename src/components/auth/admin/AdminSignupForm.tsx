"use client";

import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
   AdminSignupSchema,
   TAdminSignupSchema,
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
import { Mail, Lock, Eye, EyeOff, Loader, LogIn } from "lucide-react";
import { toast } from "sonner";
import { redirect } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AdminSignupFormProps {}

const AdminSignupForm: FC<AdminSignupFormProps> = ({}) => {
   const [showPassword, setShowPassword] = useState<boolean>(false);
   const [googleLoading, setGoogleLoading] = useState(false);
   const { signUp } = useAuth();
   // Google sign-up handler (same as sign-in)
   const handleGoogleSignUp = async () => {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
         provider: "google",
         options: {
            redirectTo:
               typeof window !== "undefined"
                  ? `${window.location.origin}/`
                  : "/",
         },
      });
      setGoogleLoading(false);
      if (error) {
         toast.error(error.message || "Google sign up failed");
      }
   };

   const form = useForm<TAdminSignupSchema>({
      resolver: zodResolver(AdminSignupSchema),
      defaultValues: {
         email: "",
         fullName: "",
         phoneNumber: "",
         password: "",
         confirmPassword: "",
         rememberMe: false,
      },
   });

   const onSubmit = async (formData: TAdminSignupSchema) => {
      if (formData.password !== formData.confirmPassword) {
         toast.error("Passwords do not match");
         return;
      }

      const { error } = await signUp(
         formData.fullName,
         formData.email,
         formData.password,
         formData.phoneNumber
      );

      if (error) {
         toast.error(error);
         return;
      }

      toast.success(
         "Registration successful. Please check your email to confirm."
      );
      redirect("/signin");
   };

   return (
      <Card className="w-full max-w-lg mx-auto shadow-none border-0 mt-7">
         <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
               Welcome To Nihemart !
            </CardTitle>
         </CardHeader>
         <CardContent>
            <Button
               type="button"
               onClick={handleGoogleSignUp}
               className="w-full mb-4 flex items-center justify-center gap-2 border border-gray-300 bg-white text-black hover:bg-gray-50"
               disabled={googleLoading}
            >
               {googleLoading ? (
                  <Loader
                     className="animate-spin"
                     size={18}
                  />
               ) : (
                  <LogIn size={18} />
               )}
               Sign up with Google
            </Button>
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
                     name="fullName"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              Full Name
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    placeholder="John Doe"
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
                     name="phoneNumber"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              Phone Number
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    placeholder="+250784148374"
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

                  <FormField
                     control={form.control}
                     name="confirmPassword"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel className="text-zinc-500">
                              Confirm Password
                           </FormLabel>
                           <FormControl>
                              <div className="relative">
                                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm your password"
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
                        href="#"
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
                     {form.formState.isSubmitting ? "Signing up..." : "Sign Up"}
                  </Button>
                  <Link
                     className="text-sm text-center mt-4 text-orange-600 underline cursor-pointer"
                     href={"/signin"}
                  >
                     Have an account? Sign In
                  </Link>
               </form>
            </Form>
         </CardContent>
      </Card>
   );
};

export default AdminSignupForm;
