import { supabase } from "@/integrations/supabase/client";

export async function syncUserRole(userId: string) {
   try {
      // Get role from user_roles table
      const { data, error } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", userId)
         .maybeSingle();

      if (error || !data?.role) return;

      // Update user_metadata.role if needed
      const { error: updateError } = await supabase.auth.updateUser({
         data: { role: data.role },
      });

      if (updateError) {
         console.error("Error updating user metadata:", updateError);
      }
   } catch (error) {
      console.error("Error syncing user role:", error);
   }
}
