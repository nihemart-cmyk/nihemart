import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";
export interface UserRow {
   id: string;
   email: string;
   full_name?: string;
   phone?: string;
   created_at?: string;
   role?: AppRole;
}

export function useUsers() {
   const [users, setUsers] = useState<UserRow[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   // Fetch all users from profiles and merge with emails from admin API
   const fetchUsers = useCallback(async () => {
      setLoading(true);
      setError(null);
      // 1. Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
         .from("profiles")
         .select("id, full_name, phone, created_at");
      if (profilesError) {
         setError(profilesError.message);
         setLoading(false);
         return;
      }
      // 2. Fetch emails from API route
      let emails: { id: string; email: string }[] = [];
      try {
         const res = await fetch("/api/admin/list-users");
         if (res.ok) {
            const json = await res.json();
            emails = json.users;
         }
      } catch (e) {
         // ignore, fallback to empty
      }
      // 3. Merge by id
      const users: UserRow[] = (profiles as any[]).map((u) => {
         const found = emails.find((e) => e.id === u.id);
         return {
            id: u.id,
            email: found?.email || "",
            full_name: u.full_name,
            phone: u.phone,
            created_at: u.created_at,
            role: "user",
         };
      });
      setUsers(users);
      setLoading(false);
   }, []);

   // Update user role
   const updateUserRole = useCallback(
      async (userId: string, role: AppRole) => {
         setLoading(true);
         setError(null);
         // Upsert into user_roles
         const { error } = await supabase
            .from("user_roles")
            .upsert([{ user_id: userId, role }], { onConflict: "user_id" });
         if (error) {
            setError(error.message);
         } else {
            await fetchUsers();
         }
         setLoading(false);
      },
      [fetchUsers]
   );

   // Delete user (soft delete by disabling or hard delete)
   const deleteUser = useCallback(
      async (userId: string) => {
         setLoading(true);
         setError(null);
         // Remove from user_roles and optionally from auth.users (if allowed)
         await supabase.from("user_roles").delete().eq("user_id", userId);
         // Optionally: await supabase.auth.admin.deleteUser(userId);
         await fetchUsers();
         setLoading(false);
      },
      [fetchUsers]
   );

   return {
      users,
      loading,
      error,
      fetchUsers,
      updateUserRole,
      deleteUser,
   };
}
