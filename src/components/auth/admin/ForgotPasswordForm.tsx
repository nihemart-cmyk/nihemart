"use client";

import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const ForgotSchema = z.object({
   email: z.string().email(),
});

type TForgot = z.infer<typeof ForgotSchema>;

const ForgotPasswordForm: FC = () => {
   const form = useForm<TForgot>({
      resolver: zodResolver(ForgotSchema),
      defaultValues: { email: "" },
   });

   const onSubmit = async (data: TForgot) => {
      try {
         const redirectTo =
            typeof window !== "undefined"
               ? `${window.location.origin}/reset-password`
               : "/reset-password";

         const { error } = await supabase.auth.resetPasswordForEmail(
            data.email,
            {
               redirectTo,
            }
         );

         if (error) {
            toast.error(error.message || "Failed to send reset email");
            return;
         }

         toast.success("Password reset email sent. Check your inbox.");
         form.reset();
      } catch (err) {
         console.error(err);
         toast.error("An unexpected error occurred");
      }
   };

   return (
      <div className="w-full max-w-md mx-auto">
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
                        <FormLabel className="text-zinc-500">Email</FormLabel>
                        <FormControl>
                           <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                 placeholder="you@company.com"
                                 {...field}
                                 className="pl-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                              />
                           </div>
                        </FormControl>
                        <FormMessage />
                     </FormItem>
                  )}
               />

               <Button
                  type="submit"
                  className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
                  size="lg"
                  disabled={form.formState.isSubmitting}
               >
                  {form.formState.isSubmitting
                     ? "Sending..."
                     : "Send reset email"}
               </Button>
            </form>
         </Form>
      </div>
   );
};

export default ForgotPasswordForm;
