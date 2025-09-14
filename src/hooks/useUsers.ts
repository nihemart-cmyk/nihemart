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
   orderCount?: number;
   totalSpend?: number;
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
      // 2. Fetch enriched users from API route (order aggregates + email + role)
      let enriched: any[] = [];
      try {
         const res = await fetch("/api/admin/list-users");
         if (res.ok) {
            const json = await res.json();
            enriched = json.users || [];
         }
      } catch (e) {
         // ignore, fallback to profiles only
      }

      // 3. Merge by id to produce UserRow[] with aggregates
      const users: UserRow[] = (profiles as any[]).map((u) => {
         const found = enriched.find((e: any) => e.id === u.id) || {};
         return {
            id: u.id,
            email: found.email || "",
            full_name: u.full_name,
            phone: u.phone,
            created_at: u.created_at,
            role: (found.role as AppRole) || "user",
            orderCount: Number(found.order_count || 0),
            totalSpend: Number(found.total_spend || 0),
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
         try {
            const res = await fetch("/api/admin/update-user-role", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ userId, role }),
            });
            if (!res.ok) {
               const json = await res.json();
               throw new Error(json.error || "Failed to update role");
            }
            await fetchUsers();
         } catch (err: any) {
            setError(err.message || "Failed to update role");
         } finally {
            setLoading(false);
         }
      },
      [fetchUsers]
   );

   // Delete user (soft delete by disabling or hard delete)
   const deleteUser = useCallback(
      async (userId: string, hardDelete = false) => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetch("/api/admin/delete-user", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ userId, hardDelete }),
            });
            if (!res.ok) {
               const json = await res.json();
               throw new Error(json.error || "Failed to delete user");
            }
            await fetchUsers();
         } catch (err: any) {
            setError(err.message || "Failed to delete user");
         } finally {
            setLoading(false);
         }
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
